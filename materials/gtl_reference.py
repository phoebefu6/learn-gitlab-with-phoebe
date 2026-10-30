#!/usr/bin/env python3
"""Independent Python reference for the pipeline DAG bench (assets/gtl-live.js).

Same taught subset of .gitlab-ci.yml, same rules evaluation, same DAG, same critical-path and
capped list schedule, same scorecard. Prints the whole ladder as JSON so compare-ladder.py can
match it against node running the browser engine BY VALUE. Durations are integer seconds, so
agreement is exact. Standard library only.
"""
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
DEFAULT_STAGES = [".pre", "build", "test", "deploy", ".post"]
GLOBAL_KEYS = {"stages", "variables", "default", "include", "workflow"}
MAPLINE = re.compile(r"^([A-Za-z_.][\w.\-/]*)\s*:(?:\s+(.*)|$)")


# ------------------------------------------------------------------ YAML subset
def strip_comment(line):
    in_s = in_d = False
    for i, c in enumerate(line):
        if c == "'" and not in_d:
            in_s = not in_s
        elif c == '"' and not in_s:
            in_d = not in_d
        elif c == "#" and not in_s and not in_d and (i == 0 or line[i - 1].isspace()):
            return line[:i]
    return line


def split_flow(body):
    items, cur, in_s, in_d = [], "", False, False
    for c in body:
        if c == "'" and not in_d:
            in_s = not in_s
        elif c == '"' and not in_s:
            in_d = not in_d
        if c == "," and not in_s and not in_d:
            items.append(cur)
            cur = ""
        else:
            cur += c
    if cur.strip() != "" or items:
        items.append(cur)
    return [x.strip() for x in items if x.strip() != ""]


def scalar(s):
    s = s.strip()
    if s in ("", "~", "null"):
        return None
    if len(s) >= 2 and s[0] == "'" and s[-1] == "'":
        return s[1:-1].replace("''", "'")
    if len(s) >= 2 and s[0] == '"' and s[-1] == '"':
        return s[1:-1].replace('\\"', '"')
    if s[0] == "[" and s[-1] == "]":
        return [scalar(x) for x in split_flow(s[1:-1])]
    if s == "true":
        return True
    if s == "false":
        return False
    if re.fullmatch(r"-?\d+", s):
        return int(s)
    return s


def parse_yaml(text):
    lines = []
    for n, raw in enumerate(str(text).split("\n")):
        l = strip_comment(raw.rstrip("\r")).rstrip()
        if not l.strip() or l.strip() == "---":
            continue
        lines.append({"indent": len(l) - len(l.lstrip(" ")), "text": l.strip(), "n": n + 1})
    if not lines:
        return {}
    value, nxt = parse_block(lines, 0, lines[0]["indent"])
    if nxt < len(lines):
        raise ValueError("YAML: unexpected indentation at line %d" % lines[nxt]["n"])
    return value


def is_seq_line(t):
    return t == "-" or t.startswith("- ")


def parse_block(lines, i, indent):
    if i >= len(lines):
        return None, i
    if is_seq_line(lines[i]["text"]):
        arr = []
        while i < len(lines) and lines[i]["indent"] == indent and is_seq_line(lines[i]["text"]):
            body = "" if lines[i]["text"] == "-" else lines[i]["text"][2:].strip()
            child = indent + 2
            if body == "":
                if i + 1 < len(lines) and lines[i + 1]["indent"] > indent:
                    v, i = parse_block(lines, i + 1, lines[i + 1]["indent"])
                    arr.append(v)
                else:
                    arr.append(None)
                    i += 1
            elif MAPLINE.match(body) and body[0] != "$":
                lines[i] = {"indent": child, "text": body, "n": lines[i]["n"]}
                v, i = parse_block(lines, i, child)
                arr.append(v)
            else:
                arr.append(scalar(body))
                i += 1
        return arr, i
    obj = {}
    while i < len(lines) and lines[i]["indent"] == indent and not is_seq_line(lines[i]["text"]):
        m = MAPLINE.match(lines[i]["text"])
        if not m:
            raise ValueError("YAML: cannot read line %d: %s" % (lines[i]["n"], lines[i]["text"]))
        key, val = m.group(1), m.group(2)
        if val is None or val == "":
            if i + 1 < len(lines) and lines[i + 1]["indent"] > indent:
                obj[key], i = parse_block(lines, i + 1, lines[i + 1]["indent"])
            else:
                obj[key] = None
                i += 1
        else:
            obj[key] = scalar(val)
            i += 1
    if i < len(lines) and lines[i]["indent"] > indent:
        raise ValueError("YAML: unexpected indentation at line %d" % lines[i]["n"])
    return obj, i


