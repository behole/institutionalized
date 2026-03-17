---
phase: 01-core-hardening
plan: 04
subsystem: api
tags: [typescript, type-safety, llm, anthropic, openai, RunFlags, DEFAULT_MODELS]

requires:
  - phase: 01-core-hardening-01
    provides: core/types.ts with LLMCallParams, LLMProvider, signal abort support

provides:
  - RunFlags typed interface in core/types.ts replacing Record<string, any>
  - DEFAULT_MODELS constant in core/config.ts centralizing all model strings
  - All 26 framework run() signatures typed with RunFlags
  - All framework model strings referencing DEFAULT_MODELS

affects:
  - 01-core-hardening-05
  - 01-core-hardening-06
  - cli.ts (still uses Record<string, any> for flag parsing — future work)

tech-stack:
  added: []
  patterns:
    - "RunFlags interface: typed public API for all framework run() functions"
    - "DEFAULT_MODELS constant: single-file model update pattern"
    - "CLI-specific flags accessed via (flags as Record<string, unknown>) cast pattern"

key-files:
  created:
    - test/core/config.test.ts
  modified:
    - core/types.ts
    - core/config.ts
    - frameworks/aar/index.ts
    - frameworks/aar/types.ts
    - frameworks/architecture-review/index.ts
    - frameworks/architecture-review/types.ts
    - frameworks/consensus-circle/index.ts
    - frameworks/consensus-circle/types.ts
    - frameworks/courtroom/index.ts
    - frameworks/courtroom/types.ts
    - frameworks/delphi/index.ts
    - frameworks/delphi/types.ts
    - frameworks/design-critique/index.ts
    - frameworks/design-critique/types.ts
    - frameworks/devils-advocate/index.ts
    - frameworks/devils-advocate/types.ts
    - frameworks/differential-diagnosis/index.ts
    - frameworks/differential-diagnosis/types.ts
    - frameworks/dissertation-committee/index.ts
    - frameworks/dissertation-committee/types.ts
    - frameworks/grant-panel/index.ts
    - frameworks/grant-panel/types.ts
    - frameworks/hegelian/index.ts
    - frameworks/hegelian/types.ts
    - frameworks/intelligence-analysis/index.ts
    - frameworks/intelligence-analysis/types.ts
    - frameworks/parliamentary/index.ts
    - frameworks/parliamentary/types.ts
    - frameworks/peer-review/index.ts
    - frameworks/peer-review/orchestrator.ts
    - frameworks/phd-defense/index.ts
    - frameworks/phd-defense/types.ts
    - frameworks/pre-mortem/index.ts
    - frameworks/pre-mortem/types.ts
    - frameworks/red-blue/index.ts
    - frameworks/red-blue/types.ts
    - frameworks/regulatory-impact/index.ts
    - frameworks/regulatory-impact/types.ts
    - frameworks/six-hats/index.ts
    - frameworks/six-hats/types.ts
    - frameworks/socratic/index.ts
    - frameworks/socratic/types.ts
    - frameworks/studio/index.ts
    - frameworks/studio/types.ts
    - frameworks/swot/index.ts
    - frameworks/swot/types.ts
    - frameworks/talmudic/index.ts
    - frameworks/talmudic/types.ts
    - frameworks/tumor-board/index.ts
    - frameworks/tumor-board/types.ts
    - frameworks/war-gaming/index.ts
    - frameworks/war-gaming/types.ts
    - frameworks/writers-workshop/index.ts
    - frameworks/writers-workshop/types.ts

key-decisions:
  - "Map flags.verbose to flags.debug (RunFlags field) — verbose is CLI jargon, debug is the typed public API name"
  - "CLI-specific flags (domains, participants, rounds, etc.) accessed via (flags as Record<string, unknown>) cast — avoids breaking CLI contract while maintaining typed signature"
  - "peer-review model strings were in orchestrator.ts, not types.ts — updated orchestrator.ts instead of types.ts to honor CODE-06 spirit"
  - "claude-3-5-sonnet-20241022 (pre-mortem, studio) mapped to DEFAULT_MODELS.CLAUDE_SONNET (closest match per plan instructions)"

requirements-completed: [CODE-03, CODE-06]

