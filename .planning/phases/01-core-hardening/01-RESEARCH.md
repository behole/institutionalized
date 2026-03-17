# Phase 1: Core Hardening - Research

**Researched:** 2026-03-16
**Domain:** TypeScript strict mode, typed error hierarchies, Anthropic SDK API, concurrency control, retry/timeout patterns
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Error hierarchy design:**
- Typed error hierarchy: `InstitutionalError` -> `ProviderError`, `ValidationError`, `FrameworkError`
- Rich context on every error: framework name, agent name, model, and the prompt that failed
- Always chain original cause via `cause` property — full stack trace preserved
- Machine-readable string enum error codes (e.g., `PROVIDER_RATE_LIMITED`, `VALIDATION_MISSING_INPUT`) — consumers switch on `error.code`

**Retry and timeout behavior:**
- 3 retries with exponential backoff (1s, 2s, 4s) on transient errors (429, 500)
- Honor `Retry-After` headers from providers — no cap, respect what the provider says
- Default per-agent timeout: 120 seconds
- Cancel timed-out requests via AbortController — actually abort the HTTP request, don't just stop waiting

**Concurrency cap strategy:**
- Default concurrency limit of 5 for `executeParallel()`
- Overridable via `RunFlags` — callers can pass `concurrency: N`
- Silent queuing when agents exceed the cap — no user-facing indication
- Per-run shared semaphore — one semaphore per `FrameworkRunner` instance, shared across nested parallel calls

**SDK upgrade approach:**
- Fix Anthropic system-message-as-user-turn bug FIRST on current SDK (0.32), verify it works, THEN upgrade to ^0.50.0
- Use caret range `^0.50.0` for the Anthropic SDK
- Remove unused `openai` npm package — the OpenAI provider uses raw `fetch`
- Update pricing tables in all providers to current models (Claude 4.x, current OpenAI/OpenRouter models)

### Claude's Discretion
- Parallel failure strategy: how `executeParallel()` reports when multiple agents fail (AggregateError, fail-fast, or partial results)
- Exact exponential backoff jitter implementation
- TypeScript strict mode migration specifics (which `any` types to replace with what)
- `RunFlags` interface shape — what fields it includes beyond `concurrency`

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CODE-01 | Add `typescript` as explicit devDependency and make `bun run typecheck` pass with strict mode | `typescript` package is missing from devDependencies; `bun tsc` fails because `tsc` binary not found; `tsconfig.json` already has `"strict": true` so adding the package is sufficient |
| CODE-03 | Replace `flags: Record<string, any>` with typed `RunFlags` interface in all 26 `run()` signatures | All 26 framework `index.ts` files use `flags: Record<string, any> = {}`; a single shared `RunFlags` interface in `core/types.ts` covers all of them |
| CODE-04 | Implement typed error hierarchy (`InstitutionalError` -> `ProviderError`, `ValidationError`, `FrameworkError`) | No error hierarchy exists; bare `throw new Error(...)` everywhere; new `core/errors.ts` file is the implementation target |
| CODE-06 | Centralize model constants in `core/config.ts` (`DEFAULT_MODELS`) replacing 26 hardcoded model strings | 72 hardcoded model string instances across `frameworks/*/types.ts`; `core/config.ts` already exists and is the right place |
| CODE-07 | Add concurrency cap (semaphore) to `executeParallel()` to prevent rate limit bursts | `executeParallel()` in `core/orchestrator.ts` is a bare `Promise.all`; `FrameworkRunner.runParallel()` is also unbounded; semaphore needs to be shared per-runner instance |
| PROV-01 | Fix Anthropic provider system message bug (currently sends system prompt as user-turn message) | Bug confirmed: `anthropic.ts` prepends `{ role: "system", content }` to messages array then maps `system` -> `user`; fix: use top-level `system` param in `messages.create()` |
| PROV-05 | Upgrade `@anthropic-ai/sdk` from ^0.32.1 to ^0.50.0+ | Current: `^0.32.1`; latest: `^0.70.0`; fix PROV-01 first, then upgrade |
| PROV-06 | Add retry with exponential backoff for OpenAI/OpenRouter providers on 429/500 errors | Both providers use raw `fetch` with no retry logic; retry wrapper belongs in a shared utility |
| PROV-07 | Add configurable per-agent timeouts via AbortController | No timeout exists anywhere; `FrameworkRunner.runAgent()` calls `provider.call()` with no signal; `LLMCallParams` needs an optional `signal` field |
</phase_requirements>

