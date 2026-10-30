# Official course map - learn-gitlab-with-phoebe

"Learn GitLab". Bucket `prog`, two tracks: Leader a1-a6 (no code) and Builder b1-b8 (bench at b8).
Skeleton approved by Phoebe 2026-10-29. Internal build document: never link it from an audience
page. Every fact a page prints must be in this file with its tier, or be a bench number listed
under "Canon". Sources were read on **2026-10-29**; GitLab ships monthly, so **re-verify the
pricing, user-limit and compute-minutes pages before delivery**, and the YAML reference for any
keyword a page quotes.

Evidence tiers:
- **READ AT SOURCE** - read in the GitLab document on 2026-10-29 (URL in the appendix).
- **REPORTED** - not read at source; say "reported" on the page or do not quote.
- **ENGINE RULE** - a convention the bench adopts where the docs did not fix a behaviour; label it
  on the page as the bench's convention, never as GitLab's behaviour.
- **CONSTRUCTED** - invented for Penwood; say "constructed" on the page.
- **MEASURED (bench)** - printed by `assets/gtl-live.js`, matched by value by
  `materials/gtl_reference.py` (`materials/compare-ladder.py`, 488 values, exit 0).

## The angle

GitLab taught as what it ADDS over "git plus a host": one application for planning, code,
CI/CD, registry and security, with the trade-offs that come with it (one vendor's model of the
work, one bill, one blast radius). GitLab is the taught product and is named freely. **No other
vendor is recommended**; name tool classes ("a container runtime", "a cloud object store", "an
orchestrator"). No named incidents or outages. GitLab's own framing is quoted as GitLab's claim.

## The running case: Penwood (CONSTRUCTED)

A constructed logistics-analytics team of five moving its data pipelines (ingest, compile models,
quality tests, publish an image, deploy to a staging and a production environment) onto
**GitLab.com's Free tier**. Labelled constructed on every page. Everything the build-alongs do
runs on a free account; paid features are shown, labelled by tier, never required.

Constructed facts pages may use (all from `materials/build_gtl_data.py`):
- Five people: a data lead (Owner), two analytics engineers (Maintainer, Developer), one analyst
  (Developer), one finance partner (Reporter). Five fits the Free tier's private top-level group
  limit exactly (READ AT SOURCE below); a sixth person is the a3 and a6 problem.
- Top-level group `penwood`, subgroup `data`, project `pipelines`. Default branch `main`.
- Pipeline: 14 jobs in 5 stages (`lint`, `build`, `test`, `publish`, `deploy`):
  lint-yaml, lint-sql, build-image, compile-models, docs-build, unit-tests, data-quality-tests,
  integration-tests, scan-dependencies (via `include` + `extends .dependency-scan`),
  nightly-backfill (schedule only), publish-image, publish-docs, deploy-staging,
  deploy-production (`when: manual` inside rules, so blocking).
- Job durations (seconds, median of a constructed seeded 20-run log): lint-yaml 45 · lint-sql 107
  · build-image 382 · compile-models 192 · docs-build 129 · unit-tests 303 · data-quality-tests 478
  · integration-tests 730 · scan-dependencies 233 · nightly-backfill 894 · publish-image 245 ·
  publish-docs 60 · deploy-staging 180 · deploy-production 183.
- Monthly run mix (constructed): 24 merge-request pipelines, 12 pushes to main, 4 schedules = 40.
- Contexts the bench offers: merge request from `feature/orders-dedupe` with `pipelines/` changed;
  merge request with only `docs/` changed; push to main; push to a feature branch with an open
  merge request (the workflow rule stops the duplicate); nightly schedule on main.

## Per-session coverage

### Leader track (no code)
| File | Title | Owns | Sources (tier) |
|---|---|---|---|
| a1-one-application-not-six.html | One application, not six | What GitLab adds over git plus a host; GitLab's own "one platform" framing as a claim; the five surfaces Penwood touches (plan, code, CI/CD, registry, security) and the trade-off of one vendor | about.gitlab.com/platform self-description (READ AT SOURCE); pricing page Free tier facts (READ AT SOURCE); issue boards Free (READ AT SOURCE); bench r1 vs r2 (MEASURED) |
| a2-saas-or-self-managed.html | SaaS or self-managed | GitLab.com vs GitLab Self-Managed vs Dedicated as a decision; hosted runners vs your own runners; what the Free tier gives and withholds | pricing + compute minutes + storage pages (READ AT SOURCE); runner docs (READ AT SOURCE) |
| a3-groups-projects-permissions.html | Groups, projects and permissions | Top-level group, subgroups, projects; roles Guest to Owner; inheritance down the tree; the 5-user Free limit as Penwood's constraint | groups, subgroups, permissions, free user limit pages (READ AT SOURCE) |
| a4-reading-a-pipeline.html | Reading a pipeline like a manager | Stages, jobs, needs and rules read from the graph; wall clock vs serial vs compute minutes; what "passed" does and does not prove | YAML reference, pipeline architectures (READ AT SOURCE); bench r1-r4 and break (MEASURED) |
| a5-governance-without-friction.html | Governance without friction | Protected branches and the merge request as the control point on Free; what Premium adds (required approvals, code owners, protected environments) and when it is worth it; the free substitutes (branch rules, CODEOWNERS as documentation, environments) | protected branches, approvals, code owners, protected environments, compliance frameworks pages (READ AT SOURCE, tier badges) |
| a6-the-90-day-migration.html | The 90-day migration plan | Moving Penwood in three 30-day blocks: repo and issues, pipeline, registry and environments; the quota arithmetic; the exit criteria; when to pay | scorecard r5 (MEASURED); pricing and compute minutes (READ AT SOURCE) |

### Builder track
| File | Title | Owns | Sources (tier) |
|---|---|---|---|
| b1-project-issues-boards.html | Project, issues, boards | Create the group and project on Free; issues, labels, a label-list board; what dragging a card does; milestone and assignee lists as Premium | groups, issue boards pages (READ AT SOURCE); learn-github owns what an issue is |
| b2-the-merge-request.html | The merge request | The MR vs the pull request: same idea, GitLab's deltas (draft, approvals optional on Free, "pipelines must succeed", merge request pipelines and the `merge_request_event` source) | merge requests, approvals, merge request pipelines pages (READ AT SOURCE) |
| b3-first-gitlab-ci-yml.html | Your first .gitlab-ci.yml | `stages`, `stage`, `script`, `image`, `default`; default stages; a job without a stage lands in test; the first green pipeline; compute minutes per run | YAML reference (READ AT SOURCE); bench r1 (MEASURED) |
| b4-variables-artifacts-cache.html | Variables, artifacts, cache | Variables in YAML vs settings, precedence, protected and masked; artifacts pass results forward and expire; cache is best effort for dependencies | variables, artifacts, caching pages and YAML reference (READ AT SOURCE) |
| b5-rules-needs-dag.html | Rules, needs and the DAG | `rules` first-match semantics, `when`, `workflow:rules` against duplicate pipelines; `needs` and the DAG; the missing-needs error and `optional: true` | YAML reference, job rules, needs, job control, pipeline architectures (READ AT SOURCE); bench r2-r3 (MEASURED) |
| b6-environments-deployments.html | Environments and deployments | `environment:` on a job, static vs dynamic, tiers guessed from the name, `on_stop` and `auto_stop_in`, a blocking manual deploy; protected environments shown as Premium | environments, protected environments pages, job control (READ AT SOURCE) |
| b7-registry-and-templates.html | Container registry and templates | The project's container registry on Free, `docker login` with the job's own credentials, `CI_REGISTRY_IMAGE`; `include` (local, project, template) and `extends` with hidden jobs; what containers themselves are is the planned Docker course's job | container registry, registry authentication, includes pages and YAML reference (READ AT SOURCE) |
| b8-the-pipeline-dag-bench.html | The pipeline DAG bench | The whole ladder, the anti-lever, the break button, the scorecard | All canon below |

## Seams (absolute links, never reteach; say which side we take)

- `learn-github` owns what a repository, an issue and a pull request are for non-coders:
  https://phoebefu6.github.io/learn-github-with-phoebe/ (01-meet-github, 03-issues-and-projects,
  04-branches-and-prs). We take: GitLab's deltas only (merge request vs pull request, boards).
