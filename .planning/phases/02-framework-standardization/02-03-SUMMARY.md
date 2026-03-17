---
phase: 02-framework-standardization
plan: 03
subsystem: frameworks
tags: [framework-runner, cost-tracking, import-standardization, peer-review, pre-mortem, red-blue, studio]
dependency_graph:
  requires: []
  provides: [FrameworkRunner adoption in 4 frameworks, standardized @core/* imports in peer-review]
  affects: [frameworks/peer-review, frameworks/pre-mortem, frameworks/red-blue, frameworks/studio]
tech_stack:
  added: []
  patterns: [FrameworkRunner wrapper pattern, costUSD via auditLog.metadata.totalCost]
key_files:
  created: []
  modified:
    - frameworks/peer-review/orchestrator.ts
    - frameworks/peer-review/reviewer.ts
    - frameworks/peer-review/author.ts
    - frameworks/peer-review/editor.ts
    - frameworks/peer-review/types.ts
    - frameworks/pre-mortem/orchestrator.ts
    - frameworks/pre-mortem/types.ts
    - frameworks/red-blue/orchestrator.ts
    - frameworks/red-blue/types.ts
    - frameworks/studio/orchestrator.ts
    - frameworks/studio/types.ts
decisions:
  - FrameworkRunner wraps orchestrator-level result via finalize() — agent functions retain own provider.call() internals; cost tracking is wired at the boundary where the full result is assembled
  - costUSD added as optional field to all 4 result metadata types to match the FrameworkRunner audit trail output
  - Pre-existing errors in courtroom (deliberate export missing) and six-hats (costUSD type mismatch) are out-of-scope and not modified
metrics:
  duration: 15
  completed: "2026-03-17"
  tasks_completed: 2
  files_modified: 11
---

# Phase 02 Plan 03: FrameworkRunner Adoption + Peer-Review Import Fix Summary

**One-liner:** FrameworkRunner wraps all 4 working orchestrators (peer-review, pre-mortem, red-blue, studio) with audit trail cost tracking, and peer-review's 4 relative `../../core/types` imports replaced with `@core/types`.

## What Was Built

### Task 1: Fix peer-review imports + add FrameworkRunner to peer-review and pre-mortem

**Commit:** `70f0965`

**peer-review import fixes (CODE-02):**
All 4 peer-review TypeScript files had `import type { LLMProvider } from "../../core/types"` replaced with `import type { LLMProvider } from "@core/types"`:
- `frameworks/peer-review/reviewer.ts`
- `frameworks/peer-review/author.ts`
- `frameworks/peer-review/editor.ts`
- `frameworks/peer-review/orchestrator.ts`

**FrameworkRunner added to peer-review/orchestrator.ts:**
- Import: `import { FrameworkRunner } from "@core/orchestrator"`
- Runner created at function start: `new FrameworkRunner<Submission, PeerReviewResult>("peer-review", submission)`
- `runner.finalize(result, "complete")` called before return
- `costUSD: auditLog.metadata.totalCost` added to returned metadata
- `PeerReviewResult.metadata.costUSD?: number` added to types

**FrameworkRunner added to pre-mortem/orchestrator.ts:**
- Import: `import { FrameworkRunner } from "@core/orchestrator"`
- Runner created at function start: `new FrameworkRunner<Plan, PreMortemResult>("pre-mortem", plan)`
- `runner.finalize(result, "complete")` called before return
- `costUSD: auditLog.metadata.totalCost` added to returned metadata
- `PreMortemResult.metadata.costUSD?: number` added to types

### Task 2: Add FrameworkRunner to red-blue and studio

**Commit:** `39fab5a`

**FrameworkRunner added to red-blue/orchestrator.ts:**
- Import: `import { FrameworkRunner } from "@core/orchestrator"`
- Runner created at function start: `new FrameworkRunner<Target, RedBlueResult>("red-blue", target)`
- `runner.finalize(result, "complete")` called before return
- Sequential attack-round loop preserved exactly
- `costUSD: auditLog.metadata.totalCost` added to returned metadata
- `RedBlueResult.metadata.costUSD?: number` added to types

**FrameworkRunner added to studio/orchestrator.ts:**
- Import: `import { FrameworkRunner } from "@core/orchestrator"`
- Runner created at function start: `new FrameworkRunner<CreativeWork, StudioResult>("studio", work)`
- `runner.finalize(result, "complete")` called before return
- Parallel observation and critique phases preserved exactly
- `costUSD: auditLog.metadata.totalCost` added to returned metadata
- `StudioResult.metadata.costUSD?: number` added to types

## Verification

```
# Zero relative ../../core imports in peer-review
grep -r "../../core" frameworks/peer-review --include="*.ts" | wc -l
# Result: 0 ✓

# All 4 orchestrators use FrameworkRunner (count: import + usage = 2 each)
frameworks/pre-mortem/orchestrator.ts: 2 ✓
frameworks/red-blue/orchestrator.ts: 2 ✓
frameworks/studio/orchestrator.ts: 2 ✓
frameworks/peer-review/orchestrator.ts: 2 ✓

# TypeScript: zero errors in modified frameworks ✓
# Pre-existing unrelated errors in courtroom and six-hats remain (out of scope)
```

## Deviations from Plan

### Auto-fixed Issues

None - plan executed exactly as written.

### Out-of-Scope Issues Discovered

Two pre-existing TypeScript errors found during typecheck but NOT fixed (out of scope per deviation rules):

1. `frameworks/courtroom/orchestrator.ts` — module `./jury` has no exported member `deliberate`, plus argument count mismatches
2. `frameworks/six-hats/index.ts` — `costUSD` does not exist in type for six-hats metadata

These are logged here for tracking; they were present before this plan's execution.

## Self-Check: PASSED

Files exist:
- `frameworks/peer-review/orchestrator.ts` — FOUND (FrameworkRunner: 2 occurrences)
- `frameworks/pre-mortem/orchestrator.ts` — FOUND (FrameworkRunner: 2 occurrences)
- `frameworks/red-blue/orchestrator.ts` — FOUND (FrameworkRunner: 2 occurrences)
- `frameworks/studio/orchestrator.ts` — FOUND (FrameworkRunner: 2 occurrences)
- Zero `../../core` imports in peer-review — VERIFIED

Commits exist:
- `70f0965` — FOUND: feat(02-03): fix peer-review imports and add FrameworkRunner to peer-review + pre-mortem
- `39fab5a` — FOUND: feat(02-03): add FrameworkRunner to red-blue and studio orchestrators