---

## Summary

Phase 1 is a pure refactoring phase with zero new user-facing features. The work divides into five independent streams: (1) TypeScript setup, (2) error hierarchy creation, (3) Anthropic provider bug fix + SDK upgrade, (4) retry/timeout infrastructure, and (5) concurrency control. Each stream touches different files with minimal overlap.

The biggest risk is the SDK upgrade (PROV-05). The `@anthropic-ai/sdk` jumped from 0.32 to 0.70 — likely includes breaking type changes. The locked decision to fix the system-message bug first on 0.32, verify, then upgrade is the correct sequencing to keep regressions bisectable. The OpenAI and OpenRouter providers use raw `fetch` and are unaffected by the SDK upgrade.

All 26 frameworks share a single pattern: `run(input, flags: Record<string, any> = {})`. The `RunFlags` interface migration is a mechanical find-and-replace but touches all 26 files. The model constant centralization (CODE-06) also touches all 26 framework `types.ts` files. These two tasks should be batched to minimize framework-file churn.

**Primary recommendation:** Implement in this order: CODE-01 (TypeScript setup) -> CODE-04 (error hierarchy) -> PROV-01 (system message bug fix) -> PROV-05 (SDK upgrade) -> PROV-06 + PROV-07 (retry/timeout as one task) -> CODE-07 (semaphore) -> CODE-03 + CODE-06 (framework-wide RunFlags + model constants in a single sweep).

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| typescript | ^5.x | Type checking | Required for `bun tsc --noEmit` to work; currently missing from devDependencies |
| @anthropic-ai/sdk | ^0.50.0 (target) | Anthropic API client | Official SDK; current is ^0.32.1, latest is ^0.70.0 |
| bun (runtime) | 1.3.x (installed) | Test runner, scripts | Already the project runtime; `bun:test` used in test/core |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| (no new libraries needed) | — | — | All patterns implemented hand-rolled in core/ |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Hand-rolled semaphore | `async-sema` (Vercel), `p-limit` | Both are tiny, well-tested. But this project has zero dependencies beyond the SDK+openai (latter being removed). A ~20-line semaphore keeps the dep tree clean. |
| Hand-rolled retry | `p-retry`, `exponential-backoff` npm | Same argument — `p-retry` is 1KB and would work. But retry is ~30 lines here; no library justified. |
| `AggregateError` for multi-failure | Custom `ParallelError` extends `InstitutionalError` | `AggregateError` is a native JS class (ES2021). Prefer extending it or wrapping it in `ProviderError`. Using native class avoids inventing yet another error type. |

**Installation (CODE-01 only):**
```bash
bun add -d typescript
```

---

## Architecture Patterns

### Recommended Project Structure (additions only)

```
core/
├── errors.ts          # NEW: InstitutionalError hierarchy (CODE-04)
├── types.ts           # MODIFY: add RunFlags interface, AbortSignal to LLMCallParams
├── config.ts          # MODIFY: add DEFAULT_MODELS constant (CODE-06)
├── orchestrator.ts    # MODIFY: add semaphore to executeParallel + FrameworkRunner.runParallel
├── providers/
│   ├── anthropic.ts   # MODIFY: fix system param bug, add retry/timeout (PROV-01, PROV-05, PROV-06, PROV-07)
│   ├── openai.ts      # MODIFY: add retry/timeout (PROV-06, PROV-07)
│   └── openrouter.ts  # MODIFY: add retry/timeout (PROV-06, PROV-07)
└── retry.ts           # NEW (optional): shared retry/backoff utility used by all three providers
```

### Pattern 1: Anthropic System Prompt Fix

**What:** The Anthropic Messages API does not accept `role: "system"` in the messages array. System prompts must be passed as a top-level `system` parameter.

**Current bug in `core/providers/anthropic.ts`:**
```typescript
// BUG: prepends system role to messages array, then maps it to "user"
const messages = params.systemPrompt
  ? [{ role: "system" as const, content: params.systemPrompt }, ...params.messages]
  : params.messages;

const response = await this.client.messages.create({
  model: params.model,
  max_tokens: params.maxTokens || 4096,
  messages: messages.map((m) => ({
    role: m.role === "system" ? "user" : m.role,  // BUG: system becomes user
    content: m.content,
  })),
});
```