- `learn-github-for-builders` owns git internals, the daily loop, branching, conflicts, Actions:
  https://phoebefu6.github.io/learn-github-for-builders-with-phoebe/ (01-git-under-the-hood,
  02-the-daily-loop, 04-merge-conflicts, 05-actions-authoring). We take: `.gitlab-ci.yml` vs a
  workflow file, nothing about git itself.
- `learn-dataops` owns what to test and data contracts:
  https://phoebefu6.github.io/learn-dataops-with-phoebe/courses/b3-data-testing-contracts.html.
  `learn-data-reliability` owns SLIs and SLOs:
  https://phoebefu6.github.io/learn-data-reliability-with-phoebe/courses/b1-slis-for-one-pipeline.html.
  We take: WHERE the pipeline runs them (a test job, a rule, a stage), never what a good test is.
- `learn-docker-containers` (planned) will own containers and images; b7 shows the registry only.
- `learn-command-line` (planned) owns the shell. `learn-tech-writing` owns docs:
  https://phoebefu6.github.io/learn-tech-writing-with-phoebe/courses/07-docs-as-code.html.

## Verified facts

### GitLab.com tiers and limits (READ AT SOURCE 2026-10-29; re-verify before delivery)
- Pricing page: Free "$0 per user/month, No credit card required" (the FAQ says a card is required
  to use GitLab.com shared runners); **400 compute minutes per month**; "10 GiB adjustable
  storage"; **"5 users per top-level group"** (FAQ: private top-level groups on GitLab.com Free);
  Free includes "Source Code Management & CI/CD" and "Static Application Security Testing".
  Premium **$29 per user/month billed annually**, 10,000 compute minutes, 500 GiB. Ultimate: custom
  pricing, 50,000 compute minutes. The included "GitLab Credits" are a promotional offer.
