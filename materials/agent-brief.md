# Agent brief - shared by every fan-out page of learn-gitlab-with-phoebe

Filled from `course-builder/references/agent-brief.template.md` on 2026-10-29. Internal build
document: never link it from an audience page.

You are writing ONE static HTML session page. No servers, no npm. **If your target file already
exists on disk, do not write it; report that and stop.** Write the file, return its path and one
line of coverage. No HTML in your reply.

REPO = `/Users/phoebe.fu/Documents/claude_work/github_repo/learn-gitlab-with-phoebe`

## Read first, in this order

1. The template page for YOUR track. Copy its structure, classes, SVG grammar and quiz markup
   EXACTLY, including how many options each question has (FOUR, A to D):
   - Leader: `REPO/courses/a1-one-application-not-six.html`
   - Builder: `REPO/courses/b1-project-issues-boards.html`
2. The source map: every verified fact with its tier, per-session coverage, the seams, the
   constructed Penwood facts and the bench canon. Use ONLY its numbers; never invent a statistic;
   if a fact is missing, teach the uncertainty. `REPO/materials/official-course-map.md`
3. The stylesheet `:root` block (first 30 lines only): `REPO/assets/style.css`
4. For bench numbers and the bench's own words: `REPO/courses/b8-the-pipeline-dag-bench.html` and
   `REPO/materials/canon-ladder.json`. Quote only numbers that page, the map's canon or the widget
   prints. To check a number yourself: `node REPO/materials/run_ladder_node.js`.
5. The YAML the bench parses, if your page shows Penwood's pipeline: `REPO/materials/gtl-data.json`
   key `files` (`penwood.yml`, `with-needs.yml`, `stages-only.yml`, `ci/scan-template.yml`). Quote
   it verbatim or in excerpt; never invent a keyword the map does not list.

## Page skeleton (keep every component)

toolbar (crumb EXACTLY "learn-gitlab-with-phoebe / Leader session N of 6" or "... / Builder
session N of 8", the repo name linked to ../index.html, #toggle-all, #zoom-toggle) · masthead
(eyebrow "Learn GitLab · Leader session N of 6" (or Builder ... of 8), h1 with one
`<span class="accent">`, .sub, .chip-row with the level chip (🟢 Foundational / 🟡 Core /
🟠 Advanced as given in your outline) then two .chip.audience then .chip.time "45 min", .agenda
a1-a4 with flex weights) · main.wrap · section#intro (Part 0: kicker, .lede, .legend pills exactly
as the template, .callout.win "★ What you walk out with tonight.") · 3 Parts, each
`section.section#part-N` with section-kicker (klabel "Part N · covers ...", h2 EXACTLY as your
outline gives it, `.tag.concept "N min live"`), a `.lede`, ONE figure, `details.card` accordions
(summary: `.mode.live` or `.mode.self`, title, `.mini`, `.caret ▶`), at least one
`.callout.example` with `span.ex-pill` "Real world" on the page · section#demo-1 Build-along
(kicker `.tag.demo "★ 20 min · everyone builds"` for Leader, `"★ 22 min · everyone builds"` for
Builder, .lede, ONE figure, `.steps > .step`, each with a `<p>` and, where there is YAML, a command
or a template, a `.prompt-box.good` with a `span.label` BELOW the p; one `.prompt-box.bad` after
the steps) · section#exercise Homework (ol, 4 items) · section#quiz (the line "Clear all three and
Leader session N gets stamped in your passport." then 3 x `.quiz-q data-answer="0-based"`,
`p.qtext` numbered "1 · ...", FOUR `button.qopt` "A · ..." to "D · ...", `p.qwhy`; one
`p.quiz-score` after the last; vary the correct letter) · section#official, h2 EXACTLY "What this
session teaches, and where it came from", `.covered > .covered-row` (pill solid ✓ / light ◐ + name
+ note), then the `.mono` line EXACTLY "Every fact on this page, and its verification tier, is
recorded in the course's source map." · section.cheat#cheatsheet (h3 "Leader session N cheat sheet
<span>· pin this</span>" or "Builder session N cheat sheet ...", .grid-2 of six .cheat-item) ·
`.callout.next` with `.nx-pill` "Next session" · footer.pagefoot inside main, as in the template ·
`<script src="../assets/app.js?v=1"></script>`.