**Fix (verified against official Anthropic API docs):**
```typescript
// Source: https://platform.claude.com/docs/en/api/typescript/messages/create
const response = await this.client.messages.create({
  model: params.model,
  max_tokens: params.maxTokens || 4096,
  temperature: params.temperature ?? 0.7,
  system: params.systemPrompt,          // top-level system param
  messages: params.messages
    .filter((m) => m.role !== "system") // strip any stray system messages
    .map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
});
```

**Note:** The `system` param accepts `string | Array<TextBlockParam>`. Passing a plain string is correct and sufficient. The `temperature` field type changes in 0.50+ — verify no breaking change needed after upgrade.

### Pattern 2: Error Hierarchy

**What:** A typed error class hierarchy rooted at `InstitutionalError`. All thrown errors in the library extend this root so consumers can catch a single type.

**Structure:**
```typescript
// Source: TypeScript handbook — custom error classes with cause chaining
export class InstitutionalError extends Error {
  constructor(
    message: string,
    public readonly code: ErrorCode,
    public readonly context: ErrorContext,
    options?: { cause?: unknown }
  ) {
    super(message, options); // ES2022 cause chaining
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype); // fix instanceof in transpiled code
  }
}

export class ProviderError extends InstitutionalError { ... }
export class ValidationError extends InstitutionalError { ... }
export class FrameworkError extends InstitutionalError { ... }

export const ErrorCode = {
  PROVIDER_RATE_LIMITED: "PROVIDER_RATE_LIMITED",
  PROVIDER_TIMEOUT: "PROVIDER_TIMEOUT",
  PROVIDER_API_ERROR: "PROVIDER_API_ERROR",
  VALIDATION_MISSING_INPUT: "VALIDATION_MISSING_INPUT",
  VALIDATION_INVALID_CONFIG: "VALIDATION_INVALID_CONFIG",
  FRAMEWORK_EXECUTION_FAILED: "FRAMEWORK_EXECUTION_FAILED",
} as const;

export type ErrorCode = typeof ErrorCode[keyof typeof ErrorCode];

export interface ErrorContext {
  frameworkName?: string;
  agentName?: string;
  model?: string;
  prompt?: string;
}
```

**Critical:** `Object.setPrototypeOf(this, new.target.prototype)` is required for `instanceof` checks to work correctly when TypeScript targets ES5/ES6 and extends `Error`. With `target: "ES2022"` in `tsconfig.json` this is less critical but still a safe best-practice.

### Pattern 3: Semaphore for Concurrency Control

**What:** A counting semaphore that limits concurrent `executeParallel` slots. Queues excess agents silently.

```typescript
// Hand-rolled semaphore — no external dependency needed
export class Semaphore {
  private permits: number;
  private queue: Array<() => void> = [];

  constructor(permits: number) {
    this.permits = permits;
  }

  async acquire(): Promise<void> {
    if (this.permits > 0) {
      this.permits--;
      return;
    }
    return new Promise((resolve) => this.queue.push(resolve));
  }

  release(): void {
    const next = this.queue.shift();
    if (next) {
      next(); // hand permit directly to next waiter
    } else {
      this.permits++;
    }
  }
}

// Usage in executeParallel:
export async function executeParallel<T>(
  agents: (() => Promise<T>)[],
  concurrency = 5
): Promise<T[]> {
  const sem = new Semaphore(concurrency);
  return Promise.all(
    agents.map(async (agent) => {
      await sem.acquire();
      try {
        return await agent();
      } finally {
        sem.release();
      }
    })
  );
}
```

**Per-runner shared semaphore:** `FrameworkRunner` should hold a single `Semaphore` instance created in its constructor (using the concurrency value from `RunFlags`). `runParallel()` passes this semaphore down. This ensures all nested parallel calls within one framework invocation share the same limit.

### Pattern 4: Retry with Exponential Backoff and AbortController Timeout

**What:** Wraps any `() => Promise<LLMResponse>` with retry logic (3 attempts, 1s/2s/4s backoff) and a per-call AbortController timeout.

