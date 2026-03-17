---
phase: 01-core-hardening
verified: 2026-03-16T00:00:00Z
status: passed
score: 5/5 success criteria verified
re_verification:
  previous_status: gaps_found
  previous_score: 4/5
  gaps_closed:
    - "bun run typecheck passes with zero errors — OpenAIChatResponse and OpenRouterChatResponse typed interfaces added; response.json() cast to typed interfaces eliminating all TS18046 errors"
  gaps_remaining: []
  regressions: []
human_verification: []
---

# Phase 1: Core Hardening Verification Report

**Phase Goal:** Harden the shared core so every provider call is typed, retriable, and budget-aware — giving all 26 frameworks a reliable foundation.
**Verified:** 2026-03-16
**Status:** passed — 5/5 ROADMAP success criteria met
**Re-verification:** Yes — after gap closure (previous score 4/5, gap was TS18046 errors in openai.ts and openrouter.ts)

## Goal Achievement

### Observable Truths (from ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `bun run typecheck` passes with zero errors against TypeScript strict mode (no `any` escapes in core) | VERIFIED | `bun run typecheck` exits 0 with no output. `OpenAIChatResponse` and `OpenRouterChatResponse` interfaces added; `response.json() as OpenAIChatResponse` / `as OpenRouterChatResponse` casts at lines 78 and 76 respectively. Previously-failing TS18046 errors resolved. Framework errors (delphi, dissertation-committee) also resolved — entire repo is clean. |
| 2 | All 26 framework `run()` signatures accept `RunFlags` typed interface instead of `Record<string, any>` | VERIFIED | `grep -r "Record<string, any>" frameworks/*/index.ts` returns 0 matches. `grep -r "RunFlags" frameworks/*/index.ts` returns 52 matches. No regression from previous verification. |
| 3 | Typed error hierarchy exists — catching `InstitutionalError` catches `ProviderError`, `ValidationError`, and `FrameworkError` | VERIFIED | `core/errors.ts` implements full hierarchy with `Object.setPrototypeOf` instanceof safety. 63 tests pass (0 failures) including instanceof chain tests. No regression. |
| 4 | The Anthropic provider sends system prompts in the `system` parameter, not as a user-turn message | VERIFIED | `core/providers/anthropic.ts` line 27: `system: params.systemPrompt` as top-level param. Messages array filtered with `.filter((m) => m.role !== "system")`. 63 tests pass. No regression. |
| 5 | `@anthropic-ai/sdk` is at ^0.50.0 and `executeParallel()` has a configurable concurrency cap | VERIFIED | `package.json`: `"@anthropic-ai/sdk": "^0.79.0"`. `executeParallel` accepts `concurrency = 5` backed by `Semaphore` class. No regression. |

**Score:** 5/5 success criteria verified

### Gap Closure Detail

**Previously-failing gap: TS18046 errors in openai.ts and openrouter.ts**

Fixed by adding typed response interfaces and casting `response.json()` to them:

- `core/providers/openai.ts` lines 5-22: `OpenAIChatResponse` interface declaring `id`, `object`, `model`, `choices`, and `usage`. Line 78: `const data = await response.json() as OpenAIChatResponse`.
- `core/providers/openrouter.ts` lines 4-21: `OpenRouterChatResponse` interface (identical shape). Line 76: `const data = await response.json() as OpenRouterChatResponse`.