Head: the template's social meta block with this page's own title/description/url (og:image stays
assets/og-cover.png); `<title>Leader session N · Title - learn gitlab with phoebe</title>`
(Builder: "Builder session N · Title - ..."); `<link rel="stylesheet" href="../assets/style.css?v=1">`.
Nothing else external.

First `details.card` in the FIRST Part is `open`; no other. Sentence case headings. Warm
practitioner voice, concrete, never dry. Inside prompt-boxes escape `&` `<` `>`. 450 to 650 lines
is guidance about depth, never a target: never collapse whitespace, dissolve a list into a
paragraph, or drop a component to fit.

## Hard rules (a violation is rework)

- NEVER an em dash or en dash, anywhere (prose, code, aria-labels, comments). Hyphen only.
- No meta text: never "this course", "in this course", "the course teaches", "banned here". State
  the professional norm directly with its reason. The two exact estate phrases above are the only
  self-references; "session 5" cross-references are fine.
- Attribution "by Phoebe Fu". Never "built with" a tool.
- Every number comes from the map or the bench, or is labelled constructed. For constructed data
  print "your numbers will differ", never invented outputs as if run. Shell or YAML output you
  print on a Builder page must be either the bench's own printout (canon) or labelled "what you
  should see, roughly"; nothing here runs GitLab for real.
- **Tier facts are dated.** Every tier number (400 compute minutes, 5 users per private top-level
  group, 10 GiB per project, $29 Premium) carries "as of 2026-10-29" on first use on the page and
  the line "re-verify the tier page before relying on it" once per page. Only the map's numbers.
- **Paid features are shown, labelled by tier, never required.** Epics, required approval rules,
  code owners approval, protected environments, compliance frameworks, assignee and milestone
  board lists, group-level protected branches: say "Premium and Ultimate" and give the Free way.
- **GitLab is the taught product**: name it freely. **No other vendor is recommended**: say "a
  container runtime", "a cloud object store", "an orchestrator", "a chat tool". GitHub may be
  NAMED only inside the seam sentence that links the two GitHub courses. No named incidents.
- **Never draw the GitLab logo or the tanuki, and no fox of any kind.** Draw mechanisms.
- Contested or missing evidence: teach the disagreement; never resolve what the docs did not.
  Where the map says a behaviour is an ENGINE RULE, say "the bench's convention", not "GitLab".
