#!/usr/bin/env python3
"""Build the CONSTRUCTED Penwood data for the pipeline DAG bench.

Penwood is a constructed logistics-analytics team moving its data pipelines onto GitLab.com's Free
tier. Nothing here is a real company, run log or incident. Writes:
  materials/gtl-data.json   (read by materials/gtl_reference.py and run_ladder_node.js)
  assets/gtl-data.js        (window.GTL_DATA, serialised with json.dumps, never an f-string)

Every .gitlab-ci.yml variant the bench parses lives in D["files"], so the browser, node and
Python all read the SAME text. Job durations are the median of a seeded 20-run log in seconds.
"""
import json
import os
import random
import statistics

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HERE)

# ---------------------------------------------------------------- Penwood's jobs (constructed)
# name, stage, base seconds, needs (None = stage order), rules key, extras
JOBS = [
    ("lint-yaml",           "lint",    45,  [],                                   "always",  {}),
    ("lint-sql",            "lint",    110, [],                                   "always",  {}),
    ("build-image",         "build",   380, ["lint-yaml"],                        "always",  {}),
    ("compile-models",      "build",   190, ["lint-sql"],                         "always",  {}),
    ("docs-build",          "build",   130, ["lint-yaml"],                        "docs",    {}),
    ("unit-tests",          "test",    300, ["compile-models"],                   "mr-main", {}),
    ("data-quality-tests",  "test",    480, ["compile-models"],                   "pipes",   {}),
    ("integration-tests",   "test",    720, ["build-image", "compile-models"],    "always",  {}),
    ("scan-dependencies",   "test",    240, [],                                   "always",  {"extends": ".dependency-scan"}),
    ("nightly-backfill",    "test",    900, [],                                   "sched",   {}),
    ("publish-image",       "publish", 240, ["build-image", "integration-tests"], "main",    {}),
    ("publish-docs",        "publish", 60,  [("docs-build", True)],               "main",    {}),
    ("deploy-staging",      "deploy",  180, ["publish-image"],                    "main",    {"environment": "staging"}),
    ("deploy-production",   "deploy",  180, ["deploy-staging"],                   "manual",  {"environment": "production"}),
]
STAGES = ["lint", "build", "test", "publish", "deploy"]

SCRIPTS = {
    "lint-yaml": ["python -m yamllint pipelines/"],
    "lint-sql": ["python -m sqlfluff lint models/"],
    "build-image": ["docker build -t $CI_REGISTRY_IMAGE:$CI_COMMIT_SHORT_SHA ."],
    "compile-models": ["python pipelines/compile.py --out build/"],
    "docs-build": ["python docs/build.py"],
    "unit-tests": ["python -m pytest tests/unit -q"],
    "data-quality-tests": ["python pipelines/quality.py --sample 2000"],
    "integration-tests": ["python -m pytest tests/integration -q"],
    "scan-dependencies": ["python -m pip_audit -r requirements.txt"],
    "nightly-backfill": ["python pipelines/backfill.py --days 1"],
    "publish-image": ["docker push $CI_REGISTRY_IMAGE:$CI_COMMIT_SHORT_SHA"],
    "publish-docs": ["python docs/publish.py build/docs"],
    "deploy-staging": ["python deploy/run.py --target staging"],
    "deploy-production": ["python deploy/run.py --target production"],
}

RULES = {
    "always": None,
    "docs": [
        {"changes": ["docs/**/*"]},
    ],
    "pipes": [
        {"changes": ["pipelines/**/*", "models/**/*"]},
    ],
    "mr-main": [
        {"if": '$CI_PIPELINE_SOURCE == "merge_request_event"'},
        {"if": "$CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH"},
    ],
    "main": [
        {"if": "$CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH"},
    ],
    "sched": [
        {"if": '$CI_PIPELINE_SOURCE == "schedule"'},
    ],
    "manual": [
        {"if": "$CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH", "when": "manual"},
    ],
}

WORKFLOW = [
    {"if": '$CI_PIPELINE_SOURCE == "merge_request_event"'},
    {"if": "$CI_COMMIT_BRANCH && $CI_OPEN_MERGE_REQUESTS", "when": "never"},
    {"if": "$CI_COMMIT_BRANCH"},
    {"if": '$CI_PIPELINE_SOURCE == "schedule"'},
]


def q(s):
    """Quote a scalar for YAML when it needs it."""
    if any(c in s for c in ':#"\'[]{}') or s.strip() != s:
        return "'" + s.replace("'", "''") + "'"
    return s


