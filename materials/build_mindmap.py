#!/usr/bin/env python3
"""Write window.MINDMAP_DATA into index.html with json.dumps (never an f-string).
Concept labels follow each page's Part headings (agent-brief.md lists the planned ones)."""
import json, os, re
HERE = os.path.dirname(os.path.abspath(__file__)); REPO = os.path.dirname(HERE)
S = [
    ("One application", "a1-one-application-not-six", "#34D399", ["What a host leaves out", "One tree, one set of roles", "The trade-offs"]),
    ("SaaS or self-managed", "a2-saas-or-self-managed", "#FBBF24", ["Three ways to run GitLab", "Hosted runners or your own", "What Free withholds"]),
    ("Groups and permissions", "a3-groups-projects-permissions", "#FBBF24", ["The tree", "Eight roles, one rule", "Five seats"]),
    ("Reading a pipeline", "a4-reading-a-pipeline", "#FB923C", ["Stages are a queue", "Three clocks", "Green is not proof"]),
    ("Governance", "a5-governance-without-friction", "#FB923C", ["The branch is the control point", "Premium and the Free substitute", "Masked is not secret"]),
    ("90-day migration", "a6-the-90-day-migration", "#FB923C", ["Repo, issues, board", "The pipeline and the quota", "Registry, environments, exit"]),
    ("Project, issues, boards", "b1-project-issues-boards", "#34D399", ["The tree you create first", "Boards read labels", "What GitLab calls it"]),
    ("The merge request", "b2-the-merge-request", "#FBBF24", ["Same idea, new name", "Approvals optional on Free", "The merge request pipeline"]),
    ("First .gitlab-ci.yml", "b3-first-gitlab-ci-yml", "#FBBF24", ["Stages, jobs, script", "The first green", "What a minute costs"]),
    ("Variables, artifacts, cache", "b4-variables-artifacts-cache", "#FB923C", ["Where a variable comes from", "Artifacts move results", "Cache is a hope"]),
    ("Rules, needs, DAG", "b5-rules-needs-dag", "#FB923C", ["First match wins", "Needs skip the queue", "The job that is not there"]),
    ("Environments", "b6-environments-deployments", "#FB923C", ["A name on a job", "Stop it on purpose", "The blocking manual gate"]),
    ("Registry and templates", "b7-registry-and-templates", "#FB923C", ["The project's own registry", "Include, then extend", "Templates GitLab ships"]),
    ("The DAG bench", "b8-the-pipeline-dag-bench", "#F87171", ["Four rungs, two clocks", "Two traps", "The scorecard"]),
]
data = {"title": "Learn\nGitLab", "centerColor": "#483698", "sessions": [
    {"label": l, "href": "courses/%s.html" % f, "color": c,
     "concepts": [{"label": k, "href": "courses/%s.html" % f} for k in ks]} for l, f, c, ks in S]}
p = os.path.join(REPO, "index.html"); s = open(p, encoding="utf-8").read()
block = "window.MINDMAP_DATA = " + json.dumps(data, indent=2, ensure_ascii=True) + ";"
s2 = re.sub(r"(<script>\n)(?:/\*@@MINDMAP@@\*/|window\.MINDMAP_DATA = .*?;)(\n</script>)", lambda m: m.group(1) + block + m.group(2), s, count=1, flags=re.S)
assert s2 != s or block in s
open(p, "w", encoding="utf-8").write(s2)
print("mindmap:", len(S), "sessions,", sum(len(x[3]) for x in S), "concepts")