duration: 12min
completed: 2026-03-17
---

# Phase 01 Plan 04: RunFlags and DEFAULT_MODELS Migration Summary

**RunFlags typed interface replaces `Record<string, any>` across all 26 framework run() signatures, and DEFAULT_MODELS centralizes model strings in a single const for project-wide model updates**

## Performance

- **Duration:** 12 min
- **Started:** 2026-03-17T00:22:19Z
- **Completed:** 2026-03-17T00:34:31Z
- **Tasks:** 2
- **Files modified:** 55 (core: 3, framework index.ts: 26, framework types.ts: 25, orchestrator.ts: 1)

## Accomplishments

- Added `RunFlags` interface to `core/types.ts` with 7 typed fields: concurrency, timeoutMs, model, temperature, provider, config, debug
- Added `DEFAULT_MODELS` const to `core/config.ts` with 6 model constants (CLAUDE_SONNET, CLAUDE_HAIKU, CLAUDE_OPUS, GPT4O, GPT4O_MINI, DEFAULT)
- Swept all 26 frameworks: replaced `Record<string, any>` with `RunFlags` in every `run()` signature
- Replaced all hardcoded `"claude-3-7-sonnet-20250219"` strings with `DEFAULT_MODELS.CLAUDE_SONNET` references across 55 files
- 4 passing tests for DEFAULT_MODELS in `test/core/config.test.ts`
- Zero new TypeScript errors (pre-existing errors in openai.ts, openrouter.ts, delphi/index.ts unchanged)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add RunFlags interface and DEFAULT_MODELS constant to core** - `818af5e` (feat)
2. **Task 2: Migrate all 26 frameworks to use RunFlags and DEFAULT_MODELS** - `2dac64c` (feat)

## Files Created/Modified

- `/core/types.ts` - Added RunFlags interface (7 fields)
- `/core/config.ts` - Added DEFAULT_MODELS const (6 model keys) as `as const`
- `/test/core/config.test.ts` - Created with 4 tests for DEFAULT_MODELS
- `frameworks/*/index.ts` (26 files) - RunFlags import + signature change + verbose->debug mapping
- `frameworks/*/types.ts` (25 files) - DEFAULT_MODELS import + model string replacement
- `frameworks/peer-review/orchestrator.ts` - DEFAULT_MODELS import + model string replacement (exception: models live in orchestrator not types)

## Decisions Made

- `flags.verbose` mapped to `flags.debug` (RunFlags field) — verbose is CLI jargon, debug is the typed public API name
- CLI-specific flags (domains, participants, rounds, etc.) accessed via `(flags as Record<string, unknown>)` cast — avoids breaking CLI contract while maintaining typed signature
- peer-review model strings were in orchestrator.ts, not types.ts — updated orchestrator.ts to satisfy CODE-06 spirit
- `claude-3-5-sonnet-20241022` (pre-mortem pessimists, studio peers) mapped to `DEFAULT_MODELS.CLAUDE_SONNET` per plan instruction: "closest match"

## Deviations from Plan

None — plan executed exactly as written, except one structural observation:

**Structural note (not a deviation): peer-review framework exception**

- peer-review/types.ts has no hardcoded model strings (models defined in orchestrator.ts)
- Updated orchestrator.ts instead of types.ts to fulfill CODE-06
- This means `grep -r "DEFAULT_MODELS" frameworks/*/types.ts | wc -l` returns 25 unique files instead of 26
- CODE-06 intent (centralized model management) is fully satisfied

## Issues Encountered

- Pre-existing TypeScript errors in `core/providers/openai.ts`, `core/providers/openrouter.ts`, `frameworks/delphi/index.ts`, and `frameworks/dissertation-committee/orchestrator.ts` were present before this plan and unchanged after — documented but not in scope for this plan.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- RunFlags typed interface ready for use in CLI, tests, and MCP server
- DEFAULT_MODELS ready for use in any new framework
- All 26 frameworks have typed public APIs
- Pre-existing typecheck errors (openai/openrouter providers, delphi, dissertation-committee) remain as technical debt for future plans

---
*Phase: 01-core-hardening*
*Completed: 2026-03-17*
