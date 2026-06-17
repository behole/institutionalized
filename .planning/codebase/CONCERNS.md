# Codebase Concerns

**Analysis Date:** 2026-03-16
**Last Reviewed:** 2026-06-17 — refreshed after Phase 1 (Core Hardening) and Phase 2 (Framework Standardization) completion. Resolved items marked ✅ and retained for traceability; open items remain actionable.

## Tech Debt

✅ **RESOLVED (Phase 2): Courtroom Framework Bypasses Core Provider Abstraction**

- Was: All four courtroom agents imported `@anthropic-ai/sdk` directly, bypassing `LLMProvider`.
- Now: Zero `import Anthropic` in `frameworks/courtroom/*.ts`; orchestrator uses `runner.runAgent()` / `runner.runParallel()` exclusively. See `02-VERIFICATION.md` truth #1.

✅ **RESOLVED (Phase 2): Cost Tracking Is Universally Broken for Seven Frameworks**

- Was: Seven orchestrators hardcoded `costUSD = 0.0` placeholder.
- Now: All 26 frameworks wire `costUSD` from `auditLog.metadata.totalCost`; zero `costUSD = 0` placeholders remain. See `02-VERIFICATION.md` truth #18.

✅ **RESOLVED (Phase 1): `flags` Parameter Is Typed `Record<string, any>` Across All Frameworks**

- Was: Every `run(input, flags)` typed `flags` as `Record<string, any>`.
- Now: `RunFlags` interface in `core/types.ts`; zero `flags: Record<string, any>` matches in `frameworks/`. See `01-VERIFICATION.md`.

✅ **RESOLVED (Phase 2): `@core/*` and `@institutional-reasoning/core` Import Aliases Are Inconsistent**

- Was: Mixed `@institutional-reasoning/core` and `@core/*` imports in `.ts` files.
- Now: Zero `@institutional-reasoning/core` or `../../core` matches in `frameworks/**/*.ts`. The `@institutional-reasoning/core` references remaining in `frameworks/*/package.json` are correct workspace dependency declarations, not import paths.

✅ **RESOLVED (Phase 2): Duplicate JSON Parsing Logic in Courtroom vs Core**

- Was: Courtroom agents each implemented inline JSON extraction, duplicating `parseJSON()`.
- Now: Courtroom agents export prompt-builder + response-parser pattern; orchestrator drives all LLM calls via FrameworkRunner using core's `parseJSON()`.

**STILL OPEN: `core/validators.ts` Functions Are Unused Across Frameworks**

- Issue: `core/validators.ts` exports `validateRequired`, `validateNonEmpty`, `validateRange`, and `validateStructure`. None are imported or used anywhere in any framework (confirmed by grep, 2026-06-17). Only `validateQuote` is used (in courtroom).
- Files: `core/validators.ts`
- Impact: Dead code inflates the core surface area. Validation patterns that were intended to be shared are not adopted.
- Fix approach: Either remove unused validators from core or document the intent and add adoption to a refactor task. Low priority — does not affect runtime.

## Known Bugs

**STILL OPEN: MCP Server Passes Args Object as Both Input and Flags**

- Symptoms: The MCP server calls `framework.run(args, args)` at `mcp-server/index.ts:399` — identical object for both parameters. Framework `run()` functions treat the first param as domain input and the second as `RunFlags`. Passing `args` as input injects all MCP tool parameters (including `verbose`, `rounds`, etc.) into the domain input object, potentially confusing LLM prompts.
- Files: `mcp-server/index.ts:399`
- Trigger: Any MCP tool call to any framework.
- Workaround: None. The frameworks silently ignore unknown fields in structured inputs.
- Fix: **Phase 3 target (PROV-04).** Plan written: `.planning/phases/03-registry-cleanup/03-01-PLAN.md`.

✅ **RESOLVED (Phase 1): Anthropic Provider Incorrectly Handles System Messages**

- Was: Prepended `{ role: "system" }` to messages array, then mapped system → user.
- Now: `core/providers/anthropic.ts:26` passes `system: params.systemPrompt` as the top-level API parameter. Messages filter out system role. See `01-VERIFICATION.md`.

✅ **RESOLVED (2026-06-17): Non-null Assertion on API Key in Demo Files**

