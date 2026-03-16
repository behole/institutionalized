# Phase 1: Core Hardening - Context

**Gathered:** 2026-03-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Fix the foundation: strict TypeScript, typed errors, provider bugs, and SDK upgrade. All 26 frameworks depend on this core layer. No framework-level changes — only core/ and provider code. The `run()` contract is preserved.

</domain>

<decisions>
## Implementation Decisions

### Error hierarchy design
- Typed error hierarchy: `InstitutionalError` → `ProviderError`, `ValidationError`, `FrameworkError`
- Rich context on every error: framework name, agent name, model, and the prompt that failed
- Always chain original cause via `cause` property — full stack trace preserved
- Machine-readable string enum error codes (e.g., `PROVIDER_RATE_LIMITED`, `VALIDATION_MISSING_INPUT`) — consumers switch on `error.code`

### Retry & timeout behavior
- 3 retries with exponential backoff (1s, 2s, 4s) on transient errors (429, 500)
- Honor `Retry-After` headers from providers — no cap, respect what the provider says
- Default per-agent timeout: 120 seconds
- Cancel timed-out requests via AbortController — actually abort the HTTP request, don't just stop waiting

### Concurrency cap strategy
- Default concurrency limit of 5 for `executeParallel()`
- Overridable via `RunFlags` — callers can pass `concurrency: N` for power users who know their rate limits
- Silent queuing when agents exceed the cap — no user-facing indication
- Per-run shared semaphore — one semaphore per `FrameworkRunner` instance, shared across nested parallel calls

### SDK upgrade approach
- Fix Anthropic system-message-as-user-turn bug FIRST on current SDK (0.32), verify it works, THEN upgrade to ^0.50.0
- Use caret range `^0.50.0` for the Anthropic SDK — allow patch/minor updates automatically
- Remove unused `openai` npm package — the OpenAI provider uses raw `fetch`. Re-add when actually needed.
- Update pricing tables in all providers to current models (Claude 4.x, current OpenAI/OpenRouter models)

### Claude's Discretion
- Parallel failure strategy: how `executeParallel()` reports when multiple agents fail (AggregateError, fail-fast, or partial results)
- Exact exponential backoff jitter implementation
- TypeScript strict mode migration specifics (which `any` types to replace with what)
- `RunFlags` interface shape — what fields it includes beyond `concurrency`

</decisions>

<specifics>
## Specific Ideas

- Fix system message bug before SDK upgrade — isolate changes so regressions are bisectable
- Remove `openai` package entirely rather than leaving it unused — clean dependency list matters for an npm library

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `FrameworkRunner` class (core/orchestrator.ts): Already has `runAgent()` and `runParallel()` — semaphore and retry logic integrate here
- `AuditTrail` class (core/observability.ts): Already tracks per-agent cost, duration, tokens — error tracking can extend this
- `LLMProvider` interface (core/types.ts): Clean abstraction — retry/timeout wraps around `provider.call()`
- `BaseFrameworkConfig` (core/config.ts): Has `validation?: Record<string, any>` — one of the `any` types to replace

### Established Patterns
- Provider pattern: each provider implements `LLMProvider` interface with `call()` and `calculateCost()`
- Orchestration pattern: `FrameworkRunner.runAgent()` wraps provider calls with audit trail recording
- All frameworks export `run()` as entry point — this contract is preserved

### Integration Points
- `AnthropicProvider.call()` (core/providers/anthropic.ts:12-44): System message bug lives here — messages array construction
- `executeParallel()` (core/orchestrator.ts:9-13): Currently unbounded `Promise.all` — needs semaphore wrapper
- `FrameworkRunner.runParallel()` (core/orchestrator.ts:116-138): Also unbounded — should use the shared semaphore
- package.json: `@anthropic-ai/sdk` at `^0.32.1`, `openai` at `^4.76.1` (to be removed), no `typescript` devDependency

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-core-hardening*
*Context gathered: 2026-03-16*