- Free user limit page: "You can add up to five users to newly created top-level namespaces with
  private visibility on GitLab.com"; every unique user across the group, its subgroups and
  projects counts; over the limit the namespace is **read-only** ("placed in a read-only state").
  Personal namespaces and public top-level groups are exempt. Accounts created after
  2026-01-27 on Free are limited to **three top-level groups**.
- Storage quotas page: "Each project in a Free tier namespace on GitLab.com has 10 GiB of free
  storage"; only the repository and LFS count; the container registry, package registry and
  artifacts are excluded; a project over 10 GiB becomes read-only unless storage is purchased.
- Compute minutes page: "Free tier namespaces receive 400 compute minutes per month"; usage
  "resets to `0` for all namespaces on the first day of each month"; cost factor **1** for Linux
  x86-64 small and Arm64 small, 2 medium, 3 large, 6 xlarge, 12 2xlarge; "The usage of instance
  runners ... is measured in compute minutes"; the page suggests "Use private runners for some
  jobs" to reduce usage but does not state that your own runners are exempt (so do not claim it;
  say "the quota page measures instance runners").
- Enforcement when over quota: the page says only "Enforcement measures are applied when you
  exceed your quota" and links elsewhere. Do not describe the enforcement.

### CI/CD YAML semantics (READ AT SOURCE: YAML reference, needs, job rules, job control)
- Default stages `.pre`, `build`, `test`, `deploy`, `.post`; "Jobs in the same stage run in
  parallel"; the next stage starts only after the previous stage's jobs succeed; a job without
  `stage` uses `test`; a pipeline with only `.pre`/`.post` jobs does not run.
- `needs`: "An array of jobs (maximum of 50 jobs)"; you can refer to jobs in the same stage;
  `needs: []` starts the job "as soon as the pipeline is created"; `optional: true` lets a needed
  job be absent; otherwise a needed job missing from the pipeline fails pipeline creation with
  "'unit_tests' job needs 'compile' job, but 'compile' does not exist in the pipeline";
  `artifacts: true` is the default for needs. Architectures page: needs lets jobs "run as fast
  as possible, even starting earlier than other jobs in the same stage"; basic pipelines are
  "easier to maintain" but "not the most efficient".
- `rules`: "Rules are evaluated in order until the first match"; "If no rules match, the job is
  not added to the pipeline"; a matching rule with `when: never` excludes the job; a matching rule
  with no `when` uses the job's `when`, default `on_success`; `rules:changes` compares with the MR
  target branch in merge request pipelines and with the previous commit in branch pipelines, and
  is always true on new branches or without a push event; `rules:exists` is outside the taught
  subset. Duplicate pipelines: a final bare `when` rule can start a branch and a merge request
  pipeline on the same push; the fix is `workflow:rules`. `CI_PIPELINE_SOURCE` is
  `merge_request_event` for merge request pipelines and `push` for pushes.