- Citations in the exact form of the map's appendix; anything the map marks REPORTED is "reported".
- NEVER "lottery" or "lotteries"; say the mechanism ("decided by definition order", "a random
  draw"). Default to the English word; any Chinese term carries its English in brackets.
- **Penwood is CONSTRUCTED**: say so on the page (masthead .sub and wherever its numbers appear).
- Titles, widget ids and class names must not collide with siblings: never any `tw-`, `dag-`,
  `de-`, `fo-` class; never the id `gtl-bench` outside b8; never the h2 "Orchestration: pipelines
  as code" (learn-dataops) or "SLIs for one pipeline" (learn-data-reliability). Use only classes
  that exist in the template pages and style.css; invent none.
- **Seams: link, never re-teach** (absolute URLs below). What a repo, issue or pull request is:
  learn-github. Git itself, branching, conflicts, Actions: learn-github-for-builders. What to
  test and SLOs: learn-dataops and learn-data-reliability. Containers: the planned Docker course
  (say "a later course"). Say which side this page takes, in one line, then link.

## Figure grammar (hand-drawn, every figure)

Palette, ONLY these hexes (no invented greys): `#6B4FBB` (accent, hachure line) `#483698` (deep,
for .V values and dark fills with white text) `#927CD7` (mid) `#C9BEEF` (soft) `#F4F0FC`
(accent-50 fill) `#1F1633` (ink) `#5A5176` (muted) `#CFC8E3` (faint) `#E9E5F4` (hairline)
`#FC6D26` (tanuki orange: the ONE thing the figure is about; ALWAYS ink text on it, never white)
`#9E3811` (orange ink, .B text on white or pale fills) `#FFEBDD` (orange tint) `#FBFAFE` (paper)
`#6A6187` · `#FFFFFF` · universal reds `#991B1B` `#FEF2F2` `#FCA5A5` only for a wrong-way,
failing, excluded or false-green panel.

- `<figure class="zoomable">` > `<svg viewBox="0 0 880 H" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="the data, not the
  shape">` > `<defs>` + `<style>` + content, then `<figcaption>🔍 Click to zoom - takeaway</figcaption>`.
  Grow H, never W.
- Prefix unique per figure, used for every class and id: `<page><letter>`, e.g. `a2a`, `a2b`,
  `b3c` (so ids `a2aSk`, `a2aHc`, `a2aAr`; classes `.a2aH`, `.a2aL`...). Never reuse a prefix.
- `<defs>` holds three things with the figure prefix P: a wobble filter `id="PSk"`
  (`feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="2" seed="<int>"` +
  `feDisplacementMap scale="2.4" xChannelSelector="R" yChannelSelector="G"`, `x="-3%" y="-3%"
  width="106%" height="106%"`), a hachure pattern `id="PHc"` (7x7 userSpaceOnUse, rotate(-38), one
  `#6B4FBB` line, opacity .5), an open arrowhead `id="PAr"` (path `M1 1 L9 5 L1 9`, fill none, ink
  stroke 1.6). ALL shapes sit inside ONE `<g filter="url(#PSk)" fill="none" stroke="#1F1633"
  stroke-width="2" stroke-linecap="round" stroke-linejoin="round">`; rects carry a tiny rotation
  (-4 to 4 degrees for hand-placed items, under 1 for panels). Fills: white, `#F4F0FC`, the
  hachure for "the pile" or "the data", and orange ONLY for the one thing the figure is about. One
  doodle anchor per figure, simple strokes, never a mascot. Text classes: `.PH` 800 12px ink
  heading · `.PL` 600 12px ink label · `.PS` 400 11px muted · `.PB` 800 11px `#9E3811` · `.PV` 800
  16-20px `#483698` value · `.PW` 800 12px white ONLY on a `#483698` or `#6B4FBB` fill (NEVER on
  orange, the hachure or a pale fill) · `.PA` 700 11px `#483698` axis caption · `.PN` 400 12px muted
  note · `.PR` 800 11px `#991B1B` for failing or excluded. On an orange fill use .PL/.PH (ink),
  never .PS muted. Hand-stacked items must not overlap as painted rects (the gate flags a pile).
- ALL `<text>` OUTSIDE the filtered group, Inter sans stack, never below 10.5px.
- Fit: max chars ≈ (box width - 20) / 7 at 12px, 6.4px/char at 11px; full-width note under 110
  chars; 40px between neighbouring point labels; bottom note 22px below the last row, H clears it
  by 8px. Arrows and curves must not run through labels. When in doubt, shorten.
- Floor: one figure per Part plus one in the build-along (4 figures). Draw the MECHANISM (a job
  waiting on a stage boundary, a needs edge skipping the stage, a rule being evaluated top to
  bottom and stopping, a variable resolving by precedence, a cache miss, a role inherited down the
  group tree, a protected branch refusing a push, an image path mirroring the project path), never
  a metaphor literally, never decoration, never a logo.

## Voice and honesty

Every Part gets a `.callout.example` "Real world" story: either a documented GitLab behaviour from
the map (the duplicate-pipeline trap and `workflow:rules`; the missing-needs error text; the
read-only namespace over five users; the orange "passed with warnings" of `allow_failure`) or a
constructed Penwood case that SAYS "constructed" in the text. Honest limits: durations and the run
mix are constructed; the runner cap is an assumption; tier figures are dated; the bench runs
nothing on GitLab, it parses and schedules the YAML.

## Cross-links (absolute URLs)

- GitHub for non-coders: https://phoebefu6.github.io/learn-github-with-phoebe/ ; issues
  courses/03-issues-and-projects.html ; branches and PRs courses/04-branches-and-prs.html
- GitHub for builders: https://phoebefu6.github.io/learn-github-for-builders-with-phoebe/ ; git
  courses/01-git-under-the-hood.html ; daily loop courses/02-the-daily-loop.html ; conflicts
  courses/04-merge-conflicts.html ; Actions courses/05-actions-authoring.html
- DataOps testing: https://phoebefu6.github.io/learn-dataops-with-phoebe/courses/b3-data-testing-contracts.html
- Data reliability SLIs: https://phoebefu6.github.io/learn-data-reliability-with-phoebe/courses/b1-slis-for-one-pipeline.html
- Tech writing docs-as-code: https://phoebefu6.github.io/learn-tech-writing-with-phoebe/courses/07-docs-as-code.html
- GitLab Docs pages: the exact URLs in the map's appendix, linked by name ("GitLab Docs, CI/CD YAML
  syntax reference"), opened in the same tab.
- Hub: https://phoebefu6.github.io/learn-with-phoebe/

## Footer chains and session titles

Footer left: "Leader session N of 6 · learn-gitlab-with-phoebe · by Phoebe Fu &nbsp;·&nbsp; 📚 <a href="https://phoebefu6.github.io/learn-with-phoebe/">Learn with Phoebe ↗</a>" (Builder: "Builder session N of 8 ...").
Footer right: `<a href="PREV.html">← Prev: Title</a> &nbsp;·&nbsp; <a href="NEXT.html">Next: Title →</a>`.

Leader chain (exact titles, one accent span in the h1):
a1-one-application-not-six.html "One application, not six" ·
a2-saas-or-self-managed.html "SaaS or self-managed" ·
a3-groups-projects-permissions.html "Groups, projects and permissions" ·
a4-reading-a-pipeline.html "Reading a pipeline like a manager" ·
a5-governance-without-friction.html "Governance without friction" ·
a6-the-90-day-migration.html "The 90-day migration plan" (last Leader page: right side
"← Prev: ..." and "Next track: Builder session 1 →" linking b1-project-issues-boards.html).

Builder chain:
b1-project-issues-boards.html "Project, issues, boards" ·
b2-the-merge-request.html "The merge request" ·
b3-first-gitlab-ci-yml.html "Your first .gitlab-ci.yml" ·
b4-variables-artifacts-cache.html "Variables, artifacts, cache" ·
b5-rules-needs-dag.html "Rules, needs and the DAG" ·
b6-environments-deployments.html "Environments and deployments" ·
b7-registry-and-templates.html "Container registry and templates" ·
b8-the-pipeline-dag-bench.html "The pipeline DAG bench" (last page: "← Prev" and "Course home").

## One-line outlines (the main thread expands each into the fan-out prompt)

Part h2s below are the knowledge-map concepts on the landing page; keep their meaning.
- **a2 SaaS or self-managed** (🟡 Core): Part 1 "Three ways to run GitLab" (GitLab.com, Self-Managed,
  Dedicated; who patches, who pays, who holds the data; figure: the same application in three
  hosting boxes with the operator's duties drawn as arrows) · Part 2 "Hosted runners or your own"
  (instance runners enabled by default on GitLab.com; group and project runners; compute minutes
  measure instance runners; cost factors 1/2/3) · Part 3 "What Free gives and withholds" (400
  minutes, 5 users on a private top-level group, 10 GiB per project, dated; Penwood's 1,803.8
  minutes a month from the scorecard do not fit) · Build-along: a one-page hosting decision for
  Penwood with the quota arithmetic filled from the canon.
- **a3 Groups, projects and permissions** (🟡 Core): Part 1 "The tree" (top-level group, subgroup,
  project; visibility cannot rise down the tree; three top-level groups for new Free accounts) ·
  Part 2 "Eight roles, one rule" (Guest to Owner; "users always retain the permissions for their
  highest role"; a subgroup role cannot be lower than the parent's) · Part 3 "Five seats" (the
  Free limit counts unique users across the whole tree; over it the namespace is read-only; the
  sixth Penwood person: public group, Premium, or a personal namespace, with the trade-offs) ·
  Build-along: Penwood's access matrix (5 people x group, subgroup, project).
- **a4 Reading a pipeline like a manager** (🟠 Advanced): Part 1 "Stages are a queue" (r1: 30:08
  because the 894 s backfill in `test` holds `publish`; jobs in a stage run together, the next
  stage waits) · Part 2 "Three clocks" (wall 26:22, serial 66:18, compute minutes 66.30 on r2; which
  one the team feels, which one the bill counts) · Part 3 "Green is not proof" (the break button:
  7 jobs instead of 8, passed; a job never added cannot fail; the `merge_request` typo) ·
  Build-along: read Penwood's r3 job table and write the three questions to ask the team.
- **a5 Governance without friction** (🟠 Advanced): Part 1 "The branch is the control point" (the
  default branch is protected by default; Maintainers push and merge; Developers open merge
  requests; force push off) · Part 2 "What Premium adds, and the Free substitute" (required
  approvals, code owners approval, protected environments, compliance frameworks: Premium and
  Ultimate; on Free approvals are optional, CODEOWNERS is documentation, a blocking manual job
  gates production) · Part 3 "Masked is not secret" (protected and masked variables; "not a
  guaranteed way"; YAML variables are visible to everyone with repo access) · Build-along: Penwood's
  one-page control list with the tier of each control.
- **a6 The 90-day migration plan** (🟠 Advanced): Part 1 "Days 1-30: repo, issues, board" · Part 2
  "Days 31-60: the pipeline, with the quota in view" (scorecard: 24 x 41.17 + 12 x 49.25 + 4 x
  56.18 = 1,803.8 minutes, 450.95% of 400; the levers: `rules:changes`, fewer scheduled runs,
  runners the quota page does not measure, or Premium) · Part 3 "Days 61-90: registry,
  environments, the exit criteria" · Build-along: the plan on one page with a go/no-go per block.
- **b2 The merge request** (🟡 Core): Part 1 "Same idea, different name" (what the MR page shows:
  description, changes, pipelines, comments, commits; link learn-github for what a PR is) · Part 2
  "Approvals on Free are optional" (Developer+ can approve; "don't prevent merging"; required rules
  are Premium) · Part 3 "The merge request pipeline" (`merge_request_event`; runs on the source
  branch only; the `merge request` label; `CI_COMMIT_BRANCH` unset) · Build-along: open Penwood's
  first MR from `feature/orders-dedupe`, read its pipeline tab against the r3 job table.
- **b3 Your first .gitlab-ci.yml** (🟡 Core): Part 1 "Stages, jobs, script" (default stages;
  missing stage lands in test; `script` required) · Part 2 "The first green" (stages-only.yml from
  the data file, in excerpt; r1 canon: 13 jobs, 30:08, 66.30 compute minutes) · Part 3 "What a
  minute costs" (cost factor 1 on Linux small; 400 a month on Free, dated) · Build-along: write
  Penwood's lint and build stages by hand, then compare with stages-only.yml.
- **b4 Variables, artifacts, cache** (🟠 Advanced): Part 1 "Where a variable comes from"
  (precedence list from the map; job beats global beats predefined; protected and masked) · Part 2
  "Artifacts move results forward" (later stages download by default; latest successful pipeline
  kept; 1 GB compressed on GitLab.com; `expire_in` unset means the instance default, number not
  quoted) · Part 3 "Cache is a hope, not a promise" ("isn't guaranteed to always work";
  dependencies vs intermediate results) · Build-along: add `artifacts:paths` to compile-models and
  a `cache` keyed on `requirements.txt` to the test jobs.
- **b5 Rules, needs and the DAG** (🟠 Advanced): Part 1 "First match wins" (rules evaluated in
  order; no match, not added; `when: never`; the duplicate-pipeline trap and `workflow:rules`) ·
  Part 2 "Needs skip the queue" (r1 30:08 to r2 26:22; `needs: []`; the critical path) · Part 3
  "The job that is not there" (missing-needs error text; `optional: true` on publish-docs; r3's six
  never-added jobs) · Build-along: add needs and rules to the b3 file and read r2 and r3 off the
  bench.
- **b6 Environments and deployments** (🟠 Advanced): Part 1 "An environment is a name on a job"
  (`environment:name`, url, created on first use; tier guessed from the name) · Part 2 "Stop it on
  purpose" (`on_stop`, `action: stop`, `auto_stop_in` hourly) · Part 3 "The blocking manual gate"
  (`when: manual` inside rules: `allow_failure` false, pipeline blocked; protected environments as
  the Premium version) · Build-along: Penwood's deploy-staging and deploy-production jobs.
- **b7 Container registry and templates** (🟠 Advanced): Part 1 "The project's own registry"
  (path mirrors the project path; `CI_REGISTRY_IMAGE`; `docker login` with the job's credentials;
  containers themselves belong to a later course) · Part 2 "Include, then extend" (`include:local`
  for `ci/scan-template.yml`; `.dependency-scan` hidden job; `extends` reverse deep merge; main
  file wins) · Part 3 "Templates GitLab ships" (`include:template`, Free SAST on the pricing page;
  150 nested includes) · Build-along: Penwood's build-image and publish-image jobs plus the
  included scan.

## Before you return

Self-check your file: `grep -c '—\|–'` must be 0; `<details` count equals `</details>`;
`<section` equals `</section>`; `<figure` equals `</figure>`; `<text` equals `</text>`; no vendor
recommended; no fox or logo; every hex inside figures is in the palette list; every tier number
carries its date; every number appears in the map or on the bench page.
