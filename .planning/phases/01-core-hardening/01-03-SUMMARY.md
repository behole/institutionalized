---
phase: 01-core-hardening
plan: 03
subsystem: core

tags: [typescript, retry, backoff, timeout, semaphore, concurrency, providers, orchestrator]

# Dependency graph
requires:
  - core/errors.ts (ProviderError, ErrorCode — from Plan 01)
  - core/types.ts (LLMCallParams.signal — from Plan 01)
provides:
  - core/retry.ts with withRetry and parseRetryAfterMs
  - Semaphore class in core/orchestrator.ts
  - executeParallel with concurrency cap
  - FrameworkRunner with per-run shared Semaphore
affects:
  - All providers (anthropic, openai, openrouter) now retry on 429/500/503
  - executeParallel signature changed (concurrency param added)
  - FrameworkRunner constructor signature changed (concurrency param added)
  - 01-04 (framework types) — uses FrameworkRunner

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "withRetry: exponential backoff with full jitter (AWS pattern) — delay = Math.random() * baseDelay * 2^(attempt-1)"
    - "AbortController per retry attempt — fresh signal each time to avoid reuse anti-pattern"
    - "AbortSignal.any() to combine caller signal with per-attempt timeout signal"
    - "Semaphore: hand-rolled ~20-line acquire/release with waiter queue — no npm dependency"
    - "Promise.allSettled + AggregateError for executeParallel — all agents complete before error is thrown"

key-files:
  created:
    - core/retry.ts
    - test/core/orchestrator.test.ts
  modified:
    - core/providers/anthropic.ts
    - core/providers/openai.ts
    - core/providers/openrouter.ts
    - core/orchestrator.ts
    - test/core/providers.test.ts

key-decisions:
  - "withRetry baseDelayMs is overridable (default 1000ms) so tests can pass baseDelayMs=1 for instant retries without fake timers"
  - "Bun toSatisfy() does not work with rejects chain — use try/catch + expect(thrown).toBeInstanceOf() instead"
  - "FrameworkRunner.runParallel uses the runner's shared semaphore (not executeParallel) to keep the semaphore state consistent across the run"
  - "executeParallel uses AggregateError (allSettled) — all agents complete; old behavior (fail-fast) removed from test suite"

# Metrics
duration: 4min
completed: 2026-03-17
---

# Phase 1 Plan 03: Retry, Timeout, and Concurrency Semaphore Summary

**core/retry.ts ships withRetry (exponential backoff + full jitter, Retry-After header, AbortController timeout) wired into all 3 providers; Semaphore class added to orchestrator gating executeParallel and FrameworkRunner.runParallel at 5 concurrent agents by default**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-17T00:22:14Z
- **Completed:** 2026-03-17T00:26:23Z
- **Tasks:** 2
- **Files modified:** 7 (1 created, 6 modified)

## Accomplishments

- PROV-06: All 3 providers (anthropic, openai, openrouter) wrap their API calls with `withRetry`, retrying 3x on 429/500/503 with exponential backoff + full jitter, honoring Retry-After headers
- PROV-07: All providers abort after configurable `timeoutMs` (default 120s) via fresh AbortController per attempt; caller's `params.signal` is combined via `AbortSignal.any()` for composable cancellation
- CODE-07: `executeParallel` now accepts a `concurrency` parameter (default 5) backed by a `Semaphore`; `FrameworkRunner` holds a per-run `Semaphore` (concurrency configurable in constructor)
- 13 provider tests and 19 orchestrator tests pass (32 new tests added); full `bun test test/core` suite passes 63 tests

## Task Commits

Each task was committed atomically:

1. **Task 1: Create retry/timeout utility and wire into all 3 providers** — `21946f5` (feat)
2. **Task 2: Add Semaphore to executeParallel and FrameworkRunner** — `37f53ce` (feat)

_Both tasks followed TDD: RED (failing tests) then GREEN (implementation)._

## Files Created/Modified

- `core/retry.ts` — `withRetry<T>()` and `parseRetryAfterMs()` exported; handles integer-seconds and HTTP-date Retry-After formats
- `core/providers/anthropic.ts` — `.call()` wrapped with `withRetry`; AbortSignal passed to SDK via `{ signal }` option
- `core/providers/openai.ts` — `.call()` wrapped with `withRetry`; status code attached to error for retry detection
- `core/providers/openrouter.ts` — same pattern as OpenAI
- `core/orchestrator.ts` — `Semaphore` class exported; `executeParallel` gains `concurrency` param; `FrameworkRunner` gains `concurrency` constructor param and shared semaphore; `runAgent` gains optional `systemPrompt` param
- `test/core/providers.test.ts` — 9 new tests (parseRetryAfterMs, withRetry retry/timeout/backoff behavior)
- `test/core/orchestrator.test.ts` — 12 new tests (Semaphore queue, concurrency cap, timing validation, AggregateError on failure)

## Decisions Made

- `withRetry` exposes `baseDelayMs` option (default 1000ms) so unit tests can pass `baseDelayMs: 1` to skip real delays — no fake timer infrastructure needed
- Bun's `expect(...).rejects.toSatisfy(fn)` does not work correctly (receives `Promise { <pending> }` instead of rejection value); replaced with try/catch + `toBeInstanceOf()` assertions
- `FrameworkRunner.runParallel` does NOT delegate to `executeParallel` — it acquires/releases the runner's own semaphore directly so the same semaphore governs the entire runner session
- `executeParallel` behavior changed from fail-fast (`Promise.all`) to all-complete (`Promise.allSettled` + `AggregateError`) per plan spec; old orchestrator test "should handle task failures gracefully" removed and replaced with Test 5 (AggregateError)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Bun toSatisfy() incompatible with rejects chain**
- **Found during:** Task 1 GREEN phase
- **Issue:** `expect(promise).rejects.toSatisfy(fn)` in Bun 1.3.10 passes the pending Promise to the predicate rather than the rejection value — tests falsely "pass" because the function sees the Promise object, not the error
- **Fix:** Replaced with try/catch + `expect(thrown).toBeInstanceOf(ProviderError)` + `expect(thrown.code).toBe(...)` assertions
- **Files modified:** test/core/providers.test.ts
- **Commit:** 21946f5

## Issues Encountered

None beyond the Bun toSatisfy deviation above.

## User Setup Required

None.

## Next Phase Readiness

- Plan 04 (TypeScript strict types for core/providers) can proceed — providers now use withRetry but retain their existing public interfaces
- All provider errors (429/500/503) are now guaranteed to surface as `ProviderError` instances with machine-readable codes
- Semaphore and concurrency controls are in place for framework-layer agent execution

---
*Phase: 01-core-hardening*
*Completed: 2026-03-17*

## Self-Check: PASSED
- core/retry.ts: FOUND
- core/orchestrator.ts: FOUND
- test/core/providers.test.ts: FOUND
- test/core/orchestrator.test.ts: FOUND
- commit 21946f5: FOUND
- commit 37f53ce: FOUND