- `when`: `on_success` (default), `on_failure`, `always`, `never` (rules and workflow only),
  `manual`, `delayed` (`start_in`, 1 second to 1 week). Manual jobs: `allow_failure` defaults to
  `true` for `when: manual` outside rules (pipeline can succeed) and `false` inside rules
  (blocking: "The pipeline stops at the stage where the job is defined", status **blocked**).
- `allow_failure: true`: an orange warning, pipeline still passes; `allow_failure:exit_codes`.
- `extends`: "reverse deep merge based on the keys", values of keys are not merged, up to eleven
  levels, avoid more than three; multiple parents allowed.
- `include`: `local`, `project`, `remote`, `template`; includes are evaluated first and merged with
  `.gitlab-ci.yml`, which "takes precedence"; between includes the last one wins; up to 150
  includes; 30 seconds to resolve; `include:project` preferred over remote URLs.
- `artifacts`: "By default, jobs in later stages automatically download all the artifacts created
  by jobs in earlier stages"; collected from successful jobs by default; `expire_in` unset means
  the instance default (**the page does not state a number; do not quote 30 days**); artifacts of
  the latest successful pipeline per ref are kept; GitLab.com limit "1 GB compressed" per archive.
- `cache`: "Caching is an optimization, but it isn't guaranteed to always work"; for
  "dependencies, like packages you download from the internet"; artifacts "pass intermediate build
  results between stages"; key default `default`, max four caches per job; stored where the runner
  is, uploaded to object storage with distributed cache; not shared between protected and
  unprotected branches by default.
- `variables`: job variables override global defaults; precedence (highest first): policy
  variables, manual job variables, pipeline variables, project, group, instance, dotenv reports,
  YAML variables (`rules:variables`, job, `workflow:rules:variables`, default), deployment
  variables, predefined. "Variables saved in the `.gitlab-ci.yml` file are visible to all users
  with access to the repository." Protected variables go only to pipelines on protected branches
  or tags. Masked values: one line, no spaces, 8+ characters, printed as `[MASKED]`; masking "is
  not a guaranteed way to prevent malicious users from accessing variable values".
- `workflow:rules`: "When no rules evaluate to true, the pipeline does not run"; `when` only
  `always` or `never`.
- `parallel` 1 to 200; `retry` 0 (default), 1 or 2; `tags`: a runner "must be assigned every tag
  listed in the job", fewer than 50; `script` required for all jobs except trigger jobs;
  `image`: the job's image overrides `default:image`. Timeout default: NOT read; do not quote.
- Predefined variables: `CI_COMMIT_BRANCH` "Available in branch pipelines, including pipelines
  for the default branch", not set in merge request or tag pipelines; `CI_COMMIT_TAG` only in tag
  pipelines; `CI_MERGE_REQUEST_IID`, `CI_MERGE_REQUEST_TARGET_BRANCH_NAME`; `CI_COMMIT_REF_NAME`
  "The branch or tag name for which project is built"; `CI_REGISTRY_IMAGE` "Base address for the
  container registry", set only when the registry is enabled; `CI_ENVIRONMENT_NAME` set when the
  job has `environment:name`.
- Merge request pipelines: `.gitlab-ci.yml` "must include job rules or workflow rules that match"
  `CI_PIPELINE_SOURCE == "merge_request_event"`; they "Run on the contents of the source branch
  only"; they "Display a `merge request` label in pipeline lists".

