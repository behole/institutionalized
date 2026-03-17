---
phase: 01-core-hardening
plan: 01
subsystem: core
tags: [typescript, errors, type-safety, error-hierarchy]

# Dependency graph
requires: []
provides:
  - TypeScript installed as explicit devDependency (tsc binary resolves)
  - core/errors.ts with typed InstitutionalError hierarchy (ProviderError, ValidationError, FrameworkError)
  - ErrorCode const enum with 6 machine-readable error codes
  - ErrorContext interface for framework/agent/model/prompt tracing
  - LLMCallParams.signal?: AbortSignal contract established
  - core/config.ts validation field typed as Record<string,unknown> (no any)
affects:
  - 01-02 (retry/timeout — throws ProviderError)
  - 01-03 (providers — throws ProviderError with required cause)
  - 01-04 (framework types — FrameworkError usage)
  - all subsequent plans that catch or throw InstitutionalError

# Tech tracking
tech-stack:
  added: [typescript@5.9.3]
  patterns:
    - Const object string enum pattern for ErrorCode (not TypeScript enum keyword)
    - Object.setPrototypeOf in every constructor for instanceof safety across transpilation
    - ProviderError.cause required (not optional) — upstream cause always preserved

key-files:
  created:
    - core/errors.ts
    - test/core/errors.test.ts
  modified:
    - package.json (typescript devDependency added)
    - core/config.ts (any -> unknown)
    - core/types.ts (signal?: AbortSignal added to LLMCallParams)
    - bun.lock

key-decisions:
  - "TypeScript installed as devDependency via bun add -d typescript@5.9.3"
  - "ProviderError.cause is required (non-optional) to enforce upstream cause preservation"
  - "ErrorCode uses const object pattern (not enum keyword) for ES module compatibility and tree-shaking"
  - "core/providers/ type errors deferred — pre-existing, addressed in Plan 04"

patterns-established:
  - "Error pattern: all errors extend InstitutionalError with code, context, cause"
  - "instanceof pattern: Object.setPrototypeOf(this, new.target.prototype) in every constructor"
  - "ErrorContext: frameworkName, agentName, model, prompt on every error"

requirements-completed: [CODE-01, CODE-04]

# Metrics
duration: 2min
completed: 2026-03-17
---

# Phase 1 Plan 01: TypeScript Install and Typed Error Hierarchy Summary

**TypeScript@5.9.3 installed as devDependency; core/errors.ts ships InstitutionalError base class with ProviderError/ValidationError/FrameworkError subclasses, ErrorCode const enum, and ErrorContext interface — all with instanceof-safe constructors**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-17T00:17:46Z
- **Completed:** 2026-03-17T00:19:13Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- TypeScript@5.9.3 installed as explicit devDependency; `bun run typecheck` now resolves `tsc` binary (CODE-01)
- core/errors.ts implements full instanceof-safe error hierarchy with required-cause ProviderError (CODE-04)
- All 8 TDD error tests pass covering instanceof chain, ErrorCode, ErrorContext, cause chaining, and error.name
- core/config.ts and core/types.ts are now type-clean with no `any` usage

## Task Commits

Each task was committed atomically:

1. **Task 1: Install TypeScript + create error hierarchy with tests** - `ae247e1` (feat)
2. **Task 2: Fix any types in core and verify typecheck** - `01919df` (fix)

**Plan metadata:** (docs commit — see below)

_Note: Task 1 was a TDD task (RED then GREEN in single commit as no separate refactor needed)_

## Files Created/Modified
- `core/errors.ts` — InstitutionalError base, ProviderError/ValidationError/FrameworkError subclasses, ErrorCode const enum, ErrorContext interface
- `test/core/errors.test.ts` — 8 tests covering full error hierarchy behavior
- `package.json` — typescript@5.9.3 added to devDependencies
- `core/config.ts` — `validation?` changed from `Record<string,any>` to `Record<string,unknown>`
- `core/types.ts` — `signal?: AbortSignal` added to LLMCallParams interface
- `bun.lock` — updated with new typescript dependency

## Decisions Made
- Used const object pattern for ErrorCode instead of TypeScript `enum` keyword — better ES module compatibility and tree-shaking
- ProviderError.cause typed as required (not optional `cause?`) to enforce the rule that provider failures always preserve upstream cause
- `Object.setPrototypeOf(this, new.target.prototype)` applied in every constructor to ensure instanceof checks work correctly after transpilation
- core/providers/ type errors left as-is — pre-existing, explicitly deferred to Plan 04 (CODE-03, CODE-06)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - TypeScript installed cleanly, tests passed on first GREEN run.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Error hierarchy ready for Plan 02 (retry/timeout) to throw ProviderError with required cause
- Plan 03 (providers) can use ProviderError for all provider call failures
- LLMCallParams.signal AbortSignal contract pre-established for Plan 03 timeout cancellation
- core/ non-provider files are type-clean; frameworks/ and core/providers/ errors remain (addressed in Plan 04)

---
*Phase: 01-core-hardening*
*Completed: 2026-03-17*

## Self-Check: PASSED
- core/errors.ts: FOUND
- test/core/errors.test.ts: FOUND
- core/config.ts: FOUND
- core/types.ts: FOUND
- commit ae247e1: FOUND
- commit 01919df: FOUND