# ------------------------------------------------------------------ merging
def is_map(x):
    return isinstance(x, dict)


def clone(x):
    return json.loads(json.dumps(x))


def deep_merge(base, over):
    if not is_map(base) or not is_map(over):
        return clone(over)
    out = clone(base)
    for k, v in over.items():
        out[k] = deep_merge(out[k], v) if is_map(out.get(k)) and is_map(v) else clone(v)
    return out


def resolve_includes(cfg, files, errors):
    inc = cfg.get("include")
    if inc is None:
        return cfg
    if not isinstance(inc, list):
        inc = [inc]
    merged = {}
    for item in inc:
        name = item if isinstance(item, str) else (item.get("local") or item.get("template") or item.get("remote") or (item.get("file") if item.get("project") else None))
        if name not in files:
            errors.append("include: file '%s' not found" % name)
            continue
        part = parse_yaml(files[name])
        for k, v in part.items():
            merged[k] = deep_merge(merged[k], v) if k in merged else v
    for k, v in cfg.items():
        if k == "include":
            continue
        merged[k] = deep_merge(merged[k], v) if k in merged else v
    return merged


def resolve_extends(cfg, name, seen, errors):
    job = cfg[name]
    if not is_map(job):
        return job
    ext = job.get("extends")
    if ext is None:
        return job
    parents = ext if isinstance(ext, list) else [ext]
    if len(seen) > 11:
        errors.append("extends: more than eleven levels at '%s'" % name)
        return job
    acc = {}
    for p in parents:
        if p in seen:
            errors.append("extends: circular reference at '%s'" % p)
            continue
        if p not in cfg:
            errors.append("extends: '%s' extends '%s' which is not defined" % (name, p))
            continue
        acc = deep_merge(acc, resolve_extends(cfg, p, seen + [p], errors))
    own = clone(job)
    own.pop("extends", None)
    return deep_merge(acc, own)


# ------------------------------------------------------------------ rules
def predefined(ctx):
    v = {"CI_PIPELINE_SOURCE": ctx["source"], "CI_DEFAULT_BRANCH": ctx["default_branch"], "CI_PROJECT_NAME": "penwood-pipelines"}
    if ctx["source"] == "merge_request_event":
        v["CI_MERGE_REQUEST_IID"] = ctx["mr_iid"]
        v["CI_MERGE_REQUEST_TARGET_BRANCH_NAME"] = ctx["target_branch"]
        v["CI_MERGE_REQUEST_SOURCE_BRANCH_NAME"] = ctx["branch"]
        v["CI_COMMIT_REF_NAME"] = ctx["branch"]
    elif ctx.get("tag"):
        v["CI_COMMIT_TAG"] = ctx["tag"]
        v["CI_COMMIT_REF_NAME"] = ctx["tag"]
    else:
        v["CI_COMMIT_BRANCH"] = ctx["branch"]
        v["CI_COMMIT_REF_NAME"] = ctx["branch"]
        if ctx.get("open_mr"):
            v["CI_OPEN_MERGE_REQUESTS"] = "penwood/pipelines!" + str(ctx.get("mr_iid") or "0")
    return v


TOK = re.compile(r"\s*(?:(\(|\))|(&&|\|\||==|!=|=~|!~)|\$\{?([A-Za-z_][A-Za-z0-9_]*)\}?|\"([^\"]*)\"|'([^']*)'|/([^/]*)/([i]*)|(null))")


def tokenize(expr):
    toks, i, s = [], 0, str(expr)
    while i < len(s):
        if s[i].isspace():
            i += 1
            continue
        m = TOK.match(s, i)
        if not m or m.end() == i:
            raise ValueError("rules: cannot read '%s'" % s[i:])
        if m.group(1):
            toks.append(("paren", m.group(1)))
        elif m.group(2):
            toks.append(("op", m.group(2)))
        elif m.group(3):
            toks.append(("var", m.group(3)))
        elif m.group(4) is not None:
            toks.append(("str", m.group(4)))
        elif m.group(5) is not None:
            toks.append(("str", m.group(5)))
        elif m.group(6) is not None:
            toks.append(("re", m.group(6), m.group(7)))
        elif m.group(8):
            toks.append(("null", None))
        i = m.end()
    return toks