### Platform facts (READ AT SOURCE)
- Roles, fewest to most: Minimal Access, Guest ("View and comment on issues and epics. Cannot push
  code"), Planner, Reporter ("View code, create issues"), Security Manager, Developer ("Push code
  to non-protected branches, create merge requests, and run CI/CD pipelines"), Maintainer ("Manage
  branches, merge requests, CI/CD settings, and project members. Cannot delete the project"),
  Owner ("Full control ... including deletion"). "Users always retain the permissions for their
  highest role"; subgroup members inherit from parent groups; "You can't give a user a role in a
  subgroup that is lower than the roles the user has in parent groups".
- Groups: "you use groups to manage one or more related projects at the same time"; a top-level
  group is "created at the root"; subgroups nest up to 20 levels, five or fewer recommended; a
  subgroup or project cannot be more visible than its parent. Subgroups: all tiers.
- Merge requests: "a central location for your team to review code, have discussions, and track
  code changes"; all tiers. Approvals on Free: users with at least Developer can approve, and
  "These approvals are optional and don't prevent merging without approval". Required approval
  rules and code owner approvals: **Premium and Ultimate**.
- Protected branches: "The default branch for your repository is protected by default"; a new
  rule selects Maintainers for "Allowed to push and merge"; force push off by default; wildcards
  such as `release/*`; the most permissive matching rule wins. Group-level protected branches and
  Code Owner approval: Premium and Ultimate. Code Owners: **Premium and Ultimate**; file at
  `CODEOWNERS`, `docs/CODEOWNERS` or `.gitlab/CODEOWNERS`.
- Environments: a job declares `environment:` with `name` and optional `url`; created on first
  use; dynamic names such as `$CI_COMMIT_REF_SLUG`; deployment tier guessed from the name
  (development, testing, staging, production, other) or set with `deployment_tier`; states
  `available`, `stopping`, `stopped`; `on_stop` names a stop job with `action: stop`;
  `auto_stop_in` runs hourly so stops are not exact. Protected environments: **Premium and
  Ultimate**: "only people with the appropriate privileges can deploy to it".
- Container registry: all tiers; path "always matches the related project's repository path";
  two optional name levels under the project; Docker V2 and OCI formats; visibility "Everyone With
  Access" or "Only Project Members". Authentication from a job:
  `echo "$CI_REGISTRY_PASSWORD" | docker login $CI_REGISTRY -u $CI_REGISTRY_USER --password-stdin`;
  the job token "has read (pull) and write (push) access to the container registry of the project
  that runs the job".
- Runners: "an application that works with GitLab CI/CD to run jobs in a pipeline"; instance
  runners "available to every project", group runners for "all projects and subgroups in a
  group", project runners for specific projects; "On GitLab.com, instance runners are enabled in
  all projects by default"; the runner requests jobs with its token and the job uses a job token.
- Issue boards: all tiers; label lists on Free; assignee and milestone lists Premium and Ultimate;
  "Moving an issue between lists removes the label from the list it came from and adds the label
  from the list it goes to"; multiple boards per project on Free, one group board on Free.
- Epics: **Premium and Ultimate**, "coordinate and track large initiatives by organizing work
  items into a work hierarchy". Compliance frameworks: **Premium and Ultimate**, "a label to
  identify that your project has certain compliance requirements".
- GitLab's self-description (platform page, GitLab's claim): "Plan, build, secure, and orchestrate
  on one platform you can trust"; "GitLab is the intelligent orchestration platform for
  DevSecOps"; "Unify SDLC stages as a single shared source of truth". The Handbook strategy page
  redirected to a login on 2026-10-29 and was NOT read; do not quote the handbook.
- Design system colour scale (design.gitlab.com, READ AT SOURCE): purple-500 `#7862c8`, purple-600
  `#6a54c0`, purple-700 `#5b46b8`, purple-800 `#483698`; orange-300 `#fb8017`; the page says
  purple is "associated with the GitLab brand". The brand values `#6B4FBB` and `#FC6D26` come from
  the course brief and were NOT found on a readable GitLab page (brand page 404, handbook behind
  login): **REPORTED**. The logo and tanuki are never drawn.

### ENGINE RULES (the bench's conventions, label as such)
- A `needs` reference to a job in a LATER stage is reported as an error. The reference read on
  2026-10-29 says same-stage references are allowed and does not state the later-stage case.
- A manual job is never scheduled (it "waits for a click"); any job downstream of it is reported
  as "waiting". The reference does not fix a duration for a manual gate.
- Under a runner cap, ready jobs are started longest-remaining-path first, ties by stage then
  definition order. GitLab does not document a queue order for a runner fleet; the cap is an
  assumption printed on the widget.
- Include merging is a key-level deep merge: includes in order, then the main file wins.

## Not covered (honest list)
Merged results pipelines and merge trains; parent-child (`trigger`) pipelines beyond a mention;
`rules:exists`; `parallel:matrix`; `retry`/`timeout` defaults; Auto DevOps; the package registry
beyond a name; security scanners beyond the Free SAST mention and a constructed dependency scan;
GitLab Dedicated in depth; self-managed installation; the GitLab API; Geo; the Certified Associate
exams (official pages list a fee; the outline was not read: REPORTED, not taught). Timeout default
and artifact default expiry are not quoted anywhere because the pages read did not state them.

## Canon (MEASURED: `materials/canon-ladder.json`; python vs node AGREE on 488 values)

