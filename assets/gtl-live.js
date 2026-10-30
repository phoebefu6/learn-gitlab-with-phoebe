/* gtl-live.js - the pipeline DAG bench for learn-gitlab-with-phoebe.
   Computed for real in the browser: a YAML parser for the taught subset of .gitlab-ci.yml,
   include and extends resolution, workflow and job rules against a pipeline context, the DAG
   (stage order plus needs), cycle and missing-needs detection, a critical-path schedule with
   unlimited runners and a list schedule under a runner cap, and the Free-tier compute-minutes
   scorecard. Penwood is CONSTRUCTED; durations come from a constructed run log.
   The same file runs under node (materials/run_ladder_node.js) and is matched by value by
   materials/gtl_reference.py. Semantics follow the GitLab CI/CD YAML reference as read on
   2026-10-29; two engine conventions are labelled ENGINE RULE below. */
(function (root) {
  "use strict";

  // ------------------------------------------------------------------ YAML (taught subset)
  function stripComment(line) {
    var inS = false, inD = false;
    for (var i = 0; i < line.length; i++) {
      var c = line[i];
      if (c === "'" && !inD) inS = !inS;
      else if (c === '"' && !inS) inD = !inD;
      else if (c === "#" && !inS && !inD && (i === 0 || /\s/.test(line[i - 1]))) return line.slice(0, i);
    }
    return line;
  }
  function splitFlow(body) {
    var items = [], cur = "", inS = false, inD = false;
    for (var i = 0; i < body.length; i++) {
      var c = body[i];
      if (c === "'" && !inD) inS = !inS;
      else if (c === '"' && !inS) inD = !inD;
      if (c === "," && !inS && !inD) { items.push(cur); cur = ""; } else cur += c;
    }
    if (cur.trim() !== "" || items.length) items.push(cur);
    return items.map(function (x) { return x.trim(); }).filter(function (x) { return x !== ""; });
  }
  function scalar(s) {
    s = s.trim();
    if (s === "" || s === "~" || s === "null") return null;
    if (s[0] === "'" && s[s.length - 1] === "'" && s.length >= 2) return s.slice(1, -1).replace(/''/g, "'");
    if (s[0] === '"' && s[s.length - 1] === '"' && s.length >= 2) return s.slice(1, -1).replace(/\\"/g, '"');
    if (s[0] === "[" && s[s.length - 1] === "]") return splitFlow(s.slice(1, -1)).map(scalar);
    if (s === "true") return true;
    if (s === "false") return false;
    if (/^-?\d+$/.test(s)) return parseInt(s, 10);
    return s;
  }
  var MAPLINE = /^([A-Za-z_.][\w.\-\/]*)\s*:(?:\s+(.*)|$)/;
  function parseYaml(text) {
    var lines = [];
    String(text).split(/\r?\n/).forEach(function (raw, n) {
      var l = stripComment(raw).replace(/\s+$/, "");
      if (!l.trim() || l.trim() === "---") return;
      lines.push({ indent: l.match(/^ */)[0].length, text: l.trim(), n: n + 1 });
    });
    if (!lines.length) return {};
    var r = parseBlock(lines, 0, lines[0].indent);
    if (r.next < lines.length) throw new Error("YAML: unexpected indentation at line " + lines[r.next].n);
    return r.value;
  }
  function parseBlock(lines, i, indent) {
    if (i >= lines.length) return { value: null, next: i };
    var isSeq = lines[i].text === "-" || lines[i].text.indexOf("- ") === 0;
    if (isSeq) {
      var arr = [];
      while (i < lines.length && lines[i].indent === indent && (lines[i].text === "-" || lines[i].text.indexOf("- ") === 0)) {
        var body = lines[i].text === "-" ? "" : lines[i].text.slice(2).trim();
        var childIndent = indent + 2;
        if (body === "") {
          if (i + 1 < lines.length && lines[i + 1].indent > indent) {
            var r0 = parseBlock(lines, i + 1, lines[i + 1].indent); arr.push(r0.value); i = r0.next;
          } else { arr.push(null); i++; }
        } else if (MAPLINE.test(body) && body[0] !== "$") {
          lines[i] = { indent: childIndent, text: body, n: lines[i].n };
          var r1 = parseBlock(lines, i, childIndent); arr.push(r1.value); i = r1.next;
        } else { arr.push(scalar(body)); i++; }
      }
      return { value: arr, next: i };
    }
    var obj = {};
    while (i < lines.length && lines[i].indent === indent && lines[i].text.indexOf("- ") !== 0 && lines[i].text !== "-") {
      var m = lines[i].text.match(MAPLINE);
      if (!m) throw new Error("YAML: cannot read line " + lines[i].n + ": " + lines[i].text);
      var key = m[1], val = m[2];
      if (val === undefined || val === "") {
        if (i + 1 < lines.length && lines[i + 1].indent > indent) {
          var r2 = parseBlock(lines, i + 1, lines[i + 1].indent); obj[key] = r2.value; i = r2.next;
        } else { obj[key] = null; i++; }
      } else { obj[key] = scalar(val); i++; }
    }
    if (i < lines.length && lines[i].indent > indent) throw new Error("YAML: unexpected indentation at line " + lines[i].n);
    return { value: obj, next: i };
  }

  // ------------------------------------------------------------------ merging
  function isMap(x) { return x !== null && typeof x === "object" && !Array.isArray(x); }
  function deepMerge(base, over) {
    // reverse deep merge as the reference describes extends: hashes merge by key, other values
    // are replaced ("Doesn't merge the values of the keys").
    if (!isMap(base) || !isMap(over)) return clone(over);
    var out = clone(base);
    Object.keys(over).forEach(function (k) { out[k] = isMap(out[k]) && isMap(over[k]) ? deepMerge(out[k], over[k]) : clone(over[k]); });
    return out;
  }
  function clone(x) { return JSON.parse(JSON.stringify(x === undefined ? null : x)); }
  var GLOBAL_KEYS = { stages: 1, variables: 1, default: 1, include: 1, workflow: 1 };

  function resolveIncludes(cfg, files, errors) {
    var inc = cfg.include;
    if (inc === undefined || inc === null) return cfg;
    if (!Array.isArray(inc)) inc = [inc];
    var merged = {};
    inc.forEach(function (item) {
      var name = typeof item === "string" ? item : (item.local || item.template || item.remote || (item.project ? item.file : null));
      var src = files[name];
      if (src === undefined) { errors.push("include: file '" + name + "' not found"); return; }
      var part = parseYaml(src);
      // includes are read in order; the last included file takes precedence between includes
      Object.keys(part).forEach(function (k) { merged[k] = (k in merged) ? deepMerge(merged[k], part[k]) : part[k]; });
    });
    // the main configuration is merged last and wins where keys overlap
    Object.keys(cfg).forEach(function (k) { if (k === "include") return; merged[k] = (k in merged) ? deepMerge(merged[k], cfg[k]) : cfg[k]; });
    return merged;
  }
  function resolveExtends(cfg, name, seen, errors) {
    var job = cfg[name];
    if (!isMap(job)) return job;
    var ext = job.extends;
    if (ext === undefined || ext === null) return job;
    var parents = Array.isArray(ext) ? ext : [ext];
    if (seen.length > 11) { errors.push("extends: more than eleven levels at '" + name + "'"); return job; }
    var acc = {};
    parents.forEach(function (p) {
      if (seen.indexOf(p) >= 0) { errors.push("extends: circular reference at '" + p + "'"); return; }
      if (!(p in cfg)) { errors.push("extends: '" + name + "' extends '" + p + "' which is not defined"); return; }
      acc = deepMerge(acc, resolveExtends(cfg, p, seen.concat([p]), errors));
    });
    var own = clone(job); delete own.extends;
    return deepMerge(acc, own);
  }

  // ------------------------------------------------------------------ rules
  function predefined(ctx) {
    var v = { CI_PIPELINE_SOURCE: ctx.source, CI_DEFAULT_BRANCH: ctx.default_branch, CI_PROJECT_NAME: "penwood-pipelines" };
    if (ctx.source === "merge_request_event") {
      v.CI_MERGE_REQUEST_IID = ctx.mr_iid; v.CI_MERGE_REQUEST_TARGET_BRANCH_NAME = ctx.target_branch;
      v.CI_MERGE_REQUEST_SOURCE_BRANCH_NAME = ctx.branch; v.CI_COMMIT_REF_NAME = ctx.branch;
    } else if (ctx.tag) { v.CI_COMMIT_TAG = ctx.tag; v.CI_COMMIT_REF_NAME = ctx.tag; }
    else { v.CI_COMMIT_BRANCH = ctx.branch; v.CI_COMMIT_REF_NAME = ctx.branch; if (ctx.open_mr) v.CI_OPEN_MERGE_REQUESTS = "penwood/pipelines!" + (ctx.mr_iid || "0"); }
    return v;
  }
  function tokenize(expr) {
    var toks = [], i = 0, s = String(expr);
    while (i < s.length) {
      var c = s[i];
      if (/\s/.test(c)) { i++; continue; }
      if (c === "(" || c === ")") { toks.push({ t: c }); i++; continue; }
      if (s.substr(i, 2) === "&&" || s.substr(i, 2) === "||" || s.substr(i, 2) === "==" || s.substr(i, 2) === "!=" || s.substr(i, 2) === "=~" || s.substr(i, 2) === "!~") { toks.push({ t: s.substr(i, 2) }); i += 2; continue; }
      if (c === "$") { var m = s.slice(i).match(/^\$\{?([A-Za-z_][A-Za-z0-9_]*)\}?/); toks.push({ t: "var", v: m[1] }); i += m[0].length; continue; }
      if (c === '"' || c === "'") { var j = s.indexOf(c, i + 1); if (j < 0) throw new Error("rules: unterminated string in " + expr); toks.push({ t: "str", v: s.slice(i + 1, j) }); i = j + 1; continue; }
      if (c === "/") { var k = s.indexOf("/", i + 1); if (k < 0) throw new Error("rules: unterminated regex in " + expr); var fl = s.slice(k + 1).match(/^[i]*/)[0]; toks.push({ t: "re", v: s.slice(i + 1, k), f: fl }); i = k + 1 + fl.length; continue; }
      if (s.substr(i, 4) === "null") { toks.push({ t: "null" }); i += 4; continue; }
      throw new Error("rules: cannot read '" + s.slice(i) + "'");
    }
    return toks;
  }
  function evalIf(expr, vars) {
    var toks = tokenize(expr), p = 0;
    function peek() { return toks[p]; }
    function next() { return toks[p++]; }
    function value(tok) { if (tok.t === "var") return vars[tok.v] === undefined ? null : String(vars[tok.v]); if (tok.t === "str") return tok.v; if (tok.t === "null") return null; throw new Error("rules: unexpected token"); }
    function primary() {
      var tok = next();
      if (!tok) throw new Error("rules: empty expression");
      if (tok.t === "(") { var r = orExpr(); if (!next() || toks[p - 1].t !== ")") throw new Error("rules: missing )"); return r; }
      var left = value(tok), op = peek();
      if (op && (op.t === "==" || op.t === "!=")) { next(); var right = value(next()); return op.t === "==" ? left === right : left !== right; }
      if (op && (op.t === "=~" || op.t === "!~")) { next(); var re = next(); if (re.t !== "re") throw new Error("rules: regex expected"); var ok = left !== null && new RegExp(re.v, re.f).test(left); return op.t === "=~" ? ok : !ok; }
      return left !== null && left !== "";
    }
    function andExpr() { var v = primary(); while (peek() && peek().t === "&&") { next(); var w = primary(); v = v && w; } return v; }
    function orExpr() { var v = andExpr(); while (peek() && peek().t === "||") { next(); var w = andExpr(); v = v || w; } return v; }
    var out = orExpr();
    if (p < toks.length) throw new Error("rules: trailing tokens in " + expr);
    return out;
  }
  function globToRe(g) {
    var re = "", i = 0;
    while (i < g.length) {
      var c = g[i];
      if (g.substr(i, 3) === "**/") { re += "(?:.*/)?"; i += 3; }
      else if (g.substr(i, 2) === "**") { re += ".*"; i += 2; }
      else if (c === "*") { re += "[^/]*"; i++; }
      else if (c === "?") { re += "[^/]"; i++; }
      else { re += c.replace(/[.+^${}()|[\]\\]/g, "\\$&"); i++; }
    }
    return new RegExp("^" + re + "$");
  }
  function changesMatch(patterns, changed) {
    var pats = Array.isArray(patterns) ? patterns : (isMap(patterns) ? patterns.paths : [patterns]);
    return (changed || []).some(function (f) { return pats.some(function (pt) { return globToRe(String(pt)).test(f); }); });
  }
  function evalRules(rules, vars, ctx) {
    // Evaluated in order; the first matching rule decides. No match: not added.
    for (var i = 0; i < rules.length; i++) {
      var r = rules[i];
      if (!isMap(r)) continue;
      if (r.exists !== undefined) throw new Error("rules:exists is outside the taught subset");
      var hit = true;
      if (r["if"] !== undefined) hit = hit && evalIf(r["if"], vars);
      if (hit && r.changes !== undefined) hit = hit && changesMatch(r.changes, ctx.changed);
      if (hit) return { matched: true, index: i, rule: r };
    }
    return { matched: false, index: -1, rule: null };
  }
  function ruleText(r) {
    var parts = [];
    if (r["if"] !== undefined) parts.push("if: " + r["if"]);
    if (r.changes !== undefined) parts.push("changes: " + JSON.stringify(r.changes));
    if (r.when !== undefined) parts.push("when: " + r.when);
    return parts.join(" · ") || "(bare when)";
  }

  // ------------------------------------------------------------------ pipeline build
  var DEFAULT_STAGES = [".pre", "build", "test", "deploy", ".post"];
  function build(D, fileName, ctx, opts) {
    opts = opts || {};
    var errors = [], warnings = [];
    var cfg;
    try { cfg = parseYaml(D.files[fileName]); } catch (e) { return { ok: false, file: fileName, errors: [String(e.message || e)], jobs: [], stages: [] }; }
    cfg = resolveIncludes(cfg, D.files, errors);
    var stages = Array.isArray(cfg.stages) ? cfg.stages.slice() : ["build", "test", "deploy"];
    if (stages.indexOf(".pre") < 0) stages.unshift(".pre");
    if (stages.indexOf(".post") < 0) stages.push(".post");
    var globalVars = isMap(cfg.variables) ? cfg.variables : {};
    var dflt = isMap(cfg["default"]) ? cfg["default"] : {};
    var pre = predefined(ctx);
    // workflow:rules decide whether the pipeline exists at all
    var wfVars = {}; Object.keys(pre).forEach(function (k) { wfVars[k] = pre[k]; }); Object.keys(globalVars).forEach(function (k) { wfVars[k] = globalVars[k]; });
    var workflowBlocked = false, workflowReason = null;
    if (isMap(cfg.workflow) && Array.isArray(cfg.workflow.rules)) {
      var w = evalRules(cfg.workflow.rules, wfVars, ctx);
      if (!w.matched) { workflowBlocked = true; workflowReason = "workflow: no rule matched, so no pipeline is created"; }
      else if (w.rule.when === "never") { workflowBlocked = true; workflowReason = "workflow rule " + (w.index + 1) + " says when: never (" + ruleText(w.rule) + ")"; }
    }
    var names = Object.keys(cfg).filter(function (k) { return !(k in GLOBAL_KEYS) && k[0] !== "." && isMap(cfg[k]); });
    var jobs = [], byName = {};
    names.forEach(function (name, order) {
      var job = resolveExtends(cfg, name, [name], errors);
      Object.keys(dflt).forEach(function (k) { if (job[k] === undefined) job[k] = dflt[k]; });
      if (job.script === undefined && job.trigger === undefined) errors.push("job '" + name + "' has no script");
      var stage = job.stage === undefined || job.stage === null ? "test" : String(job.stage);
      if (stages.indexOf(stage) < 0) errors.push("job '" + name + "' uses stage '" + stage + "' which is not in stages");
      var vars = {}; Object.keys(pre).forEach(function (k) { vars[k] = pre[k]; }); Object.keys(globalVars).forEach(function (k) { vars[k] = globalVars[k]; });
      if (isMap(job.variables)) Object.keys(job.variables).forEach(function (k) { vars[k] = job.variables[k]; });
      var when = job.when === undefined || job.when === null ? "on_success" : String(job.when);
      var allowFailure = job.allow_failure === undefined ? null : !!job.allow_failure;
      var included = true, reason = "no rules: always added", ruleIndex = -1, whenFromRules = false;
      if (Array.isArray(job.rules)) {
        var res;
        try { res = evalRules(job.rules, vars, ctx); } catch (e) { errors.push("job '" + name + "': " + e.message); res = { matched: false }; }
        if (!res.matched) { included = false; reason = "no rule matched (" + job.rules.length + " rules checked)"; }
        else {
          ruleIndex = res.index;
          if (res.rule.when !== undefined) { when = String(res.rule.when); whenFromRules = true; }
          if (when === "never") { included = false; reason = "rule " + (res.index + 1) + " matched with when: never (" + ruleText(res.rule) + ")"; }
          else { reason = "rule " + (res.index + 1) + " matched (" + ruleText(res.rule) + ")"; }
          if (res.rule.allow_failure !== undefined) allowFailure = !!res.rule.allow_failure;
        }
      } else if (when === "never") { errors.push("job '" + name + "': when: never is only valid inside rules"); }
      if (allowFailure === null) allowFailure = when === "manual" ? !whenFromRules : false;
      var needs = null;
      if (job.needs !== undefined && job.needs !== null) {
        needs = (Array.isArray(job.needs) ? job.needs : [job.needs]).map(function (n) {
          return isMap(n) ? { job: String(n.job), optional: !!n.optional, artifacts: n.artifacts === undefined ? true : !!n.artifacts } : { job: String(n), optional: false, artifacts: true };
        });
        if (needs.length > 50) errors.push("job '" + name + "' needs more than 50 jobs");
      }
      var j = { name: name, order: order, stage: stage, stageIndex: stages.indexOf(stage), when: when, allowFailure: allowFailure,
        needs: needs, included: included && !workflowBlocked, reason: workflowBlocked ? workflowReason : reason, ruleIndex: ruleIndex,
        duration: D.durations[name] === undefined ? 60 : D.durations[name], environment: isMap(job.environment) ? job.environment.name : (job.environment || null) };
      jobs.push(j); byName[name] = j;
    });
    // needs validation on the jobs that are in the pipeline
    jobs.forEach(function (j) {
      if (!j.included || !j.needs) return;
      j.needs.forEach(function (n) {
        var t = byName[n.job];
        if (!t) { if (!n.optional) errors.push("'" + j.name + "' job needs '" + n.job + "' job, but '" + n.job + "' is not defined"); return; }
        if (!t.included) { if (!n.optional) errors.push("'" + j.name + "' job needs '" + n.job + "' job, but '" + n.job + "' is not in the pipeline"); return; }
        if (t.stageIndex > j.stageIndex) errors.push("ENGINE RULE: '" + j.name + "' needs '" + n.job + "' from a later stage");
      });
    });
    var inc = jobs.filter(function (j) { return j.included; });
    var preds = {};
    inc.forEach(function (j) {
      preds[j.name] = j.needs ? j.needs.map(function (n) { return n.job; }).filter(function (nm) { return byName[nm] && byName[nm].included; })
        : inc.filter(function (o) { return o.stageIndex < j.stageIndex; }).map(function (o) { return o.name; });
    });
    var cycle = opts.ignoreCycles ? null : findCycle(inc.map(function (j) { return j.name; }), preds);
    if (cycle) errors.push("needs: cycle detected " + cycle.join(" -> "));
    return { ok: errors.length === 0, file: fileName, ctx: ctx, errors: errors, warnings: warnings, stages: stages, jobs: jobs, preds: preds,
      workflowBlocked: workflowBlocked, workflowReason: workflowReason, includedCount: inc.length };
  }
  function findCycle(names, preds) {
    var state = {}, stack = [];
    function visit(n) {
      if (state[n] === 2) return null;
      if (state[n] === 1) { var i = stack.indexOf(n); return stack.slice(i).concat([n]); }
      state[n] = 1; stack.push(n);
      var ps = preds[n] || [];
      for (var k = 0; k < ps.length; k++) { var c = visit(ps[k]); if (c) return c; }
      stack.pop(); state[n] = 2; return null;
    }
    for (var i = 0; i < names.length; i++) { var c = visit(names[i]); if (c) return c; }
    return null;
  }

  // ------------------------------------------------------------------ schedule
  function schedule(P, cap) {
    // cap 0 = unlimited runners. Manual jobs wait for a click and are not scheduled; anything
    // downstream of a manual job waits too (ENGINE RULE: the reference does not fix a duration).
    var out = { ok: P.ok, wall: null, serial: 0, ran: [], skipped: [], manual: [], waiting: [], starts: {}, criticalPath: [], cap: cap, queueTotal: 0 };
    P.jobs.forEach(function (j) { if (!j.included) out.skipped.push({ job: j.name, why: j.reason }); });
    if (!P.ok) return out;
    var inc = P.jobs.filter(function (j) { return j.included; }).sort(function (a, b) { return a.stageIndex - b.stageIndex || a.order - b.order; });
    var byName = {}; inc.forEach(function (j) { byName[j.name] = j; });
    var status = {};
    inc.forEach(function (j) { if (j.when === "manual") { status[j.name] = "manual"; out.manual.push(j.name); } });
    // propagate waiting
    var changed = true;
    while (changed) {
      changed = false;
      inc.forEach(function (j) {
        if (status[j.name]) return;
        var blocked = (P.preds[j.name] || []).some(function (p) { return status[p] === "manual" || status[p] === "waiting"; });
        if (blocked) { status[j.name] = "waiting"; out.waiting.push(j.name); changed = true; }
      });
    }
    var run = inc.filter(function (j) { return !status[j.name]; });
    run.forEach(function (j) { out.serial += j.duration; });
    // tail length (longest path to a sink) for priority under a cap
    var succ = {}; run.forEach(function (j) { succ[j.name] = []; });
    run.forEach(function (j) { (P.preds[j.name] || []).forEach(function (p) { if (succ[p]) succ[p].push(j.name); }); });
    var tail = {};
    function tailOf(n) { if (tail[n] !== undefined) return tail[n]; var best = 0; succ[n].forEach(function (s) { best = Math.max(best, tailOf(s)); }); tail[n] = byName[n].duration + best; return tail[n]; }
    run.forEach(function (j) { tailOf(j.name); });
    var runners = cap > 0 ? cap : run.length || 1;
    var t = 0, done = {}, running = [], pending = run.slice(), finish = {};
    while (pending.length || running.length) {
      var ready = pending.filter(function (j) { return (P.preds[j.name] || []).every(function (p) { return done[p] !== undefined; }); });
      ready.sort(function (a, b) { return tail[b.name] - tail[a.name] || a.stageIndex - b.stageIndex || a.order - b.order; });
      while (running.length < runners && ready.length) {
        var j = ready.shift(); pending.splice(pending.indexOf(j), 1);
        var st = t; (P.preds[j.name] || []).forEach(function (p) { st = Math.max(st, finish[p]); });
        st = Math.max(st, t);
        var readyAt = 0; (P.preds[j.name] || []).forEach(function (p) { readyAt = Math.max(readyAt, finish[p]); });
        out.queueTotal += st - readyAt;
        out.starts[j.name] = { start: st, finish: st + j.duration, stage: j.stage, queued: st - readyAt };
        running.push({ job: j, finish: st + j.duration });
      }
      if (!running.length) break; // nothing ready: remaining pending wait on something unschedulable
      running.sort(function (a, b) { return a.finish - b.finish || a.job.order - b.job.order; });
      var nx = running.shift(); t = nx.finish; done[nx.job.name] = t; finish[nx.job.name] = t; out.ran.push(nx.job.name);
    }
    out.wall = out.ran.length ? Math.max.apply(null, out.ran.map(function (n) { return finish[n]; })) : 0;
    // critical path: walk back from the last finisher along the predecessor that finished last
    if (out.ran.length) {
      var cur = out.ran.slice().sort(function (a, b) { return finish[b] - finish[a] || byName[a].order - byName[b].order; })[0];
      var path = [cur];
      while (true) {
        var ps = (P.preds[cur] || []).filter(function (p) { return finish[p] !== undefined; });
        if (!ps.length) break;
        ps.sort(function (a, b) { return finish[b] - finish[a] || byName[a].order - byName[b].order; });
        cur = ps[0]; path.unshift(cur);
      }
      out.criticalPath = path;
    }
    out.ran.sort(function (a, b) { return out.starts[a].start - out.starts[b].start || byName[a].order - byName[b].order; });
    return out;
  }

  // ------------------------------------------------------------------ ladder
  function runOne(D, file, ctxKey, cap, opts) {
    var P = build(D, file, D.contexts[ctxKey], opts);
    var S = schedule(P, cap);
    return { file: file, ctx: ctxKey, cap: cap, ok: P.ok, errors: P.errors, workflowBlocked: P.workflowBlocked,
      includedCount: P.includedCount, wall: S.wall, serial: S.serial, ranCount: S.ran.length, ran: S.ran, skipped: S.skipped,
      manual: S.manual, waiting: S.waiting, starts: S.starts, criticalPath: S.criticalPath, queueTotal: S.queueTotal,
      computeMinutes: S.serial === null ? null : round2(S.serial / 60 * D.settings.cost_factor) };
  }
  function round2(x) { return Math.round(x * 100) / 100; }
  function scorecard(D, file, cap, opts) {
    var mix = D.settings.runs_per_month, total = 0, rows = {}, runs = 0;
    Object.keys(mix).sort().forEach(function (k) {
      var r = runOne(D, file, k, cap, opts);
      rows[k] = { runs: mix[k], wall: r.wall, serial: r.serial, computeMinutes: r.computeMinutes, ranCount: r.ranCount, skipped: r.skipped.length, ok: r.ok };
      total += r.computeMinutes * mix[k]; runs += mix[k];
    });
    total = round2(total);
    return { rows: rows, runs: runs, computeMinutesPerMonth: total, quota: D.settings.free_quota_minutes,
      quotaShare: round2(total / D.settings.free_quota_minutes * 100), fitsQuota: total <= D.settings.free_quota_minutes };
  }
  function falseGreen(D, brokenRun, goodRun) {
    var job = D.settings.broken.job;
    var ranBefore = goodRun.ran.indexOf(job) >= 0, ranAfter = brokenRun.ran.indexOf(job) >= 0;
    var sk = brokenRun.skipped.filter(function (s) { return s.job === job; })[0];
    return { job: job, ranBefore: ranBefore, ranAfter: ranAfter, pipelineOk: brokenRun.ok, isFalseGreen: brokenRun.ok && ranBefore && !ranAfter,
      why: sk ? sk.why : null, rule: D.settings.broken.rule, real: D.settings.broken.real, jobsRun: brokenRun.ranCount };
  }
  function ladder(D, opts) {
    var out = { rungs: {} };
    D.settings.rungs.forEach(function (r) {
      if (r.ctx === "mix") out.rungs[r.id] = scorecard(D, r.file, r.cap, opts);
      else out.rungs[r.id] = runOne(D, r.file, r.ctx, r.cap, opts);
    });
    var a = D.settings.anti;
    out.anti = runOne(D, a.file, a.ctx, a.cap, opts);
    var best = out.rungs.r2;
    var runsMain = D.settings.runs_per_month.main;
    out.anti.minutesLostPerRun = round2((out.anti.wall - best.wall) / 60);
    out.anti.minutesLostPerMonth = round2((out.anti.wall - best.wall) / 60 * runsMain);
    out.anti.runsCounted = runsMain;
    var good = out.rungs.r3;
    out.broken = runOne(D, D.settings.broken.file, good.ctx, good.cap, opts);
    out.broken.falseGreen = falseGreen(D, out.broken, good);
    out.faults = { cycle: build(D, "fault-cycle.yml", D.contexts.main, opts).errors, missing: build(D, "fault-missing.yml", D.contexts.main, opts).errors };
    return out;
  }

  // ------------------------------------------------------------------ self-test
  function properties(L) {
    var r1 = L.rungs.r1, r2 = L.rungs.r2, r3 = L.rungs.r3, r4 = L.rungs.r4;
    var chainOk = true;
    [r1, r2, r3, r4].forEach(function (r) {
      var maxDur = 0, maxFinish = 0;
      Object.keys(r.starts).forEach(function (n) { var s = r.starts[n]; maxDur = Math.max(maxDur, s.finish - s.start); maxFinish = Math.max(maxFinish, s.finish); });
      if (r.wall !== maxFinish || r.wall < maxDur) chainOk = false;
    });
    // every needs edge respected on r2: a job starts after its needs finish
    var P2 = null;
    return [
      ["a planted needs cycle is detected", L.faults.cycle.some(function (e) { return /cycle/.test(e); })],
      ["a needs target excluded by rules is an error", L.faults.missing.some(function (e) { return /not in the pipeline/.test(e); })],
      ["wall clock equals the last finish and is never shorter than the longest job", chainOk],
      ["needs never make the pipeline slower than stages", r2.wall <= r1.wall],
      ["a runner cap never makes the pipeline faster", r4.wall >= r3.wall],
      ["jobs that never run are not counted as run", r3.ranCount + r3.skipped.length + r3.manual.length + r3.waiting.length === r3.includedCount + r3.skipped.length && r3.ranCount === r3.ran.length],
      ["the anti-lever's wall clock equals its serial time", L.anti.wall === L.anti.serial],
      ["the rules typo drops the test job and the pipeline still passes", L.broken.falseGreen.isFalseGreen],
      ["the scorecard counts every run in the month", L.rungs.r5.runs === 40]
    ];
  }
  function selfTest(D) {
    var ok = properties(ladder(D)), held = ok.filter(function (p) { return p[1]; }).length;
    var planted = properties(ladder(D, { ignoreCycles: true }));
    var caught = !planted[0][1];
    return { held: held, total: ok.length, failed: ok.filter(function (p) { return !p[1]; }).map(function (p) { return p[0]; }),
      plantedFaultCaught: caught, pass: held === ok.length && caught };
  }

  var API = { parseYaml: parseYaml, evalIf: evalIf, build: build, schedule: schedule, runOne: runOne, scorecard: scorecard, ladder: ladder, selfTest: selfTest, properties: properties };
  if (typeof module !== "undefined" && module.exports) { module.exports = API; return; }
  root.GTL = API;

  // ------------------------------------------------------------------ browser UI
  if (typeof document === "undefined") return;
  var D = root.GTL_DATA, state = { rung: "r1", ctx: "main", cap: 0, file: "stages-only.yml", anti: false, broken: false, custom: false }, ui = {};
  function esc(x) { return String(x).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e; }
  function mmss(s) { if (s === null || s === undefined) return "-"; var m = Math.floor(s / 60), r = s % 60; return m + ":" + (r < 10 ? "0" : "") + r; }
  function fmtNum(x) { var p = x.toFixed(1).split("."); return p[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",") + "." + p[1]; }
  function kind(k) { return '<span class="gtl-kind is-' + k + '">' + k + "</span>"; }
  function metric(label, value, unit, k) { return el("div", "gtl-metric", '<span class="gtl-mlabel">' + esc(label) + '</span><span class="gtl-mvalue">' + value + '</span><span class="gtl-munit">' + esc(unit) + "</span>" + kind(k)); }

  function currentFile() { if (state.broken) return D.settings.broken.file; if (state.anti) return D.settings.anti.file; return state.file; }
  function render() {
    Object.keys(ui.rbtn).forEach(function (id) { ui.rbtn[id].classList.toggle("is-on", id === state.rung && !state.anti && !state.custom); });
    ui.antiBtn.classList.toggle("is-on", state.anti);
    ui.breakBtn.classList.toggle("is-on", state.broken);
    ui.ctxSel.value = state.ctx; ui.capRng.value = String(state.cap); ui.capVal.textContent = state.cap === 0 ? "unlimited" : String(state.cap);
    ui.board.innerHTML = ""; ui.table.innerHTML = ""; ui.hint.innerHTML = "";
    var rung = D.settings.rungs.filter(function (r) { return r.id === state.rung; })[0];
    var isMix = rung && rung.ctx === "mix" && !state.anti && !state.custom;
    var file = currentFile();
    ui.fileName.textContent = file + (state.broken ? "  (typo planted on " + D.settings.broken.job + ")" : "");
    ui.yaml.textContent = D.files[file];
    if (isMix) { renderScorecard(file); return; }
    var r = runOne(D, file, state.ctx, state.cap);
    var good = state.broken ? runOne(D, state.anti ? D.settings.anti.file : state.file, state.ctx, state.cap) : null;
    var blurb = state.anti ? D.settings.anti.blurb : (state.custom ? "Your own context and runner cap on the " + file + " configuration." : rung.blurb);
    ui.intro.textContent = blurb + " Context: " + D.contexts[state.ctx].label + ".";
    if (!r.ok) {
      ui.board.appendChild(el("div", "gtl-verdict is-bad", "<strong>Pipeline not created.</strong> " + r.errors.map(esc).join("<br>")));
      return;
    }
    if (r.workflowBlocked) {
      ui.board.appendChild(el("div", "gtl-verdict is-ok", "<strong>No pipeline.</strong> " + esc(r.skipped[0] ? r.skipped[0].why : "workflow rules excluded it") + ". Zero compute minutes, by design."));
      return;
    }
    var fg = state.broken && good ? falseGreen(D, r, good) : null;
    var verdictCls = fg && fg.isFalseGreen ? "is-bad" : (state.anti ? "is-bad" : "is-good");
    var vtxt;
    if (fg && fg.isFalseGreen) vtxt = "<strong>False green.</strong> The pipeline passes with " + fg.jobsRun + " jobs, and <code>" + esc(fg.job) + "</code> is not one of them: " + esc(fg.why) + ". The rule compares against <code>" + esc(fg.rule.split("==")[1].trim()) + "</code>; the real value of CI_PIPELINE_SOURCE is <code>" + esc(fg.real) + "</code>. Nothing is red, because a job that was never added cannot fail.";
    else if (state.anti) vtxt = "<strong>The worse decision.</strong> Wall clock " + mmss(r.wall) + " equals serial " + mmss(r.serial) + ": every job waits for the one before it. Against the needs pipeline on the same push (" + mmss(L0.rungs.r2.wall) + ") that is <strong>" + L0.anti.minutesLostPerRun.toFixed(2) + " minutes lost per run, " + L0.anti.minutesLostPerMonth.toFixed(1) + " minutes a month</strong> at Penwood's " + L0.anti.runsCounted + " pushes to main.";
    else vtxt = "<strong>Pipeline passed.</strong> " + r.ranCount + " jobs ran, " + r.skipped.length + " never added, " + r.manual.length + " waiting for a click" + (r.waiting.length ? ", " + r.waiting.length + " waiting behind a manual job" : "") + ". Wall clock " + mmss(r.wall) + ", serial " + mmss(r.serial) + ", " + r.computeMinutes.toFixed(2) + " compute minutes.";
    ui.board.appendChild(el("div", "gtl-verdict " + verdictCls, vtxt));
    var grid = el("div", "gtl-metrics");
    grid.appendChild(metric("Wall clock", mmss(r.wall), state.cap > 0 && r.queueTotal > 0 ? "jobs waited " + mmss(r.queueTotal) + " in total for a free runner; last to finish: " + r.criticalPath.join(" > ") : "critical path: " + r.criticalPath.join(" > "), "measured"));
    grid.appendChild(metric("Serial time", mmss(r.serial), "sum of every job that ran", "measured"));
    grid.appendChild(metric("Compute minutes", r.computeMinutes.toFixed(2), "per run, cost factor " + D.settings.cost_factor + " (Linux small, hosted runner)", "measured"));
    grid.appendChild(metric("Jobs", r.ranCount + " ran · " + r.skipped.length + " never added", r.manual.length + " manual" + (r.waiting.length ? " · " + r.waiting.length + " waiting" : ""), "measured"));
    grid.appendChild(metric("Runners", state.cap === 0 ? "unlimited" : String(state.cap), "assumption on the widget: GitLab.com hosted runners, no queueing modelled beyond the cap", "assumption"));
    grid.appendChild(metric("Job durations", "median of 20 runs", "constructed Penwood run log, seconds", "constructed"));
    ui.board.appendChild(grid);
    var tbl = el("table", "clean gtl-table");
    tbl.innerHTML = "<tr><th>Job</th><th>Stage</th><th>Start</th><th>Finish</th><th>Status</th></tr>";
    var jobsOrdered = D.jobs.slice();
    jobsOrdered.forEach(function (n) {
      var s = r.starts[n], sk = r.skipped.filter(function (x) { return x.job === n; })[0];
      var status, cls = "";
      if (s) { status = r.criticalPath.indexOf(n) >= 0 ? "ran · on the critical path" : "ran"; }
      else if (r.manual.indexOf(n) >= 0) { status = "manual: waits for a click"; cls = "is-manual"; }
      else if (r.waiting.indexOf(n) >= 0) { status = "waiting behind a manual job"; cls = "is-manual"; }
      else if (sk) { status = "never added: " + sk.why; cls = "is-skip"; }
      else { status = "not in this configuration"; cls = "is-skip"; }
      var stage = (D.jobs.indexOf(n) >= 0 && r.starts[n]) ? r.starts[n].stage : stageOf(file, n);
      tbl.appendChild(el("tr", cls, "<td><code>" + esc(n) + "</code></td><td>" + esc(stage) + "</td><td>" + (s ? mmss(s.start) : "-") + "</td><td>" + (s ? mmss(s.finish) : "-") + "</td><td>" + esc(status) + "</td>"));
    });
    ui.table.appendChild(tbl);
    ui.hint.innerHTML = "Constructed: Penwood, its jobs and run log. Measured: every time, count and path above, recomputed from the YAML on each click. Assumption: runner count. Tier facts on the scorecard were read on the GitLab.com pricing and compute-minutes pages on 2026-10-29; re-verify before relying on them.";
  }
  var stageCache = {};
  function stageOf(file, n) { if (!stageCache[file]) { try { var c = parseYaml(D.files[file]); stageCache[file] = c; } catch (e) { return "-"; } } var j = stageCache[file][n]; return j && j.stage ? j.stage : "-"; }
  function renderScorecard(file) {
    var sc = scorecard(D, file, state.cap);
    ui.intro.textContent = D.settings.rungs[4].blurb;
    var cls = sc.fitsQuota ? "is-good" : "is-bad";
    ui.board.appendChild(el("div", "gtl-verdict " + cls, "<strong>" + fmtNum(sc.computeMinutesPerMonth) + " compute minutes a month</strong> across " + sc.runs + " runs, " + sc.quotaShare.toFixed(2) + "% of the Free tier's " + sc.quota + " (read 2026-10-29; re-verify the tier page). " + (sc.fitsQuota ? "Fits." : "Over the quota. The compute-minutes page says only that enforcement measures apply; the levers are rules:changes, fewer schedules, runners the quota page does not measure (re-verify), or a paid tier.")));
    var grid = el("div", "gtl-metrics");
    Object.keys(sc.rows).forEach(function (k) {
      var row = sc.rows[k];
      grid.appendChild(metric(D.contexts[k].label.split(",")[0], row.runs + " × " + row.computeMinutes.toFixed(2) + " min", "wall " + mmss(row.wall) + " · " + row.ranCount + " jobs ran · " + row.skipped + " never added", "measured"));
    });
    grid.appendChild(metric("Run mix", "24 · 12 · 4", "merge requests · pushes to main · schedules, per month", "constructed"));
    grid.appendChild(metric("Quota", sc.quota + " min", "GitLab.com Free tier compute minutes per month, cost factor 1 on Linux small", "assumption"));
    ui.board.appendChild(grid);
    ui.hint.innerHTML = "The scorecard uses the runner cap above (" + (state.cap === 0 ? "unlimited" : state.cap) + "); compute minutes do not depend on it, wall clock does. Tier figures are the ones on the pricing page on 2026-10-29 and change; re-verify before delivery.";
  }
  var L0;
  function init() {
    var host = document.getElementById("gtl-bench");
    if (!host || !D) return;
    L0 = ladder(D);
    var panel = el("div", "gtl-panel");
    panel.appendChild(el("h4", null, "The Penwood pipeline DAG bench"));
    ui.intro = el("p", "gtl-intro"); panel.appendChild(ui.intro);
    var row = el("div", "gtl-row"); row.appendChild(el("span", "gtl-rlabel", "Rung"));
    ui.rbtn = {};
    D.settings.rungs.forEach(function (r) {
      var b = el("button", "gtl-chip", esc(r.label)); b.type = "button";
      b.addEventListener("click", function () { state.rung = r.id; state.anti = false; state.custom = false; state.file = r.file; state.ctx = r.ctx === "mix" ? "mr" : r.ctx; state.cap = r.cap; render(); });
      ui.rbtn[r.id] = b; row.appendChild(b);
    });
    ui.antiBtn = el("button", "gtl-chip is-anti", esc(D.settings.anti.label)); ui.antiBtn.type = "button";
    ui.antiBtn.addEventListener("click", function () { state.anti = !state.anti; state.custom = false; if (state.anti) { state.ctx = D.settings.anti.ctx; state.cap = D.settings.anti.cap; } render(); });
    row.appendChild(ui.antiBtn); panel.appendChild(row);
    var row2 = el("div", "gtl-row"); row2.appendChild(el("span", "gtl-rlabel", "Context"));
    ui.ctxSel = el("select", "gtl-select");
    Object.keys(D.contexts).forEach(function (k) { var o = el("option", null, esc(D.contexts[k].label)); o.value = k; ui.ctxSel.appendChild(o); });
    ui.ctxSel.addEventListener("change", function () { state.ctx = ui.ctxSel.value; state.custom = true; render(); });
    row2.appendChild(ui.ctxSel); panel.appendChild(row2);
    var row3 = el("div", "gtl-row"); row3.appendChild(el("span", "gtl-rlabel", "Runners"));
    ui.capRng = el("input", "gtl-range"); ui.capRng.type = "range"; ui.capRng.min = "0"; ui.capRng.max = "6"; ui.capRng.step = "1"; ui.capRng.value = "0";
    ui.capRng.addEventListener("input", function () { state.cap = parseInt(ui.capRng.value, 10); state.custom = true; render(); });
    ui.capVal = el("span", "gtl-tau", "unlimited");
    row3.appendChild(ui.capRng); row3.appendChild(ui.capVal); row3.appendChild(el("span", "gtl-knote", "0 = unlimited; the cap queues ready jobs, longest remaining path first"));
    panel.appendChild(row3);
    ui.breakBtn = el("button", "gtl-break", esc(D.settings.broken.label)); ui.breakBtn.type = "button";
    ui.breakBtn.addEventListener("click", function () { state.broken = !state.broken; render(); });
    panel.appendChild(ui.breakBtn);
    ui.board = el("div", "gtl-board"); panel.appendChild(ui.board);
    ui.table = el("div", "gtl-tablewrap"); panel.appendChild(ui.table);
    var det = el("details", "gtl-yaml"); var sum = el("summary", null, "The .gitlab-ci.yml the bench just parsed: "); ui.fileName = el("code"); sum.appendChild(ui.fileName); det.appendChild(sum);
    ui.yaml = el("pre", "gtl-pre"); det.appendChild(ui.yaml); panel.appendChild(det);
    ui.hint = el("p", "gtl-hint"); panel.appendChild(ui.hint);
    var st = selfTest(D);
    panel.appendChild(el("p", "gtl-selftest " + (st.pass ? "is-pass" : "is-fail"), "Self-test on load: " + st.held + " of " + st.total + " properties held" + (st.failed.length ? " (failed: " + esc(st.failed.join("; ")) + ")" : "") + " · planted fault (cycle detection off) " + (st.plantedFaultCaught ? "caught" : "NOT caught") + "."));
    host.appendChild(panel);
    root.GTL_BENCH = {
      setRung: function (id) { var r = D.settings.rungs.filter(function (x) { return x.id === id; })[0]; state.rung = id; state.anti = false; state.custom = false; state.file = r.file; state.ctx = r.ctx === "mix" ? "mr" : r.ctx; state.cap = r.cap; render(); },
      setAnti: function (b) { state.anti = !!b; if (b) { state.ctx = D.settings.anti.ctx; state.cap = D.settings.anti.cap; } render(); },
      setBroken: function (b) { state.broken = !!b; render(); },
      setCtx: function (k) { state.ctx = k; state.custom = true; render(); },
      setCap: function (n) { state.cap = n; state.custom = true; render(); },
      read: function () { return runOne(D, currentFile(), state.ctx, state.cap); },
      ladder: function () { return L0; }, selfTest: st
    };
    render();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})(typeof window !== "undefined" ? window : this);