- Was: `demo-terminal-velocity.ts:19` and `demo-terminal-simple.ts:26` used `process.env.ANTHROPIC_API_KEY!`.
- Now: All demos use `getAPIKey('anthropic')` from `core/config.ts`, which throws a clear error if the key is missing. `demo.ts` and `demo-studio.ts` already had proper guards.

## Security Considerations

✅ **RESOLVED (Phase 1): No API Request Timeout or Rate Limit Handling**

- Was: No timeout, no retry/backoff on 429.
- Now: `core/retry.ts` implements `withRetry()` with exponential backoff + full jitter + `AbortController` timeout. `core/circuit-breaker.ts` adds closed/open/half-open states. OpenAI/OpenRouter providers wrapped. See commits `bf0ce57`, `eddcfce`.

✅ **RESOLVED (Phase 2): Courtroom Framework Passes `process.env.ANTHROPIC_API_KEY` to SDK**

- Was: Courtroom agents passed possibly-undefined env var to `new Anthropic({ apiKey })`.
- Now: Zero `process.env.ANTHROPIC_API_KEY` references in `frameworks/courtroom/`. Provider creation goes through `createProvider()` which uses `getAPIKey()`.

✅ **RESOLVED (Phase 1/2): No Input Sanitization Before LLM Prompt Injection**

- Was: User-provided text interpolated directly into prompts.
- Now: `core/sanitize.ts` implements `sanitizeInput()`; `core/middleware.ts` adds injection-detection middleware, output sanitization, and cost budget enforcement. `FrameworkRunner.runAgent()` integrates sanitization (commit `440e542`, `eddcfce`). Property-based tests cover `sanitizeInput` (`test/core/property.test.ts`).

## Performance Bottlenecks

✅ **RESOLVED (Phase 1): Parallel LLM Calls With No Concurrency Cap**

- Was: `executeParallel()` used `Promise.all()` with no limit.
- Now: `Semaphore` class in `core/orchestrator.ts` caps concurrency (default 5). `FrameworkRunner.runParallel()` gated by shared semaphore. See `01-VERIFICATION.md`, commit for CODE-07.

**STILL OPEN: Each Framework Creates a New Provider Instance Per `run()` Call**

- Problem: Every `run()` call instantiates a new provider via `createProvider()`, which instantiates a new SDK client with fresh HTTP keep-alive pools. In high-throughput usage, this prevents connection reuse.
- Files: All framework `index.ts` files that call `createProvider()`, e.g., `frameworks/aar/index.ts:23`
- Cause: Provider creation is inside `run()` rather than being a shared singleton.
- Improvement path: Accept an optional pre-created `LLMProvider` parameter in `run()` and fall back to creating one. Low priority — no measured bottleneck.

**STILL OPEN: Benchmark Does Not Actually Measure LLM Call Performance**

- Problem: `benchmark/run-benchmarks.ts:165` uses `await Promise.resolve()` instead of `module.run(input)`. Only measures import/initialization time.
- Files: `benchmark/run-benchmarks.ts:163-165`
- Cause: Comment says "avoid costs", but the benchmark is structurally useless for performance measurement.
- Improvement path: Add an optional `--live` flag that runs real calls on a small subset with cost awareness. Low priority.

## Fragile Areas

**STILL OPEN: `parseJSON()` in Core Is the Single Point of Failure for All LLM Output**

- Files: `core/orchestrator.ts` (parseJSON function)
- Why fragile: Every framework that uses the core path depends on LLMs returning parseable JSON. The regex `\{[\s\S]*\}` greedily matches the outermost braces. If a model embeds multiple JSON objects, results may be incorrect.
- Safe modification: Test any changes against `test/core/orchestrator.test.ts` and `test/core/property.test.ts` (property-based tests added commit `40c250f`).
- Test coverage: `parseJSON` now has property-based tests covering edge cases.

**STILL OPEN: E2E Tests Are Marked `continue-on-error: true` in CI**

- Files: `.github/workflows/test.yml:123`
- Why fragile: E2E tests that fail in CI are silently ignored. A regression in any framework's LLM integration would not block a merge.
- Safe modification: Only change once LLM response determinism is improved (via mocking). **Phase 4 target (TEST-03).**

**STILL OPEN: `executeSequential()` Returns Last Result Only, Discarding Intermediate State**