All 20 previously-failing TS18046 errors are resolved. The previously-noted framework errors in `frameworks/delphi/index.ts` (TS2339) and `frameworks/dissertation-committee/orchestrator.ts` (TS2440) are also resolved. `bun run typecheck` exits 0 — clean across the entire repo.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `core/errors.ts` | Typed error hierarchy | VERIFIED | Full hierarchy, instanceof-safe. Unchanged from previous verification. |
| `test/core/errors.test.ts` | Error hierarchy tests | VERIFIED | 8 tests covering instanceof chain, ErrorCode, ErrorContext, cause chaining. Pass. |
| `core/retry.ts` | withRetry and parseRetryAfterMs | VERIFIED | 174 lines, exponential backoff + full jitter + AbortController. Unchanged. |
| `core/orchestrator.ts` | Semaphore, executeParallel, FrameworkRunner | VERIFIED | Semaphore class, executeParallel(concurrency=5), FrameworkRunner. Unchanged. |
| `core/types.ts` | RunFlags interface | VERIFIED | 7 typed fields: concurrency, timeoutMs, model, temperature, provider, config, debug. Unchanged. |
| `core/config.ts` | DEFAULT_MODELS constant | VERIFIED | 6 model keys as const. Unchanged. |
| `test/core/providers.test.ts` | Provider unit tests | VERIFIED | 270 lines. Tests for system prompt placement, retry, timeout, Retry-After header. Pass. |
| `test/core/orchestrator.test.ts` | Orchestrator/concurrency tests | VERIFIED | 332 lines, 19 tests. Semaphore queue, concurrency cap, timing validation. Pass. |
| `test/core/config.test.ts` | DEFAULT_MODELS tests | VERIFIED | 37 lines, 4 tests. All 6 keys and readonly assertion. Pass. |
| `core/providers/anthropic.ts` | Fixed AnthropicProvider | VERIFIED | system prompt via top-level param, withRetry wrapper, AbortSignal.any(). Unchanged. |
| `core/providers/openai.ts` | withRetry wired, fully typed | VERIFIED | `OpenAIChatResponse` interface added. `response.json() as OpenAIChatResponse`. No TS errors. |
| `core/providers/openrouter.ts` | withRetry wired, fully typed | VERIFIED | `OpenRouterChatResponse` interface added. `response.json() as OpenRouterChatResponse`. No TS errors. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `core/providers/openai.ts` | typed response fields | `OpenAIChatResponse` interface + cast | WIRED | Line 78: `response.json() as OpenAIChatResponse`. All `.choices`, `.model`, `.usage`, `.id` accesses now typed. |
| `core/providers/openrouter.ts` | typed response fields | `OpenRouterChatResponse` interface + cast | WIRED | Line 76: `response.json() as OpenRouterChatResponse`. Identical pattern. |
| `core/providers/anthropic.ts` | `core/retry.ts` | `withRetry` wrapper | WIRED | `import { withRetry } from "../retry"`. Fetch call wrapped. Unchanged. |
| `core/orchestrator.ts` | `Semaphore` | acquire/release around each agent | WIRED | `executeParallel` creates `new Semaphore(concurrency)`, wraps agents with acquire/release in try/finally. Unchanged. |
| `frameworks/*/index.ts` | `core/types.ts` | `import type { RunFlags }` | WIRED | 52 matches across 26 framework index.ts files. No regressions. |
| `frameworks/*/types.ts` | `core/config.ts` | `import { DEFAULT_MODELS }` | WIRED | 26 framework files import DEFAULT_MODELS. Unchanged. |
| `core/errors.ts` | `InstitutionalError` | class inheritance chain | WIRED | `ProviderError extends InstitutionalError`, `ValidationError extends InstitutionalError`, `FrameworkError extends InstitutionalError`. Unchanged. |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|---------|
| CODE-01 | 01-01 | TypeScript as explicit devDependency, `bun run typecheck` exits 0 | SATISFIED | `bun run typecheck` exits 0 with zero errors. Full requirement met (previously met only the binary-resolves sub-requirement). |
| CODE-03 | 01-04 | Replace `flags: Record<string, any>` with typed `RunFlags` in all 26 `run()` signatures | SATISFIED | Zero `Record<string, any>` in frameworks/*/index.ts. All 26 use RunFlags. |
| CODE-04 | 01-01 | Typed error hierarchy: `InstitutionalError` → `ProviderError`, `ValidationError`, `FrameworkError` | SATISFIED | `core/errors.ts` implements full hierarchy, instanceof-safe, required cause on ProviderError. |
| CODE-06 | 01-04 | Centralize model constants in `core/config.ts` replacing hardcoded model strings | SATISFIED | `DEFAULT_MODELS` const in core/config.ts. 26 framework files import and use it. |
| CODE-07 | 01-03 | Concurrency cap (semaphore) in `executeParallel()` to prevent rate limit bursts | SATISFIED | `Semaphore` class in orchestrator.ts. `executeParallel` accepts `concurrency=5` param. `FrameworkRunner` holds per-run semaphore. |
| PROV-01 | 01-02 | Fix Anthropic provider system message bug | SATISFIED | `core/providers/anthropic.ts` line 27: `system: params.systemPrompt`. Messages array filtered for system roles. |
| PROV-05 | 01-02 | Upgrade `@anthropic-ai/sdk` from ^0.32.1 to ^0.50.0+ | SATISFIED | `package.json`: `"@anthropic-ai/sdk": "^0.79.0"`. openai SDK removed. |
| PROV-06 | 01-03 | Retry with exponential backoff for providers on 429/500 errors | SATISFIED | `withRetry` in core/retry.ts wired into all 3 providers. Retries 3x on 429/500/503 with full-jitter exponential backoff. Honors Retry-After header. |
| PROV-07 | 01-03 | Configurable per-agent timeouts via AbortController | SATISFIED | `withRetry` creates fresh AbortController per attempt with `timeoutMs=120_000` default. Combines with `params.signal` via `AbortSignal.any()`. |

All 9 requirement IDs are SATISFIED. No orphaned requirements.

### Anti-Patterns Found

None. `bun run typecheck` exits 0 — zero TS errors in the entire repo. No TODO/FIXME/placeholder comments or stub implementations in core files.

### Human Verification Required

None. All success criteria are verifiable programmatically and all pass.

### Summary

Phase 1 goal is fully achieved. The single blocking gap from the initial verification — `response.json()` returning `unknown` in both OpenAI and OpenRouter providers — was resolved by adding `OpenAIChatResponse` and `OpenRouterChatResponse` typed interfaces and casting the `response.json()` return value to them. `bun run typecheck` now exits 0 across the entire repo.

All Phase 1 deliverables are complete:
- Error hierarchy (CODE-04): instanceof-safe, 8 passing tests
- Anthropic system prompt fix (PROV-01): tested with mock client
- SDK upgrade to 0.79.0 (PROV-05): openai SDK removed
- withRetry in all 3 providers (PROV-06, PROV-07): 9 provider tests pass
- Semaphore and concurrency cap (CODE-07): 19 orchestrator tests pass
- RunFlags across all 26 frameworks (CODE-03): zero Record<string,any> remaining
- DEFAULT_MODELS across all 26 frameworks (CODE-06): 26 files import it
- Strict TypeScript (CODE-01): zero errors, exits 0
- 63 total tests pass with 0 failures

---

_Verified: 2026-03-16_
_Verifier: Claude (gsd-verifier)_
