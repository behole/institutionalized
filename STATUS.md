# 📊 Project Status

**Date:** 2026-09-25
**Status:** Engine rework complete — 26/26 frameworks on the new engine, eval harness live

---

## Architecture (v0.2 "lite" rework)

- [x] `core/engine/` — TS composition API: `defineFramework` + `Session` primitives
      (`step`, `parallel`), event-driven reporting, per-role model registry
      (`MODEL_REGISTRY`), budget guardrails, audit trail with per-agent cost
- [x] All 26 frameworks ported off the copy-paste boilerplate; zero `console.log`
      in the framework layer; prompts byte-identical to originals
- [x] CLI: static registry (no `PKG_ROOT`/`isBundled` dynamic-import hack), reporter
      wiring, `--output-json`, `--max-cost`, `--provider`/`--model`, normalized exit
      codes (0 approve / 1 reject / 2 error / 3 indeterminate)
- [x] Node-compatible core (no Bun-only APIs in `core/`; CLI runs on Bun, npm build TBD)
- [x] MCP server **removed** — replaced by Claude Code skill (`skills/institutional-reasoning/`)
- [x] Removed: `test/integration/` (asserted nothing), `test-suite/` (absorbed into
      `eval/`), committed `.tgz`, `skills/institutional-lite/`

## Validity Harness

- [x] `eval/` — framework vs single-call baseline on ground-truth cases
- [x] 4 seed cases (`eval/cases/`) with binary ground truth (product-launch) and
      weighted rubric criteria (api-migration, auth-system, essay-skateboarding)
- [x] First results (gpt-4o-mini via OpenRouter): pre-mortem +1.00 lift on binary
      launch case; peer-review +0.10 on blind rubric judging; courtroom/red-blue
      tie with baseline on binary case
- [ ] **Not yet proven**: n=1 per cell, one judge model, no multi-seed runs.
      Scaling cases and seeds is the top validity priority.

## Testing

- [x] Unit: 134 passing (<2s), includes property tests
- [x] E2E (API-key-gated): all frameworks covered, result-shape assertions
- [x] Repo-wide `tsc --noEmit`: 0 errors
- [x] Live verification: every framework exercised end-to-end against a real
      provider during the port

## Next Priorities

1. Scale eval: 20–50 ground-truth cases, multi-seed runs, judge calibration
2. npm publication (Node-compatible bin build)
3. Dynamic website (deferred — user has a specific vision, to be designed)

---

**Quality**: production-ready for beta
**Docs**: README rewritten for the new architecture; ARCHITECTURE.md engine
section updated next
