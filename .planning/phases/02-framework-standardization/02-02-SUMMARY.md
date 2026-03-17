---
phase: 02-framework-standardization
plan: 02
status: complete
started: 2026-03-17T10:25:00-08:00
completed: 2026-03-17T10:40:00-08:00
---

# Plan 02-02: Migrate Broken generateObject Frameworks — SUMMARY

## What Was Done

### Task 1: Migrate hegelian, writers-workshop, talmudic
- **hegelian/** — dialectic.ts exports prompt builders + parsers, orchestrator.ts uses FrameworkRunner
- **writers-workshop/** — peer.ts + facilitator.ts export prompt/parse functions, orchestrator.ts uses FrameworkRunner
- **talmudic/** — interpreters.ts exports prompt/parse functions, orchestrator.ts uses FrameworkRunner
- All direct `generateObject` imports from `@institutional-reasoning/core` removed

### Task 2: Migrate regulatory-impact, war-gaming, dissertation-committee
- **regulatory-impact/** — analysts.ts exports prompt/parse functions, orchestrator.ts uses FrameworkRunner
- **war-gaming/** — forces.ts, control.ts, observer.ts export prompt/parse functions, orchestrator.ts uses FrameworkRunner
- **dissertation-committee/** — committee.ts exports prompt/parse functions, orchestrator.ts uses FrameworkRunner
- All direct `generateObject` imports removed

### Final Audit
- 26/26 frameworks now have FrameworkRunner
- Zero `@institutional-reasoning` imports remain in any .ts files
- Zero relative imports (`../`) found across all frameworks
- `bun run typecheck` passes clean

## Key Files

### key-files.modified
- frameworks/hegelian/dialectic.ts, orchestrator.ts, index.ts
- frameworks/writers-workshop/peer.ts, facilitator.ts, orchestrator.ts, index.ts
- frameworks/talmudic/interpreters.ts, orchestrator.ts, index.ts
- frameworks/regulatory-impact/analysts.ts, orchestrator.ts, index.ts
- frameworks/war-gaming/forces.ts, control.ts, observer.ts, orchestrator.ts, index.ts
- frameworks/dissertation-committee/committee.ts, orchestrator.ts, index.ts

## Deviations

None.

## Self-Check: PASSED
- [x] All 6 broken frameworks migrated to LLMProvider + FrameworkRunner
- [x] Zero `@institutional-reasoning` imports in .ts files
- [x] TypeScript compiles clean
- [x] 26/26 frameworks standardized
