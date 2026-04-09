# Security, Testing & Execution Hardening

**Date**: 2026-04-09  
**Status**: Approved  
**Approach**: Parallel Tracks (Wave 1 → 2 → 3)  
**Breaking changes**: Open to redesign where improvements justify it

---

## Goals

1. **Security** — input sanitization, prompt injection defense, output sanitization, cost budgets
2. **Testing** — MockProvider, mock-based integration tests for all 26 frameworks, property-based tests for core
3. **Execution** — circuit breakers, graceful degradation, provider fallback, structured logging, benchmarks

Each wave is independently shippable. Wave 1 unblocks Waves 2 and 3.

---

## Wave 1: Foundation

### 1A. MockProvider + Test Harness

**New file: `core/providers/mock.ts`**

`MockProvider` implements `LLMProvider` with two modes:

- **Scripted mode**: Takes a queue of `LLMResponse` objects. Each `call()` pops the next response. Throws if queue is exhausted.
- **Echo mode**: Returns a JSON-wrapped version of the prompt (for testing prompt construction).

Tracks all calls made (`provider.calls` array) so tests can assert on model, temperature, prompt content, and system prompt.

Cost calculation returns 0.

**New file: `test/helpers.ts`**

Shared test utilities:
- `createMockProvider(responses)` — shorthand factory
- `createMockRunner(name, input, responses)` — returns `FrameworkRunner` wired to MockProvider
- `expectValidAuditTrail(auditLog)` — asserts audit trail has required fields

### 1B. Input Sanitization Module

**New file: `core/sanitize.ts`**

**`sanitizeInput(text, options?)`** — main entry point:
- Size limit enforcement (default 100KB, configurable)
- Encoding validation (reject non-UTF-8)
- Null byte stripping
- Control character removal (except newlines/tabs)

**`detectPromptInjection(text)`** — heuristic detection:
- Returns `{ detected: boolean, signals: string[] }`
- Detects: "ignore previous instructions", "system:" prefix, role-switching attempts
- Does NOT block by default — callers decide policy
- Defense-in-depth, not a guarantee

**`sanitizeOutput(text)`** — for LLM responses:
- Strip embedded system prompts / role-switch attempts
- Normalize whitespace

**Integration**: `FrameworkRunner.runAgent()` calls `sanitizeInput()` on the prompt before sending to the provider. Frameworks can opt into `detectPromptInjection()` for user-facing inputs.

### 1C. Zod Schemas for Framework I/O

**New dependency**: `zod` added to package.json

**New file: `core/schemas.ts`**

Shared Zod schemas replacing hand-rolled validators:
- `MessageSchema`, `LLMResponseSchema`, `RunFlagsSchema`, `ProviderConfigSchema`
- `sanitizedString(maxLength)` — reusable Zod refinement piping through `sanitizeInput`

**Changes to existing files**:

- `parseJSON<T>()` in `orchestrator.ts` gains optional `schema: ZodType<T>` parameter. When provided, parsed JSON is validated against the schema (replaces unsafe `as T` cast). Without schema, behavior unchanged (backwards compatible).
- `generateObject<T>()` similarly gains optional `schema` parameter.
- `validators.ts` stays but gets `@deprecated` JSDoc. Frameworks migrate to Zod over Waves 2-3.

---

## Wave 2: Hardening

### 2A. Circuit Breaker for Providers

**New file: `core/circuit-breaker.ts`**

`CircuitBreakerProvider` wraps any `LLMProvider` — same interface, added resilience:

- **States**: `closed` → `open` → `half-open`
- **Trips open** after N consecutive failures (default: 5)
- **Fast-rejects** for cooldown period (default: 30s)
- **Half-open** allows one probe request. Success closes circuit, failure reopens.

```typescript
const provider = new CircuitBreakerProvider(
  new AnthropicProvider(apiKey),
  { failureThreshold: 5, cooldownMs: 30_000 }
);
```

**Integration**: `getProviderFromEnv()` wraps returned provider in circuit breaker by default. Disabled via `RunFlags.config.circuitBreaker: false`.

### 2B. Prompt Injection Middleware

**New file: `core/middleware.ts`**

Pluggable middleware chain between framework logic and provider:

```typescript
type Middleware = (
  params: LLMCallParams,
  next: () => Promise<LLMResponse>
) => Promise<LLMResponse>;
```

Built-in middleware:

- **`injectionDetection(mode)`** — runs `detectPromptInjection()` on user content. Mode: `'warn'` (default, logs to audit trail) or `'block'` (throws).
- **`outputSanitization()`** — runs `sanitizeOutput()` on response content.
- **`costBudget(maxCost)`** — tracks cumulative cost, throws `BudgetExceededError` at limit. Prevents runaway costs from retry loops or iterative frameworks.

**Integration**: `FrameworkRunner` accepts optional `middleware` array in constructor. Default: `[injectionDetection('warn'), outputSanitization()]`.

### 2C. Mock-Based Integration Tests (All 26 Frameworks)