def eval_if(expr, variables):
    toks = tokenize(expr)
    pos = [0]

    def peek():
        return toks[pos[0]] if pos[0] < len(toks) else None

    def nxt():
        t = toks[pos[0]]
        pos[0] += 1
        return t

    def value(tok):
        if tok[0] == "var":
            v = variables.get(tok[1])
            return None if v is None else str(v)
        if tok[0] == "str":
            return tok[1]
        if tok[0] == "null":
            return None
        raise ValueError("rules: unexpected token")

    def primary():
        tok = nxt()
        if tok[0] == "paren" and tok[1] == "(":
            r = or_expr()
            close = nxt()
            if close[0] != "paren" or close[1] != ")":
                raise ValueError("rules: missing )")
            return r
        left = value(tok)
        op = peek()
        if op and op[0] == "op" and op[1] in ("==", "!="):
            nxt()
            right = value(nxt())
            return left == right if op[1] == "==" else left != right
        if op and op[0] == "op" and op[1] in ("=~", "!~"):
            nxt()
            rx = nxt()
            if rx[0] != "re":
                raise ValueError("rules: regex expected")
            flags = re.I if "i" in rx[2] else 0
            ok = left is not None and re.search(rx[1], left, flags) is not None
            return ok if op[1] == "=~" else not ok
        return left is not None and left != ""

    def and_expr():
        v = primary()
        while peek() and peek()[0] == "op" and peek()[1] == "&&":
            nxt()
            w = primary()
            v = v and w
        return v

    def or_expr():
        v = and_expr()
        while peek() and peek()[0] == "op" and peek()[1] == "||":
            nxt()
            w = and_expr()
            v = v or w
        return v

    out = or_expr()
    if pos[0] < len(toks):
        raise ValueError("rules: trailing tokens in %s" % expr)
    return bool(out)


def glob_to_re(g):
    out, i = "", 0
    while i < len(g):
        if g[i:i + 3] == "**/":
            out += "(?:.*/)?"
            i += 3
        elif g[i:i + 2] == "**":
            out += ".*"
            i += 2
        elif g[i] == "*":
            out += "[^/]*"
            i += 1
        elif g[i] == "?":
            out += "[^/]"
            i += 1
        else:
            out += re.escape(g[i])
            i += 1
    return re.compile("^" + out + "$")


def changes_match(patterns, changed):
    pats = patterns if isinstance(patterns, list) else (patterns.get("paths") if is_map(patterns) else [patterns])
    return any(glob_to_re(str(p)).match(f) for f in (changed or []) for p in pats)


def eval_rules(rules, variables, ctx):
    for i, r in enumerate(rules):
        if not is_map(r):
            continue
        if "exists" in r:
            raise ValueError("rules:exists is outside the taught subset")
        hit = True
        if "if" in r:
            hit = hit and eval_if(r["if"], variables)
        if hit and "changes" in r:
            hit = hit and changes_match(r["changes"], ctx.get("changed"))
        if hit:
            return {"matched": True, "index": i, "rule": r}
    return {"matched": False, "index": -1, "rule": None}


def rule_text(r):
    parts = []
    if "if" in r:
        parts.append("if: " + str(r["if"]))
    if "changes" in r:
        parts.append("changes: " + json.dumps(r["changes"], separators=(",", ":")))
    if "when" in r:
        parts.append("when: " + str(r["when"]))
    return " · ".join(parts) or "(bare when)"