Durations in seconds; wall clock mm:ss; compute minutes = serial seconds / 60 at cost factor 1.
| Rung | File | Context | Runners | Wall | Serial | Ran | Never added | Compute min |
|---|---|---|---|---|---|---|---|---|
| r1 Stages only | stages-only.yml | push to main | unlimited | 1808 (30:08) | 3978 (66:18) | 13 | 0 (1 manual) | 66.30 |
| r2 + needs | with-needs.yml | push to main | unlimited | 1582 (26:22) | 3978 (66:18) | 13 | 0 (1 manual) | 66.30 |
| r3 + rules | penwood.yml | merge request, pipelines/ changed | unlimited | 1157 (19:17) | 2470 (41:10) | 8 | 6 | 41.17 |
| r4 + runner cap | penwood.yml | same merge request | 2 | 1313 (21:53) | 2470 (41:10) | 8 | 6 | 41.17 |

- r1 critical path: lint-sql > build-image > nightly-backfill > publish-image > deploy-staging
  (stage order: the 894 s backfill in `test` holds `publish` back). r2 critical path: lint-yaml >
  build-image > integration-tests > publish-image > deploy-staging. r3 critical path: lint-yaml >
  build-image > integration-tests. r4 (two runners) start table (s): lint-yaml 0-45 · lint-sql
  0-107 · build-image 45-427 · compile-models 107-299 · data-quality-tests 299-777 ·
  integration-tests 427-1157 · unit-tests 777-1080 · scan-dependencies 1080-1313; total queue
  wait 1558 s (25:58) across two jobs: unit-tests waited 478 s and scan-dependencies 1080 s for
  a free runner; last to finish scan-dependencies at 21:53.
- r3 never added (6): docs-build (no rule matched, docs/ unchanged), nightly-backfill (not a
  schedule), publish-image, publish-docs, deploy-staging, deploy-production (all need
  `CI_COMMIT_BRANCH == CI_DEFAULT_BRANCH`, unset in a merge request pipeline).
- r2 start table (s): lint-yaml 0-45 · lint-sql 0-107 · nightly-backfill 0-894 · scan-dependencies
  0-233 · build-image 45-427 · docs-build 45-174 · compile-models 107-299 · publish-docs 174-234 ·
  data-quality-tests 299-777 · unit-tests 299-602 · integration-tests 427-1157 · publish-image
  1157-1402 · deploy-staging 1402-1582 · deploy-production manual.
- r5 scorecard (penwood.yml, cap 2): merge request 41.17 min x 24 runs (wall 21:53, 8 jobs);
  push to main 49.25 min x 12 (wall 26:22, 11 jobs, 2 never added: docs-build, nightly-backfill);
  schedule 56.18 min x 4 (wall 28:15, 11 jobs, 2 never added: docs-build, unit-tests). Total
  **1,803.8 compute minutes a month = 450.95% of the Free tier's 400**; does not fit. The lesson:
  the quota, not the wall clock, is Penwood's binding constraint; the levers are fewer runs,
  `rules:changes`, or runners the quota page does not measure (re-verify).
- Anti-lever "one job per stage, no needs" (one-per-stage.yml, push to main): wall 3978 = serial
  3978 (66:18); **39.93 minutes lost per run against r2, 479.2 minutes a month** at 12 pushes to
  main. (Correction to the brief: in GitLab "one stage, no needs" runs every job in parallel
  because jobs in one stage run together; the serial trap is "a stage per job".)
- Break button (penwood-typo.yml, same merge request as r3): rule 1 of unit-tests reads
  `$CI_PIPELINE_SOURCE == "merge_request"`; the real value is `merge_request_event`; no rule
  matches, unit-tests is never added, **7 jobs run instead of 8, wall 19:17 unchanged, pipeline
  passed: false green**.
