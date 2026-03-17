---
phase: 1
slug: core-hardening
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-16
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Bun built-in test runner (bun:test) |
| **Config file** | none (bun discovers `*.test.ts` by convention) |
| **Quick run command** | `bun test test/core` |
| **Full suite command** | `bun test test/core && bun run typecheck` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `bun test test/core`
- **After every plan wave:** Run `bun test test/core && bun run typecheck`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 1-01-01 | 01 | 0 | CODE-04 | unit | `bun test test/core/errors.test.ts` | ❌ W0 | ⬜ pending |
| 1-01-02 | 01 | 0 | PROV-01, PROV-06, PROV-07 | unit | `bun test test/core/providers.test.ts` | ❌ W0 | ⬜ pending |
| 1-01-03 | 01 | 0 | CODE-06 | unit | `bun test test/core/config.test.ts` | ❌ W0 | ⬜ pending |
| 1-01-04 | 01 | 0 | CODE-03 | unit | `bun test test/core/run-flags.test.ts` | ❌ W0 | ⬜ pending |
| 1-02-01 | 02 | 1 | CODE-01 | smoke | `bun run typecheck` | ✅ | ⬜ pending |
| 1-02-02 | 02 | 1 | CODE-03 | unit | `bun run typecheck` | ✅ | ⬜ pending |
| 1-02-03 | 02 | 1 | CODE-04 | unit | `bun test test/core/errors.test.ts` | ❌ W0 | ⬜ pending |
| 1-02-04 | 02 | 1 | CODE-06 | unit | `bun test test/core/config.test.ts` | ❌ W0 | ⬜ pending |
| 1-02-05 | 02 | 1 | CODE-07 | unit | `bun test test/core/orchestrator.test.ts` | ✅ | ⬜ pending |
| 1-03-01 | 03 | 1 | PROV-01 | unit | `bun test test/core/providers.test.ts` | ❌ W0 | ⬜ pending |
| 1-03-02 | 03 | 1 | PROV-05 | smoke | `bun run typecheck` | ✅ | ⬜ pending |
| 1-03-03 | 03 | 1 | PROV-06 | unit | `bun test test/core/providers.test.ts` | ❌ W0 | ⬜ pending |
| 1-03-04 | 03 | 1 | PROV-07 | unit | `bun test test/core/providers.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `test/core/errors.test.ts` — stubs for CODE-04: error hierarchy instanceof chain, cause propagation, ErrorCode enum
- [ ] `test/core/providers.test.ts` — stubs for PROV-01: system param position; PROV-06: retry on 429; PROV-07: timeout abort
- [ ] `test/core/config.test.ts` — stubs for CODE-06: DEFAULT_MODELS shape and non-empty values
- [ ] `test/core/run-flags.test.ts` — stubs for CODE-03: RunFlags interface shape validation

*Existing `test/core/orchestrator.test.ts` needs one new test case for concurrency cap — file already exists.*

---

## Manual-Only Verifications

*All phase behaviors have automated verification.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