# ------------------------------------------------------------------ build
def build(D, file_name, ctx, opts=None):
    opts = opts or {}
    errors = []
    try:
        cfg = parse_yaml(D["files"][file_name])
    except ValueError as e:
        return {"ok": False, "file": file_name, "errors": [str(e)], "jobs": [], "stages": []}
    cfg = resolve_includes(cfg, D["files"], errors)
    stages = list(cfg["stages"]) if isinstance(cfg.get("stages"), list) else ["build", "test", "deploy"]
    if ".pre" not in stages:
        stages.insert(0, ".pre")
    if ".post" not in stages:
        stages.append(".post")
    global_vars = cfg["variables"] if is_map(cfg.get("variables")) else {}
    dflt = cfg["default"] if is_map(cfg.get("default")) else {}
    pre = predefined(ctx)
    wf_vars = dict(pre)
    wf_vars.update(global_vars)
    workflow_blocked, workflow_reason = False, None
    if is_map(cfg.get("workflow")) and isinstance(cfg["workflow"].get("rules"), list):
        w = eval_rules(cfg["workflow"]["rules"], wf_vars, ctx)
        if not w["matched"]:
            workflow_blocked, workflow_reason = True, "workflow: no rule matched, so no pipeline is created"
        elif w["rule"].get("when") == "never":
            workflow_blocked, workflow_reason = True, "workflow rule %d says when: never (%s)" % (w["index"] + 1, rule_text(w["rule"]))
    names = [k for k in cfg if k not in GLOBAL_KEYS and not k.startswith(".") and is_map(cfg[k])]
    jobs, by_name = [], {}
    for order, name in enumerate(names):
        job = resolve_extends(cfg, name, [name], errors)
        for k, v in dflt.items():
            job.setdefault(k, v)
        if "script" not in job and "trigger" not in job:
            errors.append("job '%s' has no script" % name)
        stage = "test" if job.get("stage") is None else str(job["stage"])
        if stage not in stages:
            errors.append("job '%s' uses stage '%s' which is not in stages" % (name, stage))
        variables = dict(pre)
        variables.update(global_vars)
        if is_map(job.get("variables")):
            variables.update(job["variables"])
        when = "on_success" if job.get("when") is None else str(job["when"])
        allow_failure = None if "allow_failure" not in job else bool(job["allow_failure"])
        included, reason, rule_index, when_from_rules = True, "no rules: always added", -1, False
        if isinstance(job.get("rules"), list):
            try:
                res = eval_rules(job["rules"], variables, ctx)
            except ValueError as e:
                errors.append("job '%s': %s" % (name, e))
                res = {"matched": False}
            if not res["matched"]:
                included, reason = False, "no rule matched (%d rules checked)" % len(job["rules"])
            else:
                rule_index = res["index"]
                if "when" in res["rule"]:
                    when, when_from_rules = str(res["rule"]["when"]), True
                if when == "never":
                    included, reason = False, "rule %d matched with when: never (%s)" % (res["index"] + 1, rule_text(res["rule"]))
                else:
                    reason = "rule %d matched (%s)" % (res["index"] + 1, rule_text(res["rule"]))
                if "allow_failure" in res["rule"]:
                    allow_failure = bool(res["rule"]["allow_failure"])
        elif when == "never":
            errors.append("job '%s': when: never is only valid inside rules" % name)
        if allow_failure is None:
            allow_failure = (not when_from_rules) if when == "manual" else False
        needs = None
        if job.get("needs") is not None:
            raw = job["needs"] if isinstance(job["needs"], list) else [job["needs"]]
            needs = [({"job": str(n["job"]), "optional": bool(n.get("optional", False)), "artifacts": bool(n.get("artifacts", True))} if is_map(n)
                      else {"job": str(n), "optional": False, "artifacts": True}) for n in raw]
            if len(needs) > 50:
                errors.append("job '%s' needs more than 50 jobs" % name)
        env = job.get("environment")
        j = {"name": name, "order": order, "stage": stage, "stageIndex": stages.index(stage) if stage in stages else -1, "when": when,
             "allowFailure": allow_failure, "needs": needs, "included": included and not workflow_blocked,
             "reason": workflow_reason if workflow_blocked else reason, "ruleIndex": rule_index,
             "duration": D["durations"].get(name, 60), "environment": env.get("name") if is_map(env) else env}
        jobs.append(j)
        by_name[name] = j
    for j in jobs:
        if not j["included"] or not j["needs"]:
            continue
        for n in j["needs"]:
            t = by_name.get(n["job"])
            if not t:
                if not n["optional"]:
                    errors.append("'%s' job needs '%s' job, but '%s' is not defined" % (j["name"], n["job"], n["job"]))
                continue
            if not t["included"]:
                if not n["optional"]:
                    errors.append("'%s' job needs '%s' job, but '%s' is not in the pipeline" % (j["name"], n["job"], n["job"]))
                continue
            if t["stageIndex"] > j["stageIndex"]:
                errors.append("ENGINE RULE: '%s' needs '%s' from a later stage" % (j["name"], n["job"]))
    inc = [j for j in jobs if j["included"]]
    preds = {}
    for j in inc:
        if j["needs"]:
            preds[j["name"]] = [n["job"] for n in j["needs"] if n["job"] in by_name and by_name[n["job"]]["included"]]
        elif j["needs"] is not None:
            preds[j["name"]] = []
        else:
            preds[j["name"]] = [o["name"] for o in inc if o["stageIndex"] < j["stageIndex"]]
    cycle = None if opts.get("ignoreCycles") else find_cycle([j["name"] for j in inc], preds)
    if cycle:
        errors.append("needs: cycle detected " + " -> ".join(cycle))
    return {"ok": not errors, "file": file_name, "ctx": ctx, "errors": errors, "stages": stages, "jobs": jobs, "preds": preds,
            "workflowBlocked": workflow_blocked, "workflowReason": workflow_reason, "includedCount": len(inc)}