- Planted faults: fault-cycle.yml reports "needs: cycle detected a -> c -> b -> a" (plus the
  engine's later-stage rule); fault-missing.yml reports "'unit_tests' job needs 'compile' job, but
  'compile' is not in the pipeline".
- Self-test on load: 9 of 9 properties held; with cycle detection switched off the first property
  fails (planted fault caught).
- Workflow: a push to a feature branch with an open merge request creates no pipeline (workflow
  rule 2, `when: never`), so it costs 0 compute minutes.

## Palette (GitLab purple + tanuki orange, mimicked)

Primary `#6B4FBB` (white text 6.07:1) · deep `#483698` (9.31) · mid `#927CD7` · soft `#C9BEEF` ·
50-tint `#F4F0FC` · ink `#1F1633` · muted `#5A5176` (7.31 on white) · faint `#CFC8E3` · hairline
`#E9E5F4` · faint-text `#6A6187` · paper `#FBFAFE` · orange `#FC6D26` FILL ONLY under ink (6.02;
white on it is 2.86, never) · orange ink `#9E3811` (6.94 on white, 6.00 on the tint) · orange tint
`#FFEBDD`. Nearest live primaries by Delta E: obsidian `#6741C4` 13.9, model-risk `#1E40AF` 15.1,
quantum `#3730A3` 15.5; rag `#6D28D9`, okr `#4338CA`, ai-agents `#EA580C` are further. No shift
needed. Difficulty ladder stays universal: `#34D399` `#FBBF24` `#FB923C` `#F87171`.

## Citation appendix (all read 2026-10-29 unless marked)
1. GitLab Docs, "CI/CD YAML syntax reference", https://docs.gitlab.com/ci/yaml/ (feature history up to GitLab 19.6 visible).
2. GitLab Docs, "Make jobs start earlier with needs", https://docs.gitlab.com/ci/yaml/needs/
3. GitLab Docs, "Specify when jobs run with rules", https://docs.gitlab.com/ci/jobs/job_rules/
4. GitLab Docs, "Control how jobs run", https://docs.gitlab.com/ci/jobs/job_control/
5. GitLab Docs, "Predefined CI/CD variables reference", https://docs.gitlab.com/ci/variables/predefined_variables/
6. GitLab Docs, "CI/CD variables", https://docs.gitlab.com/ci/variables/
7. GitLab Docs, "Job artifacts", https://docs.gitlab.com/ci/jobs/job_artifacts/
8. GitLab Docs, "Caching in GitLab CI/CD", https://docs.gitlab.com/ci/caching/
9. GitLab Docs, "Use CI/CD configuration from other files", https://docs.gitlab.com/ci/yaml/includes/
10. GitLab Docs, "Pipeline architecture", https://docs.gitlab.com/ci/pipelines/pipeline_architectures/
11. GitLab Docs, "Merge request pipelines", https://docs.gitlab.com/ci/pipelines/merge_request_pipelines/
12. GitLab Docs, "Compute minutes", https://docs.gitlab.com/ci/pipelines/compute_minutes/
13. GitLab, "Pricing", https://about.gitlab.com/pricing/
14. GitLab Docs, "Free user limit", https://docs.gitlab.com/user/free_user_limit/
15. GitLab Docs, "Storage usage quotas", https://docs.gitlab.com/user/storage_usage_quotas/
16. GitLab Docs, "Roles and permissions", https://docs.gitlab.com/user/permissions/
17. GitLab Docs, "Groups", https://docs.gitlab.com/user/group/ ; "Subgroups", https://docs.gitlab.com/user/group/subgroups/
18. GitLab Docs, "Merge requests", https://docs.gitlab.com/user/project/merge_requests/ ; "Merge request approvals", https://docs.gitlab.com/user/project/merge_requests/approvals/
19. GitLab Docs, "Protected branches", https://docs.gitlab.com/user/project/repository/branches/protected/
20. GitLab Docs, "Code Owners", https://docs.gitlab.com/user/project/codeowners/
21. GitLab Docs, "Environments and deployments", https://docs.gitlab.com/ci/environments/ ; "Protected environments", https://docs.gitlab.com/ci/environments/protected_environments/
22. GitLab Docs, "Container registry", https://docs.gitlab.com/user/packages/container_registry/ ; "Authenticate with the container registry", https://docs.gitlab.com/user/packages/container_registry/authenticate_with_container_registry/
23. GitLab Docs, "GitLab Runner", https://docs.gitlab.com/runner/ ; "Runner scope", https://docs.gitlab.com/ci/runners/runners_scope/
24. GitLab Docs, "Issue boards", https://docs.gitlab.com/user/project/issue_board/
25. GitLab Docs, "Epics", https://docs.gitlab.com/user/group/epics/ ; "Compliance frameworks", https://docs.gitlab.com/user/compliance/compliance_frameworks/
26. GitLab, "Platform", https://about.gitlab.com/platform/ (GitLab's own claim).
27. GitLab Design System, "Color", https://design.gitlab.com/product-foundations/color/
28. NOT READ: GitLab Handbook strategy and brand pages (login redirect), about.gitlab.com/brand (404), GitLab University exam outlines (fee listed; outline not read).
