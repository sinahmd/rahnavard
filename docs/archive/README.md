# docs/archive — superseded historical documents

Everything in this folder is **historical**: it describes the pre-refactor
architecture (localStorage DRF tokens, client-fetched public pages, the old
deploy pipeline) or scaffolding that has since been replaced. Do **not** run
commands from these documents and do not treat them as current guidance.

| Document | Superseded by |
|---|---|
| `ARCHITECTURE.md` | README "Refactor Status", `docs/adr/*`, DEVELOPMENT.md |
| `STEP_BY_STEP_ROADMAP.md` | `docs/SENIOR_REFACTOR_PLAN.md` |
| `CI_CD_IMPLEMENTATION_PLAN.md` | `.github/workflows/{ci,deploy}.yml`, DEVELOPMENT.md §5 |
| `IMPLEMENTATION_REPORT.md` | DEVELOPMENT.md §3.7–3.10 (phase status) |
| `FINAL_PRODUCTION_REPORT.md` | DEVELOPMENT.md, CLAUDE.md session log |
| `PRODUCTION_READINESS_CHECKLIST.md` | token-auth era checklist — DEVELOPMENT.md |
| `PRODUCTION_DEPLOYMENT_CHECKLIST.md` | token-auth era checklist — DEVELOPMENT.md §5/§7 |
| `PHASE1_IMPLEMENTATION_COMPLETE.md` | README "Refactor Status" |
| `developer_car_feature_implementation.md` | `.opencode/agents/developer.md` |

Current sources of truth: **README.md** (overview + refactor status),
**DEVELOPMENT.md** (workflow, phase status, merge/deploy process),
**CLAUDE.md** (project rules + session log), **docs/SENIOR_REFACTOR_PLAN.md**
(the refactor plan), and **docs/adr/** (architecture decision records).