def find_cycle(names, preds):
    state, stack = {}, []

    def visit(n):
        if state.get(n) == 2:
            return None
        if state.get(n) == 1:
            i = stack.index(n)
            return stack[i:] + [n]
        state[n] = 1
        stack.append(n)
        for p in preds.get(n, []):
            c = visit(p)
            if c:
                return c
        stack.pop()
        state[n] = 2
        return None

    for n in names:
        c = visit(n)
        if c:
            return c
    return None


# ------------------------------------------------------------------ schedule
def schedule(P, cap):
    out = {"ok": P["ok"], "wall": None, "serial": 0, "ran": [], "skipped": [], "manual": [], "waiting": [], "starts": {}, "criticalPath": [], "cap": cap, "queueTotal": 0}
    for j in P["jobs"]:
        if not j["included"]:
            out["skipped"].append({"job": j["name"], "why": j["reason"]})
    if not P["ok"]:
        return out
    inc = sorted([j for j in P["jobs"] if j["included"]], key=lambda j: (j["stageIndex"], j["order"]))
    by_name = {j["name"]: j for j in inc}
    status = {}
    for j in inc:
        if j["when"] == "manual":
            status[j["name"]] = "manual"
            out["manual"].append(j["name"])
    changed = True
    while changed:
        changed = False
        for j in inc:
            if j["name"] in status:
                continue
            if any(status.get(p) in ("manual", "waiting") for p in P["preds"].get(j["name"], [])):
                status[j["name"]] = "waiting"
                out["waiting"].append(j["name"])
                changed = True
    run = [j for j in inc if j["name"] not in status]
    out["serial"] = sum(j["duration"] for j in run)
    succ = {j["name"]: [] for j in run}
    for j in run:
        for p in P["preds"].get(j["name"], []):
            if p in succ:
                succ[p].append(j["name"])
    tail = {}

    def tail_of(n):
        if n in tail:
            return tail[n]
        best = max([tail_of(s) for s in succ[n]] or [0])
        tail[n] = by_name[n]["duration"] + best
        return tail[n]

    for j in run:
        tail_of(j["name"])
    runners = cap if cap > 0 else (len(run) or 1)
    t, done, running, pending, finish = 0, {}, [], list(run), {}
    while pending or running:
        ready = [j for j in pending if all(p in done for p in P["preds"].get(j["name"], []))]
        ready.sort(key=lambda j: (-tail[j["name"]], j["stageIndex"], j["order"]))
        while len(running) < runners and ready:
            j = ready.pop(0)
            pending.remove(j)
            st = t
            for p in P["preds"].get(j["name"], []):
                st = max(st, finish[p])
            st = max(st, t)
            ready_at = max([finish[p] for p in P["preds"].get(j["name"], [])] or [0])
            out["queueTotal"] += st - ready_at
            out["starts"][j["name"]] = {"start": st, "finish": st + j["duration"], "stage": j["stage"], "queued": st - ready_at}
            running.append((st + j["duration"], j["order"], j))
        if not running:
            break
        running.sort(key=lambda x: (x[0], x[1]))
        fin, _, j = running.pop(0)
        t = fin
        done[j["name"]] = t
        finish[j["name"]] = t
        out["ran"].append(j["name"])
    out["wall"] = max([finish[n] for n in out["ran"]] or [0])
    if out["ran"]:
        cur = sorted(out["ran"], key=lambda n: (-finish[n], by_name[n]["order"]))[0]
        path = [cur]
        while True:
            ps = [p for p in P["preds"].get(cur, []) if p in finish]
            if not ps:
                break
            ps.sort(key=lambda p: (-finish[p], by_name[p]["order"]))
            cur = ps[0]
            path.insert(0, cur)
        out["criticalPath"] = path
    out["ran"].sort(key=lambda n: (out["starts"][n]["start"], by_name[n]["order"]))
    return out