**New files: `test/integration/<framework>.integration.test.ts`**

One integration test per framework:
1. Creates `MockProvider` with scripted responses matching agent sequence
2. Runs framework's `run()` function end-to-end
3. Asserts on:
   - Output structure (correct fields, types)
   - Agent call sequence (correct order, correct prompts)
   - Audit trail completeness (all agents recorded)
   - Error propagation (what happens when agent N fails)

Run in CI on every PR — no API keys needed. ~100ms per framework.

**New script**: `"test:integration": "bun test test/integration"` in package.json.

### 2D. Property-Based Tests for Core

**New dev dependency**: `fast-check`

**New file: `test/core/property.test.ts`**

Property-based tests:
- **parseJSON**: arbitrary strings never crash; roundtrip `parseJSON(JSON.stringify(obj)) === obj`
- **sanitizeInput**: output ≤ input length; no null bytes; idempotent
- **validateQuote**: `source.includes(quote)` ↔ no throw
- **withRetry**: fn succeeds on attempt K → exactly K calls made
- **Semaphore**: concurrent count never exceeds permits for any interleaving

---

## Wave 3: Execution

### 3A. Graceful Degradation in `executeParallel`

**Change to: `core/orchestrator.ts`**

New options parameter:

```typescript
executeParallel<T>(agents, {
  concurrency: 5,
  minRequired: 3,       // need at least 3 successes (default: all)
  onFailure: 'collect'  // or 'throw' (default, backwards compatible)
});
```

- **`onFailure: 'throw'`** — current behavior, no breaking change
- **`onFailure: 'collect'`** — returns `{ results: T[], errors: PartialFailure[] }`
- **`minRequired`** — throws if fewer than N agents succeed

`FrameworkRunner.runParallel` gets the same options.

### 3B. Provider Health Checks + Automatic Fallback

**Change to: `core/providers/index.ts`**

**New class: `ResilientProvider`**

- Wraps multiple providers with automatic fallback
- Priority-ordered provider list
- If active provider's circuit breaker trips open, falls through to next available
- Emits warning to audit trail on fallback
- `getProviderFromEnv()` returns `ResilientProvider` when multiple API keys are set
- Single-key setups unchanged

### 3C. Structured Logging

**New file: `core/logger.ts`**

Unified structured logger:
- JSON-formatted entries: `{ timestamp, level, framework, agent, event, duration, cost }`
- Levels: `debug`, `info`, `warn`, `error`
- Output: stderr (doesn't pollute stdout/JSON output)
- Controlled by `RunFlags.debug`
- `AuditTrail` uses logger internally

### 3D. Performance Benchmarks

**New file: `test/bench/core.bench.ts`**

Bun built-in benchmarking:
- `parseJSON` — throughput on 1KB, 10KB, 100KB inputs
- `sanitizeInput` — overhead per call
- `Semaphore` acquire/release cycle
- `MockProvider` round-trip (baseline)
- `executeParallel` with 5/10/50 mock agents

**New script**: `"bench": "bun test test/bench"` in package.json. Not a CI gate.

### 3E. New Error Codes

**Change to: `core/errors.ts`**

New codes:
- `CIRCUIT_BREAKER_OPEN` — provider in open state, request rejected
- `BUDGET_EXCEEDED` — cost budget middleware tripped
- `PARTIAL_FAILURE` — some agents failed in graceful degradation mode
- `INJECTION_DETECTED` — prompt injection blocked (middleware in `block` mode)
- `PROVIDER_FALLBACK` — primary provider failed, fell through to secondary

---

## New Dependencies

| Package | Type | Purpose |
|---------|------|---------|
| `zod` | runtime | Schema validation for framework I/O |
| `fast-check` | devDependency | Property-based testing |

---

## New Files Summary

| File | Wave | Purpose |
|------|------|---------|
| `core/providers/mock.ts` | 1 | Mock LLM provider for testing |
| `core/sanitize.ts` | 1 | Input/output sanitization |
| `core/schemas.ts` | 1 | Zod schemas for all I/O types |
| `test/helpers.ts` | 1 | Shared test utilities |
| `core/circuit-breaker.ts` | 2 | Circuit breaker provider wrapper |
| `core/middleware.ts` | 2 | Pluggable middleware chain |
| `test/integration/*.test.ts` | 2 | 26 mock-based integration tests |
| `test/core/property.test.ts` | 2 | Property-based tests |
| `core/logger.ts` | 3 | Structured logging |
| `test/bench/core.bench.ts` | 3 | Performance benchmarks |

## Modified Files Summary

| File | Wave | Change |
|------|------|--------|
| `core/orchestrator.ts` | 1, 3 | Zod schema param on parseJSON/generateObject; graceful degradation options |
| `core/validators.ts` | 1 | @deprecated JSDoc |
| `core/providers/index.ts` | 2, 3 | Circuit breaker wrapping; ResilientProvider |
| `core/errors.ts` | 3 | New error codes |
| `package.json` | 1, 2 | zod, fast-check deps; new test scripts |