```typescript
// Shared utility for all three providers
export async function withRetry<T>(
  fn: (signal: AbortSignal) => Promise<T>,
  options: {
    maxAttempts?: number;   // default 3
    timeoutMs?: number;     // default 120_000
    retryOn?: (status: number) => boolean;
  } = {}
): Promise<T> {
  const { maxAttempts = 3, timeoutMs = 120_000, retryOn = (s) => s === 429 || s === 500 } = options;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      return await fn(controller.signal);
    } catch (err) {
      clearTimeout(timer);
      if (controller.signal.aborted) {
        throw new ProviderError("Request timed out", ErrorCode.PROVIDER_TIMEOUT, { ... }, { cause: err });
      }
      // Check for Retry-After header (via err.response?.headers or err.status)
      if (attempt < maxAttempts && isRetryable(err, retryOn)) {
        const retryAfter = extractRetryAfter(err); // parse Retry-After header if present
        const backoffMs = retryAfter ?? (1000 * Math.pow(2, attempt - 1));
        await sleep(backoffMs);
        continue;
      }
      throw wrapAsProviderError(err);
    } finally {
      clearTimeout(timer);
    }
  }
  throw new ProviderError("Max retries exceeded", ErrorCode.PROVIDER_API_ERROR, { ... });
}
```

**Retry-After header extraction:** Anthropic SDK throws typed errors with `.headers` property. Raw `fetch` responses expose headers directly. The `extractRetryAfter` helper must handle both cases. For the Anthropic SDK (0.50+), error objects include response headers accessible via `err.headers?.['retry-after']`.

**LLMCallParams change:** Add `signal?: AbortSignal` to allow callers to pass an external abort signal that can cancel a request before the timeout fires.

### Pattern 5: RunFlags Interface

**What:** A typed interface replacing `Record<string, any>` in all 26 `run()` function signatures.

```typescript
// Add to core/types.ts
export interface RunFlags {
  concurrency?: number;       // default 5 — passed to executeParallel
  timeoutMs?: number;         // default 120_000 — per-agent timeout
  model?: string;             // override default model for all agents
  temperature?: number;       // override default temperature
  provider?: "anthropic" | "openai" | "openrouter";
  config?: Record<string, unknown>;  // framework-specific config blob (replaces flags.config)
  debug?: boolean;            // enable verbose logging
}
```

**Migration pattern for each of 26 frameworks:**
```typescript
// Before
export async function run(input: FrameworkInput, flags: Record<string, any> = {}): Promise<Result>

// After
import type { RunFlags } from "@core/types";
export async function run(input: FrameworkInput, flags: RunFlags = {}): Promise<Result>
```