- Files: `core/orchestrator.ts`
- Why fragile: The sequential orchestrator passes each result to the next step but returns only the final value. Intermediate agent output is lost.
- Test coverage: `test/core/orchestrator.test.ts` tests this behavior explicitly.
- Improvement path: Consider returning an array of intermediate results if callers need partial auditing. Low priority — no current caller requires it.

**STILL OPEN: `validateStructure()` in Core Has No Runtime Effect**

- Files: `core/validators.ts`
- Why fragile: Accepts a user-provided type predicate with no built-in schema validator. If the predicate always returns `true`, validation silently passes. No framework currently uses this function.
- Improvement path: Remove with the other unused validators, or replace with Zod schema validation (project already uses Zod). Low priority.

## Scaling Limits

**STILL OPEN: Token Usage Grows With Context Accumulation in Sequential Frameworks**

- Current capacity: No documented token limits per call; `maxTokens` defaults to 4096 output, input context unbounded.
- Limit: For frameworks like peer-review (paper → reviews → rebuttal → editor), each subsequent agent receives full accumulated context. With a large paper and multiple reviewers, editor input can exceed 30,000+ tokens.
- Scaling path: Add configurable truncation for accumulated context, or use summarization agents to compress prior stages. Future enhancement, not in current roadmap.

## Dependencies at Risk

✅ **RESOLVED (Phase 1): Hardcoded Model Identifiers Across 26 Framework Type Files**

- Was: Every `DEFAULT_CONFIG` hardcoded model strings like `"claude-3-7-sonnet-20250219"`.
- Now: `DEFAULT_MODELS` constant in `core/config.ts`; all frameworks reference it. See `01-VERIFICATION.md` for CODE-06.

✅ **RESOLVED (Phase 1): `@anthropic-ai/sdk` Version Pinned at `^0.32.1`**

- Was: Minor version bumps could change messages API or response shapes.
- Now: `@anthropic-ai/sdk` at `^0.79.0` (current). System message bug fixed before upgrade (PROV-05 complete).

## Missing Critical Features

**STILL OPEN: No Streaming Support**

- Problem: All 26 frameworks use non-streaming `messages.create()` / `fetch()` calls. For long-running frameworks (dissertation-committee, regulatory-impact with 5+ parallel analysts), users see no output for 30-60+ seconds.
- Blocks: Interactive use, CLI progress indication.
- Status: Explicitly out of scope per `REQUIREMENTS.md` — "Real-time per-agent streaming" listed as Out of Scope (3x scope multiplier). Deferred to v2 (DX-01).

✅ **RESOLVED: No Built-in Cost Guard / Budget Cap**

- Was: `AuditTrail` tracked cost after-the-fact, no mechanism to abort if spend exceeded threshold.
- Now: `core/middleware.ts` implements cost budget middleware (commit `eddcfce`) — tracks cumulative cost and throws when budget exceeded. Listed as REL-01 in v2 requirements but core mechanism is in place.

## Test Coverage Gaps

**STILL OPEN: Framework-Internal Logic Has No Unit Tests**

- What's not tested: Individual agent functions (`prosecute()`, `defend()`, `deliberate()`, etc.) are only tested through full E2E flows that require live API keys.
- Risk: A regression in a single agent function would only surface in expensive E2E tests. The `continue-on-error: true` CI flag means it might not surface at all.
- Priority: High — **Phase 4 target (TEST-01, TEST-02).**

**STILL OPEN: `AuditTrail` and Observability Layer Have No Tests**

- What's not tested: `core/observability.ts` — `AuditTrail.recordStep()`, `AuditTrail.finalize()`, `AuditTrail.getTotalCost()`, `formatCostReport()`.
- Risk: Cost reporting bugs would go undetected.
- Priority: Medium — **Phase 4 target.**

**STILL OPEN: `createProvider()` and `getProviderFromEnv()` Have No Tests**

- What's not tested: Provider selection logic, fallback order (Anthropic → OpenAI → OpenRouter), error message when no key is present.
- Risk: Provider selection regressions would only surface at runtime.
- Priority: Medium — **Phase 4 target.**

---

_Concerns audit: 2026-03-16_
_Last reviewed: 2026-06-17 — 17 of 27 concerns resolved by Phase 1 + Phase 2 + session fixes. 10 remain open, mostly low-priority or Phase 4 targets._
