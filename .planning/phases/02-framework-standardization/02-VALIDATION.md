---
phase: 2
slug: framework-standardization
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-16
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Bun test (built-in) |
| **Config file** | `package.json` scripts: `"test": "bun test"` |
| **Quick run command** | `bun run typecheck && grep -r "@institutional-reasoning\|../../core" frameworks/ --include="*.ts" \| wc -l` |
| **Full suite command** | `bun test` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `bun run typecheck && grep -r "@institutional-reasoning\|../../core" frameworks/ --include="*.ts" | wc -l` (should be 0)
- **After every plan wave:** Run `bun test test/core/`
- **Before `/gsd:verify-work`:** Full suite must be green + grep audits return zero results
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 2-01-01 | 01 | 1 | PROV-02 | integration | `bun test test/core/orchestrator.test.ts` | ✅ | ⬜ pending |
| 2-01-02 | 01 | 1 | CODE-02 | grep | `grep -r "@institutional-reasoning\|../../core" frameworks/courtroom/ --include="*.ts"` returns empty | ✅ | ⬜ pending |
| 2-02-01 | 02 | 2 | CODE-05 | grep | `grep -rL "FrameworkRunner" frameworks/*/orchestrator.ts` returns empty | ✅ | ⬜ pending |
| 2-02-02 | 02 | 2 | CODE-02 | grep | `grep -r "@institutional-reasoning\|../../core" frameworks/ --include="*.ts"` returns empty | ✅ | ⬜ pending |
| 2-03-01 | 03 | 3 | PROV-03 | grep+smoke | No `costUSD = 0.0` placeholders remain in any framework | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `test/frameworks/courtroom-fixture.ts` — capture courtroom output before refactoring
- [ ] Existing test infrastructure covers all other phase requirements

*No new test framework needed — Bun test already configured.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| 7 broken frameworks report non-zero costUSD | PROV-03 | Full automated cost testing requires MockLLMProvider (Phase 4) | Run each of the 7 frameworks with a real provider, verify `result.metadata.costUSD > 0` |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