**Note:** `config?: Record<string, unknown>` (not `any`) for the framework-specific config blob. This replaces `flags.config || {}` patterns already in use (see courtroom's `flags.config`).

### Pattern 6: DEFAULT_MODELS in core/config.ts

**What:** A single exported constant replacing 72+ hardcoded model strings across 26 `frameworks/*/types.ts` files.

```typescript
// Add to core/config.ts
export const DEFAULT_MODELS = {
  // Current Anthropic models (March 2026)
  CLAUDE_SONNET: "claude-3-7-sonnet-20250219",
  CLAUDE_HAIKU: "claude-3-5-haiku-20241022",
  CLAUDE_OPUS: "claude-3-opus-20240229",
  // Current OpenAI models
  GPT4O: "gpt-4o",
  GPT4O_MINI: "gpt-4o-mini",
  // Default for most agents
  DEFAULT: "claude-3-7-sonnet-20250219",
} as const;
```

**Migration:** Each `frameworks/*/types.ts` replaces string literals with `DEFAULT_MODELS.CLAUDE_SONNET` etc. The framework types files keep their typed `models: Record<string, string>` shape — they just pull default values from the central constant.

### Anti-Patterns to Avoid

- **Putting system prompt in messages array for Anthropic:** The Anthropic Messages API does not support `role: "system"` in the messages array. Passing it there causes it to be silently converted to a user turn, corrupting the conversation context.
- **Shared AbortController across retries:** Create a fresh `AbortController` on each retry attempt. Reusing one after `abort()` has been called means the signal is permanently aborted.
- **`instanceof Error` checks on cross-realm errors:** Always use `Object.setPrototypeOf(this, new.target.prototype)` in custom Error subclasses to preserve `instanceof` behavior across module boundaries.
- **`Promise.all` fail-fast obscuring errors:** When multiple parallel agents fail, `Promise.all` only surfaces the first rejection. For the parallel failure strategy (Claude's discretion), using `Promise.allSettled` + checking results, then throwing an `AggregateError` wrapping all failures, is the correct pattern.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Retry-After header parsing | Custom header parser | Parse `parseInt(headers['retry-after']) * 1000` or `Date.parse(headers['retry-after']) - Date.now()` — two cases, ~5 lines | The header is either a delta-seconds integer or an HTTP-date string |
| TypeScript strict null migration | Automated codemods | Manual: fix the 3 `any` occurrences in core/ + 26 in frameworks/ directly | The codebase is small enough; no codemod tool justified |
| AbortSignal combination | Custom "race" signal | Use `AbortSignal.any([externalSignal, timeoutSignal])` (Node 20+/Bun 1.x built-in) | Bun 1.3+ supports this natively |

**Key insight:** Retry and concurrency primitives are 20-30 lines in this codebase. Adding npm packages for problems this small increases supply-chain risk more than it reduces code complexity. The project's goal is to be a clean npm library itself.

---

## Common Pitfalls

### Pitfall 1: SDK Type Mismatch After Upgrade

**What goes wrong:** After upgrading from `@anthropic-ai/sdk` 0.32 to 0.50+, TypeScript errors appear at call sites because the SDK types changed (e.g., `temperature` became `number | null | undefined` in some versions, or response type shapes changed).

**Why it happens:** 47 minor version jumps with breaking type changes is normal for a pre-1.0 SDK.

**How to avoid:** Fix the system message bug on 0.32 first (PROV-01). Commit and verify. Then upgrade the SDK (PROV-05) and fix any resulting TypeScript errors in a separate commit. The two changes are now independently bisectable.

**Warning signs:** Type errors mentioning `Anthropic.MessageParam`, `Anthropic.ContentBlock`, or `temperature` after upgrade.

### Pitfall 2: `any` Types in Strict Mode Cascade

**What goes wrong:** The `any` in `BaseFrameworkConfig.validation?: Record<string, any>` propagates — all consumers of `validation` fields also become `any` without TypeScript complaining. The problem is invisible until strict mode is enforced.

**Why it happens:** TypeScript's `strict` flag includes `noImplicitAny` but not `no-explicit-any`. Explicit `any` is always allowed unless you add `@typescript-eslint/no-explicit-any`.

**How to avoid:** Replace `Record<string, any>` with `Record<string, unknown>` in `core/config.ts` and `core/validators.ts`. `unknown` forces callers to narrow the type before use, which surfaces unsafe access patterns.

**Warning signs:** Framework code doing `flags.config.someField` without a null check — this compiles fine with `any` but fails at runtime.

### Pitfall 3: `AbortController` Timer Leak

**What goes wrong:** If `clearTimeout()` is not called in the `finally` block after a successful provider call, the timer fires after the call completes and aborts the next call using a different controller (if the variable is shared) or just fires into the void wasting resources.

**Why it happens:** Easy to forget `clearTimeout` in the success path when only thinking about error paths.

**How to avoid:** Always use `try/finally` — `clearTimeout(timer)` in `finally` runs on both success and failure.

**Warning signs:** Intermittent `AbortError` in tests when calls succeed but a lingering timer fires.

### Pitfall 4: Semaphore Deadlock on Nested Calls

**What goes wrong:** If a framework's orchestrator calls `runParallel()` inside an agent that was itself started by `runParallel()`, and both use the same semaphore, the inner calls will wait for permits held by outer calls — potential deadlock if concurrency cap equals nesting depth.

**Why it happens:** The locked decision is "per-run shared semaphore across nested parallel calls" — this is intentional but means deeply nested parallel patterns exhaust the semaphore.

**How to avoid:** Keep framework orchestrators flat (sequential outer call, parallel inner agents). The existing 26 frameworks all use flat orchestration patterns. Document the constraint.

**Warning signs:** `executeParallel` hanging indefinitely in test when concurrency = 1 and an agent itself calls `executeParallel`.

### Pitfall 5: Missing `cause` on Re-thrown Errors

**What goes wrong:** Converting a raw provider exception (Anthropic SDK error, fetch error) to a `ProviderError` without passing `{ cause: originalError }` drops the original stack trace, making debugging nearly impossible in production.

**Why it happens:** Easy to `throw new ProviderError(msg, code, ctx)` and forget the cause.

**How to avoid:** The `InstitutionalError` constructor should require `cause` be passed for all subclasses that wrap third-party errors. Make it a required parameter (not optional) for `ProviderError`.

---

## Code Examples

Verified patterns from official sources:

### Anthropic messages.create() with top-level system param

```typescript
// Source: https://platform.claude.com/docs/en/api/typescript/messages/create
const message = await client.messages.create({
  model: "claude-3-7-sonnet-20250219",
  max_tokens: 4096,
  system: "You are a strict legal analyst.",  // top-level — NOT in messages array
  messages: [
    { role: "user", content: "Evaluate this contract clause." }
  ]
});
```

### TypeScript `satisfies` for error codes (avoids `as const` limitations)

```typescript
// Pattern: string enum via const object (avoids enum pitfalls in TypeScript)
export const ErrorCode = {
  PROVIDER_RATE_LIMITED: "PROVIDER_RATE_LIMITED",
  PROVIDER_TIMEOUT: "PROVIDER_TIMEOUT",
} as const;

export type ErrorCode = typeof ErrorCode[keyof typeof ErrorCode];

// Consumer usage:
if (err instanceof ProviderError && err.code === ErrorCode.PROVIDER_RATE_LIMITED) { ... }
```

### Custom Error with cause chaining (ES2022)

```typescript
// Source: MDN Error cause docs — https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error/cause
export class InstitutionalError extends Error {
  constructor(
    message: string,
    public readonly code: ErrorCode,
    public readonly context: ErrorContext,
    options?: ErrorOptions   // { cause?: unknown } — native ES2022 type
  ) {
    super(message, options);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
```

### Retry-After header parsing

```typescript
// Retry-After: 30           (delta seconds)
// Retry-After: Wed, 21 Oct 2026 07:28:00 GMT  (HTTP-date)
function parseRetryAfterMs(header: string | null | undefined): number | null {
  if (!header) return null;
  const seconds = parseInt(header, 10);
  if (!isNaN(seconds)) return seconds * 1000;
  const date = Date.parse(header);
  if (!isNaN(date)) return Math.max(0, date - Date.now());
  return null;
}
```

### Checking status code on Anthropic SDK errors

```typescript
// @anthropic-ai/sdk throws typed errors with .status property
import { APIError } from "@anthropic-ai/sdk";

function isRetryableAnthropicError(err: unknown): boolean {
  if (err instanceof APIError) {
    return err.status === 429 || err.status === 500 || err.status === 503;
  }
  return false;
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `@anthropic-ai/sdk` 0.32 (in project) | 0.70.x (current) | 2024-2025 | Type changes likely; fix PROV-01 first before upgrading |
| `role: "system"` in messages array | Top-level `system` parameter | Always been wrong — Anthropic API never supported system role in messages | Fixes PROV-01 |
| Bare `Promise.all` for parallelism | Semaphore-gated `Promise.all` | — | Prevents 429 rate limit bursts with many agents |
| `throw new Error(string)` | Typed error hierarchy with codes | — | Enables consumer `catch (e) { if (e.code === ...) }` |
| `typescript` via bundled bun | Explicit `typescript` devDependency | — | Required for `bun tsc` to resolve the binary |

**Deprecated/outdated:**
- `openai` npm package at `^4.76.1`: Remove — OpenAI and OpenRouter providers use raw `fetch`. Re-add only if the OpenAI SDK's streaming or typed helpers are needed later.

---

## Open Questions

1. **`@anthropic-ai/sdk` 0.50+ breaking type changes**
   - What we know: The SDK jumped ~40 minor versions; latest is 0.70.x. The `system` parameter was always top-level in the API spec.
   - What's unclear: Whether `LLMCallParams` field names like `maxTokens` map cleanly to the new SDK's `MessageCreateParams` or if new required fields appeared.
   - Recommendation: After upgrading, run `bun run typecheck` immediately and fix any resulting type errors. The TypeScript errors will be self-documenting.

2. **Parallel failure strategy (Claude's Discretion)**
   - What we know: `Promise.all` fails on first rejection; `Promise.allSettled` collects all.
   - What's unclear: User expectation — do they want partial results (some agents succeeded) or all-or-nothing?
   - Recommendation: Use `Promise.allSettled` internally, collect failures, and throw a single `AggregateError` wrapping all `ProviderError` instances if any agent failed. Return partial results only if ALL agents succeeded. This matches the "institutional" metaphor — a committee where half the members fail is still a failed session.

3. **Jitter in exponential backoff (Claude's Discretion)**
   - What we know: Pure exponential (1s, 2s, 4s) can cause thundering herd if many framework instances retry simultaneously.
   - Recommendation: Add "full jitter" — `delay = random(0, base_delay)` — per the AWS architecture blog pattern. This is a 2-line change and prevents correlated retries when multiple agents hit rate limits simultaneously.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Bun built-in test runner (bun:test) |
| Config file | none (bun discovers `*.test.ts` by convention) |
| Quick run command | `bun test test/core` |
| Full suite command | `bun test test/core` (e2e tests require API keys, skip in CI) |

### Phase Requirements -> Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CODE-01 | `bun run typecheck` exits 0 | smoke | `bun run typecheck` | ✅ (script exists, needs typescript installed) |
| CODE-03 | `run()` accepts `RunFlags`, rejects unknown keys at compile time | unit | `bun run typecheck` (type check validates interface) | ❌ Wave 0: `test/core/run-flags.test.ts` |
| CODE-04 | `catch (InstitutionalError)` catches `ProviderError` | unit | `bun test test/core/errors.test.ts` | ❌ Wave 0: `test/core/errors.test.ts` |
| CODE-06 | `DEFAULT_MODELS.DEFAULT` is a non-empty string | unit | `bun test test/core/config.test.ts` | ❌ Wave 0: `test/core/config.test.ts` |
| CODE-07 | `executeParallel` with concurrency=2 and 5 agents processes no more than 2 simultaneously | unit | `bun test test/core/orchestrator.test.ts` | ✅ (file exists, needs new test case) |
| PROV-01 | Anthropic provider passes system as top-level param, not as user message | unit | `bun test test/core/providers.test.ts` | ❌ Wave 0: `test/core/providers.test.ts` |
| PROV-05 | `@anthropic-ai/sdk` version in package.json is >=0.50.0 | smoke | `bun run typecheck` (import types validate) | ✅ (typecheck covers this) |
| PROV-06 | Provider retries 3 times on 429 before throwing | unit | `bun test test/core/providers.test.ts` | ❌ Wave 0: `test/core/providers.test.ts` |
| PROV-07 | Provider call is aborted after timeoutMs via AbortController | unit | `bun test test/core/providers.test.ts` | ❌ Wave 0: `test/core/providers.test.ts` |

### Sampling Rate

- **Per task commit:** `bun test test/core`
- **Per wave merge:** `bun test test/core && bun run typecheck`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `test/core/errors.test.ts` — covers CODE-04: error hierarchy instanceof chain, cause propagation, ErrorCode enum values
- [ ] `test/core/providers.test.ts` — covers PROV-01: mock fetch spy verifying `system` param position; PROV-06: retry count with mock 429 responses; PROV-07: timeout abort with mock slow response
- [ ] `test/core/config.test.ts` — covers CODE-06: DEFAULT_MODELS shape and non-empty values
- [ ] `test/core/run-flags.test.ts` — covers CODE-03: TypeScript compile-time test (may be just a `.ts` file that assigns a `RunFlags` value to verify the interface shape)

*(Existing `test/core/orchestrator.test.ts` needs one new test case for concurrency cap — file already exists.)*

---

## Sources

### Primary (HIGH confidence)

- Official Anthropic API docs — `system` parameter is top-level in `messages.create()`, not in messages array: https://platform.claude.com/docs/en/api/typescript/messages/create
- npm `@anthropic-ai/sdk` — current latest version is 0.70.x (as of research date)
- MDN Error cause — `ErrorOptions` type and `cause` chaining: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error/cause
- Bun test runner — `bun:test` is the test framework; no config file needed

### Secondary (MEDIUM confidence)

- Anthropic SDK source (node_modules inspection) — SDK 0.32 already handles `retry-after` and `retry-after-ms` headers internally in `core.ts:583-593`; this means PROV-06 for the Anthropic provider may be partially handled by the SDK itself after upgrade to 0.50+
- Semaphore pattern — counting semaphore with permit queue is standard in JavaScript async literature; no library needed for ~20 lines

### Tertiary (LOW confidence)

- `@anthropic-ai/sdk` 0.50-0.70 breaking type changes — could not access CHANGELOG.md directly; assume TypeScript errors will surface post-upgrade; LOW risk given the system prompt fix is isolated to `anthropic.ts`

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — confirmed from package.json inspection + official docs
- Architecture: HIGH — based on direct source code inspection of all relevant files
- Pitfalls: HIGH for PROV-01 (bug confirmed in source), MEDIUM for SDK upgrade type changes (untested)

**Research date:** 2026-03-16
**Valid until:** 2026-04-15 (30 days — Anthropic SDK moves fast, verify version before planning if delayed)
