<!-- learn-with-phoebe hub banner -->
> ### 📚 Part of [**Learn with Phoebe**](https://phoebefu6.github.io/learn-with-phoebe/)
> The shelf of 174 free, hands-on courses on AI, data, and the craft around them. **[Browse every course ↗](https://phoebefu6.github.io/learn-with-phoebe/)**
<!-- /learn-with-phoebe hub banner -->

# Learn GitLab

Fourteen 45-minute sessions on GitLab as one application: planning, code review, CI/CD, a
container registry and security scanning under one permission tree, taught on the GitLab.com
Free tier. By Phoebe Fu.

- **Leader track (6, no code):** one application not six, SaaS or self-managed, groups projects
  and permissions, reading a pipeline like a manager, governance without friction, the 90-day
  migration plan.
- **Builder track (8, a free account and the browser):** project issues and boards, the merge
  request, your first .gitlab-ci.yml, variables artifacts and cache, rules needs and the DAG,
  environments and deployments, container registry and templates, the pipeline DAG bench.

The bench (builder session 8) runs in the browser: it parses Penwood's real `.gitlab-ci.yml`
text, resolves include and extends, evaluates workflow and job rules against a pipeline context,
builds the DAG from stage order and needs, schedules it with unlimited runners and under a cap,
and prints wall clock, serial time and compute minutes against the Free tier's quota.
`materials/gtl_reference.py` is an independent Python reference; `materials/compare-ladder.py`
checks it against the browser engine by value.

Penwood is constructed. Its people, pipeline, run log and monthly run mix are invented and
labelled so on every page. Tier facts were read on the GitLab.com pricing and limits pages on
2026-10-29 and change; re-verify before relying on them. GitLab's logo and tanuki mark are
GitLab's trademarks and are not reproduced here.