def yaml_rules(rules, ind):
    out = []
    for r in rules:
        first = True
        for k, v in r.items():
            lead = ind + ("- " if first else "  ")
            first = False
            if isinstance(v, list):
                out.append(f"{lead}{k}:")
                for item in v:
                    out.append(f"{ind}    - {q(item)}")
            else:
                out.append(f"{lead}{k}: {q(v)}")
    return out


def render(variant):
    """variant: 'stages-only' | 'with-needs' | 'penwood' | 'one-per-stage' | 'typo'."""
    L = ["# Penwood data pipelines (constructed) - " + variant, "stages:"]
    if variant == "one-per-stage":
        for name, *_ in JOBS:
            L.append(f"  - {name}")
    else:
        for s in STAGES:
            L.append(f"  - {s}")
    L += ["", "variables:", "  PYTHON_VERSION: '3.12'", "  PIPELINE_OWNER: data-platform", ""]
    if variant in ("penwood", "typo"):
        L += ["workflow:", "  rules:"] + yaml_rules(WORKFLOW, "    ") + [""]
        L += ["include:", "  - local: ci/scan-template.yml", ""]
    L += ["default:", "  image: python:3.12-slim", ""]
    for name, stage, secs, needs, rk, extra in JOBS:
        L.append(f"{name}:")
        L.append(f"  stage: {name if variant == 'one-per-stage' else stage}")
        if extra.get("extends") and variant in ("penwood", "typo"):
            L.append(f"  extends: {extra['extends']}")
        if variant in ("with-needs", "penwood", "typo") and needs is not None:
            if not needs:
                L.append("  needs: []")
            else:
                L.append("  needs:")
                for n in needs:
                    if isinstance(n, tuple):
                        L.append(f"    - job: {n[0]}")
                        L.append(f"      optional: {'true' if n[1] else 'false'}")
                    else:
                        L.append(f"    - {n}")
        if variant in ("penwood", "typo"):
            rules = RULES[rk]
            if rk == "mr-main" and variant == "typo":
                rules = [{"if": '$CI_PIPELINE_SOURCE == "merge_request"'}, rules[1]]
            if rules is not None:
                L.append("  rules:")
                L += yaml_rules(rules, "    ")
        elif rk == "manual":
            L.append("  when: manual")
        if extra.get("environment"):
            L.append("  environment:")
            L.append(f"    name: {extra['environment']}")
        if not (extra.get("extends") and variant in ("penwood", "typo")):
            L.append("  script:")
            for cmd in SCRIPTS[name]:
                L.append(f"    - {q(cmd)}")
        L.append("")
    return "\n".join(L).rstrip() + "\n"


SCAN_TEMPLATE = """# ci/scan-template.yml (constructed) - included by the main file
.dependency-scan:
  image: python:3.12-slim
  script:
    - python -m pip_audit -r requirements.txt
  allow_failure: true
"""

CYCLE = """# planted fault: a needs cycle
stages: [build, test]
a:
  stage: build
  needs: [c]
  script: [echo a]
b:
  stage: build
  needs: [a]
  script: [echo b]
c:
  stage: test
  needs: [b]
  script: [echo c]
"""

MISSING = """# planted fault: a needs target that does not exist in the pipeline
stages: [build, test]
compile:
  stage: build
  rules:
    - if: '$CI_PIPELINE_SOURCE == "schedule"'
  script: [echo compile]
unit_tests:
  stage: test
  needs: [compile]
  script: [echo test]
"""


def run_log():
    rng = random.Random(29)
    base = {name: secs for name, _, secs, *_ in JOBS}
    runs = []
    for i in range(20):
        row = {}
        for name, s in base.items():
            jitter = rng.uniform(-0.12, 0.12)
            row[name] = max(10, int(round(s * (1 + jitter))))
        # force the median to be the base: set runs 9 and 10 (0-based) to the base value
        runs.append(row)
    for name, s in base.items():
        vals = sorted(r[name] for r in runs)
        # replace the two middle values with the base so the median equals the base exactly
        runs[9][name] = s
        runs[10][name] = s
    durations = {}
    for name in base:
        vals = [r[name] for r in runs]
        durations[name] = int(statistics.median(vals))
    return runs, durations