# ------------------------------------------------------------------ ladder
def round2(x):
    return round(x * 100) / 100


def run_one(D, file_name, ctx_key, cap, opts=None):
    P = build(D, file_name, D["contexts"][ctx_key], opts)
    S = schedule(P, cap)
    return {"file": file_name, "ctx": ctx_key, "cap": cap, "ok": P["ok"], "errors": P["errors"], "workflowBlocked": P.get("workflowBlocked", False),
            "includedCount": P.get("includedCount", 0), "wall": S["wall"], "serial": S["serial"], "ranCount": len(S["ran"]), "ran": S["ran"],
            "skipped": S["skipped"], "manual": S["manual"], "waiting": S["waiting"], "starts": S["starts"], "criticalPath": S["criticalPath"], "queueTotal": S["queueTotal"],
            "computeMinutes": None if S["serial"] is None else round2(S["serial"] / 60 * D["settings"]["cost_factor"])}


def scorecard(D, file_name, cap, opts=None):
    mix = D["settings"]["runs_per_month"]
    total, rows, runs = 0.0, {}, 0
    for k in sorted(mix):
        r = run_one(D, file_name, k, cap, opts)
        rows[k] = {"runs": mix[k], "wall": r["wall"], "serial": r["serial"], "computeMinutes": r["computeMinutes"], "ranCount": r["ranCount"], "skipped": len(r["skipped"]), "ok": r["ok"]}
        total += r["computeMinutes"] * mix[k]
        runs += mix[k]
    total = round2(total)
    quota = D["settings"]["free_quota_minutes"]
    return {"rows": rows, "runs": runs, "computeMinutesPerMonth": total, "quota": quota, "quotaShare": round2(total / quota * 100), "fitsQuota": total <= quota}


def false_green(D, broken, good):
    job = D["settings"]["broken"]["job"]
    ran_before, ran_after = job in good["ran"], job in broken["ran"]
    sk = [s for s in broken["skipped"] if s["job"] == job]
    return {"job": job, "ranBefore": ran_before, "ranAfter": ran_after, "pipelineOk": broken["ok"], "isFalseGreen": broken["ok"] and ran_before and not ran_after,
            "why": sk[0]["why"] if sk else None, "rule": D["settings"]["broken"]["rule"], "real": D["settings"]["broken"]["real"], "jobsRun": broken["ranCount"]}


def ladder(D, opts=None):
    out = {"rungs": {}}
    for r in D["settings"]["rungs"]:
        out["rungs"][r["id"]] = scorecard(D, r["file"], r["cap"], opts) if r["ctx"] == "mix" else run_one(D, r["file"], r["ctx"], r["cap"], opts)
    a = D["settings"]["anti"]
    out["anti"] = run_one(D, a["file"], a["ctx"], a["cap"], opts)
    best = out["rungs"]["r2"]
    runs_main = D["settings"]["runs_per_month"]["main"]
    out["anti"]["minutesLostPerRun"] = round2((out["anti"]["wall"] - best["wall"]) / 60)
    out["anti"]["minutesLostPerMonth"] = round2((out["anti"]["wall"] - best["wall"]) / 60 * runs_main)
    out["anti"]["runsCounted"] = runs_main
    good = out["rungs"]["r3"]
    out["broken"] = run_one(D, D["settings"]["broken"]["file"], good["ctx"], good["cap"], opts)
    out["broken"]["falseGreen"] = false_green(D, out["broken"], good)
    out["faults"] = {"cycle": build(D, "fault-cycle.yml", D["contexts"]["main"], opts)["errors"],
                     "missing": build(D, "fault-missing.yml", D["contexts"]["main"], opts)["errors"]}
    return out


def main():
    with open(os.path.join(HERE, "gtl-data.json"), encoding="utf-8") as f:
        D = json.load(f)
    L = ladder(D)
    json.dump(L, sys.stdout, indent=1, sort_keys=True)
    sys.stdout.write("\n")


if __name__ == "__main__":
    main()