def main():
    runs, durations = run_log()
    D = {
        "constructed": True,
        "team": "Penwood (constructed)",
        "note": "Penwood is a constructed logistics-analytics team on GitLab.com Free. Durations are the median of a constructed 20-run log, in seconds.",
        "stages": STAGES,
        "jobs": [j[0] for j in JOBS],
        "durations": durations,
        "runlog": {"unit": "seconds", "runs": runs},
        "files": {
            "stages-only.yml": render("stages-only"),
            "with-needs.yml": render("with-needs"),
            "penwood.yml": render("penwood"),
            "one-per-stage.yml": render("one-per-stage"),
            "penwood-typo.yml": render("typo"),
            "ci/scan-template.yml": SCAN_TEMPLATE,
            "fault-cycle.yml": CYCLE,
            "fault-missing.yml": MISSING,
        },
        "contexts": {
            "mr": {"label": "merge request from feature/orders-dedupe into main, pipelines/ changed",
                   "source": "merge_request_event", "branch": "feature/orders-dedupe", "default_branch": "main",
                   "target_branch": "main", "mr_iid": "42", "tag": None,
                   "changed": ["pipelines/orders/dedupe.py", "tests/unit/test_dedupe.py"]},
            "mr-docs": {"label": "merge request, only docs/ changed",
                        "source": "merge_request_event", "branch": "feature/readme", "default_branch": "main",
                        "target_branch": "main", "mr_iid": "43", "tag": None,
                        "changed": ["docs/runbook.md"]},
            "main": {"label": "push to main after the merge",
                     "source": "push", "branch": "main", "default_branch": "main", "target_branch": None,
                     "mr_iid": None, "tag": None, "changed": ["pipelines/orders/dedupe.py", "tests/unit/test_dedupe.py"]},
            "branch": {"label": "push to a feature branch with an open merge request",
                       "source": "push", "branch": "feature/orders-dedupe", "default_branch": "main",
                       "target_branch": None, "mr_iid": None, "tag": None, "open_mr": True,
                       "changed": ["pipelines/orders/dedupe.py"]},
            "schedule": {"label": "nightly schedule on main",
                         "source": "schedule", "branch": "main", "default_branch": "main", "target_branch": None,
                         "mr_iid": None, "tag": None, "changed": []},
        },
        "settings": {
            "runs_per_month": {"mr": 24, "main": 12, "schedule": 4},
            "cost_factor": 1,
            "free_quota_minutes": 400,
            "runner_cap_default": 2,
            "rungs": [
                {"id": "r1", "label": "Stages only", "file": "stages-only.yml", "ctx": "main", "cap": 0,
                 "blurb": "Five stages, no needs, no rules. Every job waits for the whole stage before it."},
                {"id": "r2", "label": "+ needs", "file": "with-needs.yml", "ctx": "main", "cap": 0,
                 "blurb": "Each job names what it needs. Jobs start the moment their inputs finish."},
                {"id": "r3", "label": "+ rules with a context", "file": "penwood.yml", "ctx": "mr", "cap": 0,
                 "blurb": "Rules decide which jobs exist in THIS pipeline: a merge request with pipelines/ changed."},
                {"id": "r4", "label": "+ runner cap", "file": "penwood.yml", "ctx": "mr", "cap": 2,
                 "blurb": "Same pipeline, two runners. Ready jobs queue; the wall clock stretches."},
                {"id": "r5", "label": "The scorecard", "file": "penwood.yml", "ctx": "mix", "cap": 2,
                 "blurb": "Penwood's constructed month: 24 merge requests, 12 pushes to main, 4 schedules, against the Free tier's 400 compute minutes."},
            ],
            "anti": {"file": "one-per-stage.yml", "ctx": "main", "cap": 0,
                     "label": "One job per stage, no needs",
                     "blurb": "Stages used as an ordering list. Every job waits for the one before it: wall clock equals serial."},
            "broken": {"file": "penwood-typo.yml",
                       "label": "Break it: a rules typo on unit-tests",
                       "job": "unit-tests",
                       "rule": '$CI_PIPELINE_SOURCE == "merge_request"',
                       "real": "merge_request_event"},
        },
    }
    with open(os.path.join(HERE, "gtl-data.json"), "w", encoding="utf-8") as f:
        json.dump(D, f, indent=1, ensure_ascii=True)
    js = ("/* gtl-data.js - CONSTRUCTED data for the pipeline DAG bench. Penwood is invented.\n"
          "   Generated by materials/build_gtl_data.py with json.dumps; do not hand-edit. */\n"
          "window.GTL_DATA = " + json.dumps(D, ensure_ascii=True, separators=(",", ":")) + ";\n")
    with open(os.path.join(REPO, "assets", "gtl-data.js"), "w", encoding="utf-8") as f:
        f.write(js)
    print("jobs:", len(JOBS), "| durations:", durations)
    print("files:", {k: len(v) for k, v in D["files"].items()})
    print("gtl-data.js bytes:", len(js))


if __name__ == "__main__":
    main()
