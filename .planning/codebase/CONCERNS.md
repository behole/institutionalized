# Codebase Concerns

**Analysis Date:** 2026-03-16

## Tech Debt

**Courtroom Framework Bypasses Core Provider Abstraction:**
- Issue: All four courtroom agents (`prosecutor.ts`, `defense.ts`, `jury.ts`, `judge.ts`) import `@anthropic-ai/sdk` directly and instantiate their own `Anthropic` clients, completely bypassing the `LLMProvider` interface in `core/providers/`. Every other framework that was written after courtroom uses `createProvider()` / `generateObject()`.
- Files: `frameworks/courtroom/prosecutor.ts`, `frameworks/courtroom/defense.ts`, `frameworks/courtroom/jury.ts`, `frameworks/courtroom/judge.ts`
- Impact: Courtroom cannot be switched to OpenAI or OpenRouter without a significant rewrite. Provider config passed through `CourtroomConfig` is ignored at execution time. Cost calculation in `frameworks/courtroom/orchestrator.ts` always returns `0.0` (see separate item below) because there is no `LLMResponse` with usage data flowing through the standard path.
- Fix approach: Refactor to accept an `LLMProvider` parameter (the pattern used by `peer-review`, `studio`, `differential-diagnosis`, etc.) or call `getProviderFromEnv()` during `run()`.

**Cost Tracking Is Universally Broken for Seven Frameworks:**
- Issue: Seven framework orchestrators hardcode `const costUSD = 0.0; // Placeholder` in their result metadata. The `costUSD` field is declared in each framework's result type, so callers see `$0.00` for every run.
- Files: `frameworks/courtroom/orchestrator.ts:51`, `frameworks/writers-workshop/orchestrator.ts:47`, `frameworks/hegelian/orchestrator.ts:43`, `frameworks/regulatory-impact/orchestrator.ts:48`, `frameworks/war-gaming/orchestrator.ts:51`, `frameworks/talmudic/orchestrator.ts:61`, `frameworks/dissertation-committee/orchestrator.ts:57`
- Impact: Users and the `AuditTrail` system cannot track actual API spend. The `AuditLog.metadata.totalCost` field in `core/observability.ts` works correctly when used, but these orchestrators never feed their actual token usage into it.
- Fix approach: Either wire through the `AuditTrail.getTotalCost()` pattern already in `core/orchestrator.ts:FrameworkRunner`, or sum `response.usage` from each LLM call and pass it to `calculateCost()` on the active provider.

**`flags` Parameter Is Typed `Record<string, any>` Across All Frameworks:**
- Issue: Every framework's public `run(input, flags)` function types the `flags` parameter as `Record<string, any>`. This is the primary entry point for caller-controlled configuration including provider selection, model override, verbose mode, and config overrides.
- Files: `frameworks/differential-diagnosis/index.ts:15`, `frameworks/studio/index.ts:17`, `frameworks/intelligence-analysis/index.ts:15`, `frameworks/consensus-circle/index.ts:15`, `frameworks/pre-mortem/index.ts:17`, `frameworks/six-hats/index.ts:48`, `frameworks/phd-defense/index.ts:15`, `frameworks/devils-advocate/index.ts:15`, `frameworks/hegelian/index.ts:14`, `frameworks/courtroom/index.ts:15`, `frameworks/regulatory-impact/index.ts:14`, `frameworks/delphi/index.ts:15`, `frameworks/aar/index.ts:15`, and others.
- Impact: TypeScript provides no type checking on flags passed by callers. Misspelled option names and wrong types are silently ignored, leading to subtle configuration bugs. The MCP server at `mcp-server/index.ts:371` passes `(args, args)` — doubling the args object as both input and flags — which only works because both parameters are loosely typed.
- Fix approach: Define a shared `RunFlags` interface in `core/types.ts` (with `verbose`, `provider`, `config`, `output` as typed fields) and use it across all `run()` signatures.

**`@core/*` and `@institutional-reasoning/core` Import Aliases Are Inconsistent:**
- Issue: Newer (Tier 4-5) frameworks import from `@institutional-reasoning/core` (the package name), while older/mid-tier frameworks use the `@core/*` path alias defined in `tsconfig.json`. Both resolve to the same `core/` directory but create confusion about the canonical import path.
- Files: `frameworks/writers-workshop/facilitator.ts:2`, `frameworks/hegelian/dialectic.ts:2`, `frameworks/regulatory-impact/analysts.ts:2`, `frameworks/war-gaming/forces.ts:2`, `frameworks/talmudic/interpreters.ts:2`, `frameworks/dissertation-committee/committee.ts:2` (use package name) vs. `frameworks/differential-diagnosis/index.ts:6-9`, `frameworks/six-hats/index.ts:8`, `frameworks/consensus-circle/index.ts:6-8` (use `@core/*`).
- Impact: Creates inconsistency that makes search/replace and refactoring harder. The package-name style only resolves correctly because of the Bun workspace setup.
- Fix approach: Standardize on `@core/*` throughout (it is defined in `tsconfig.json`) and update all `@institutional-reasoning/core` imports.

**Duplicate JSON Parsing Logic in Courtroom vs Core:**
- Issue: The courtroom framework (`prosecutor.ts`, `defense.ts`, `jury.ts`, `judge.ts`) each implement their own inline JSON extraction (`text.match(/\{[\s\S]*\}/)`), duplicating the logic already extracted as `parseJSON()` in `core/orchestrator.ts`. The core version additionally handles markdown code blocks.
- Files: `frameworks/courtroom/prosecutor.ts:79-84`, `frameworks/courtroom/defense.ts` (similar), `frameworks/courtroom/jury.ts` (similar), `frameworks/courtroom/judge.ts:126`
- Impact: LLM responses wrapped in markdown code fences will fail to parse in courtroom agents, while they succeed in all other frameworks. This is a silent behavioral difference.
- Fix approach: Use `parseJSON()` from core when refactoring courtroom to use the provider abstraction.

**`core/validators.ts` Functions Are Unused Across Frameworks:**
- Issue: `core/validators.ts` exports `validateRequired`, `validateNonEmpty`, `validateRange`, and `validateStructure`. None of these are imported or used anywhere in any framework. Only `validateQuote` is used, and only within the courtroom framework's own `prosecutor.ts` (not even imported from core — it is a local copy).
- Files: `core/validators.ts`
- Impact: Validation patterns that were intended to be shared are not adopted. LLM output validation quality varies across frameworks. Dead code inflates the core surface area.
- Fix approach: Either remove unused validators from core or document the intent and add adoption to a refactor task.

## Known Bugs

**MCP Server Passes Args Object as Both Input and Flags:**
- Symptoms: The MCP server calls `framework.run(args, args)` — identical object for both parameters. Framework `run()` functions treat the first param as domain input and the second as execution flags. Passing `args` as input may work for simple cases (since frameworks check for known keys), but will inject all MCP tool parameters (including `verbose`, `rounds`, etc.) into the domain input object, potentially confusing LLM prompts.
- Files: `mcp-server/index.ts:371`
- Trigger: Any MCP tool call to any framework.
- Workaround: None. The frameworks silently ignore unknown fields in structured inputs.

**Anthropic Provider Incorrectly Handles System Messages:**
- Symptoms: `core/providers/anthropic.ts` prepends a `{ role: "system", content: ... }` message to the messages array, then maps all `system` roles to `"user"` role. This creates a user message with system-prompt content at position 0, rather than using Anthropic's dedicated `system` parameter on the API call.
- Files: `core/providers/anthropic.ts:13-24`
- Trigger: Any call that uses `systemPrompt` in `LLMCallParams`.
- Workaround: The prompt content still reaches the model as a user turn, so results are functional but not semantically correct. Proper fix: pass `system` as a top-level API parameter as the Anthropic SDK supports.

**Non-null Assertion on API Key in Demo Files:**
- Symptoms: `demo-terminal-velocity.ts:15` and `demo-terminal-simple.ts:18` use `process.env.ANTHROPIC_API_KEY!` — the non-null assertion will pass TypeScript but causes a runtime error if the key is absent.
- Files: `demo-terminal-velocity.ts:15`, `demo-terminal-simple.ts:18`
- Trigger: Running demos without `ANTHROPIC_API_KEY` set.
- Workaround: Set the env var before running.

## Security Considerations

**No API Request Timeout or Rate Limit Handling:**
- Risk: Every LLM API call (Anthropic SDK in courtroom, `fetch()` in OpenAI and OpenRouter providers) has no timeout and no retry/backoff on 429 (rate limit) responses. A stalled or rate-limited request will hang indefinitely.
- Files: `core/providers/openai.ts:18-33`, `core/providers/openrouter.ts:17-34`, `frameworks/courtroom/prosecutor.ts`, `frameworks/courtroom/jury.ts` (parallel LLM calls with no bound)
- Current mitigation: None.
- Recommendations: Add `AbortController` with a configurable timeout to `fetch()` calls. Add exponential backoff on 429 in OpenAI/OpenRouter providers. The Anthropic SDK has built-in retry support via constructor options.

**Courtroom Framework Passes `process.env.ANTHROPIC_API_KEY` (Possibly Undefined) to SDK:**
- Risk: `frameworks/courtroom/prosecutor.ts:5`, `jury.ts:13`, `judge.ts:13`, `defense.ts:5` pass `process.env.ANTHROPIC_API_KEY` directly to `new Anthropic({ apiKey })`. If the env var is absent, `apiKey` is `undefined`. The Anthropic SDK will accept this without error at construction time and fail only at the first API call with an opaque auth error.
- Files: `frameworks/courtroom/prosecutor.ts:5`, `frameworks/courtroom/defense.ts:5`, `frameworks/courtroom/jury.ts:13`, `frameworks/courtroom/judge.ts:13`
- Current mitigation: None — no guard or early error.
- Recommendations: Use `getAPIKey("anthropic")` from `core/config.ts`, which throws a clear error immediately when the key is missing.

**No Input Sanitization Before LLM Prompt Injection:**
- Risk: User-provided text (question, context, plan, system descriptions, etc.) is interpolated directly into prompt strings without any sanitization. A malicious user can inject instructions into the prompt.
- Files: Affects all 26 framework prompt-building functions, e.g., `frameworks/courtroom/prosecutor.ts:12-30`, `frameworks/pre-mortem/pessimist.ts`, etc.
- Current mitigation: `SECURITY.md` documents the risk and advises users to sanitize inputs, but no framework implements sanitization.
- Recommendations: Validate that input fields do not contain strings like "Ignore previous instructions" or other injection patterns before prompt construction, or use Anthropic's system/user message separation properly to limit injection surface.

## Performance Bottlenecks

**Parallel LLM Calls With No Concurrency Cap:**
- Problem: Several frameworks fire all parallel agent calls with `Promise.all()` simultaneously. With default config, courtroom jury fires 5 parallel calls, six-hats fires 6, pre-mortem fires 5 pessimist calls, peer-review fires 3 reviewer calls. These are all uncapped.
- Files: `frameworks/courtroom/jury.ts:25-30`, `frameworks/six-hats/index.ts` (via `executeParallel`), `frameworks/pre-mortem/orchestrator.ts:35`, `frameworks/studio/orchestrator.ts:36,59`, `frameworks/peer-review/orchestrator.ts:46`
- Cause: `executeParallel()` in `core/orchestrator.ts:12` uses `Promise.all()` with no concurrency limit.
- Improvement path: Add a `concurrency` parameter to `executeParallel()` using a semaphore pattern; default to 3 simultaneous calls to respect API rate limits.

**Each Framework Creates a New Provider Instance Per `run()` Call:**
- Problem: Every `run()` call instantiates a new provider object via `createProvider()`, which in turn instantiates a new Anthropic/OpenAI SDK client with fresh HTTP keep-alive pools. In high-throughput usage, this prevents connection reuse.
- Files: All framework `index.ts` files that call `createProvider()`, e.g., `frameworks/differential-diagnosis/index.ts:24-25`, `frameworks/studio/index.ts:20-21`
- Cause: Provider creation is inside `run()` rather than being a shared singleton.
- Improvement path: Accept an optional pre-created `LLMProvider` parameter in `run()` and fall back to creating one; this allows callers to reuse a single provider instance.

**Benchmark Does Not Actually Measure LLM Call Performance:**
- Problem: `benchmark/run-benchmarks.ts` explicitly avoids making LLM calls (`await Promise.resolve()` instead of `module.run(input)`). It only measures import/initialization time. The benchmark results are not representative of real-world latency.
- Files: `benchmark/run-benchmarks.ts:162-169`
- Cause: Comment says "avoid costs", but the benchmark is structurally useless for performance measurement.
- Improvement path: Add an optional `--live` flag that runs real calls on a small subset with cost awareness.

## Fragile Areas

**`parseJSON()` in Core Is the Single Point of Failure for All LLM Output:**
- Files: `core/orchestrator.ts:162-178`
- Why fragile: Every framework that uses the core path depends on LLMs returning parseable JSON. If an LLM returns a valid response but in a different format (e.g., an array at top level, or YAML), `parseJSON()` throws "No valid JSON found". The regex `\{[\s\S]*\}` will also greedily match the outermost braces, which may produce incorrect results if the model embeds multiple JSON objects in its response.
- Safe modification: Test any changes to the regex against the existing `test/core/orchestrator.test.ts` suite. Do not change to `JSON.parse()` directly without the extraction logic.
- Test coverage: `test/core/orchestrator.test.ts` covers key scenarios, but does not test partial JSON, multiple JSON objects in one response, or array-root JSON responses.

**E2E Tests Are Marked `continue-on-error: true` in CI:**
- Files: `.github/workflows/test.yml:53`
- Why fragile: E2E tests that fail in CI are silently ignored. A regression in any framework's LLM integration would not block a merge to main.
- Safe modification: Only change once LLM response determinism is improved (e.g., via recorded responses/mocking). Do not remove the flag without adding mock infrastructure.

**`executeSequential()` Returns Last Result Only, Discarding Intermediate State:**
- Files: `core/orchestrator.ts:19-30`
- Why fragile: The sequential orchestrator passes each result to the next step but returns only the final value. If an intermediate agent's output is needed by callers (e.g., for partial auditing), it is lost. Callers have no way to retrieve intermediate values.
- Test coverage: `test/core/orchestrator.test.ts` tests this behavior explicitly but only confirms that the last value is returned — it does not test that intermediate state is preserved.

**`validateStructure()` in Core Has No Runtime Effect:**
- Files: `core/validators.ts:45-53`
- Why fragile: `validateStructure<T>()` accepts a user-provided type predicate function but has no built-in schema validator. If callers pass a type predicate that always returns `true`, the validation silently passes for any input. No framework currently uses this function, so the risk is theoretical but the API is misleading.

## Scaling Limits

**Token Usage Grows With Context Accumulation in Sequential Frameworks:**
- Current capacity: No documented token limits per call; `maxTokens` defaults to `4096` output, but input context is unbounded.
- Limit: For frameworks like peer-review (paper → reviews → rebuttal → editor decision), each subsequent agent receives the full accumulated context from all prior agents. With a large paper and multiple reviewer outputs, the input context for the editor can easily exceed 30,000+ tokens.
- Scaling path: Add configurable truncation for accumulated context, or use summarization agents to compress prior stages before passing downstream.

## Dependencies at Risk

**Hardcoded Model Identifiers Across 26 Framework Type Files:**
- Risk: Every framework's `DEFAULT_CONFIG` in `types.ts` hardcodes model version strings like `"claude-3-7-sonnet-20250219"` or `"claude-3-5-sonnet-20241022"`. When Anthropic deprecates these model IDs, all 26 `types.ts` files must be updated individually.
- Impact: Framework fails at runtime with an Anthropic API error (model not found).
- Migration plan: Introduce a `DEFAULT_MODELS` constant in `core/config.ts` and have all `DEFAULT_CONFIG` objects reference it. The model strings in `core/providers/anthropic.ts:52-57` pricing table have the same fragility.

**`@anthropic-ai/sdk` Version Pinned at `^0.32.1`:**
- Risk: Minor version bumps may change the messages API or response shapes. The Anthropic provider maps `system` messages to `user` role (already a bug), meaning any SDK-level fix to this behavior could break the mapping.
- Impact: Silent behavior change in prompt construction.
- Migration plan: Pin exactly and test before upgrading. Fix the system message bug before upgrading SDK.

## Missing Critical Features

**No Streaming Support:**
- Problem: All 26 frameworks use non-streaming `messages.create()` / `fetch()` calls. For long-running frameworks (dissertation-committee, regulatory-impact with 5+ parallel analysts), users see no output for 30-60+ seconds.
- Blocks: Interactive use, CLI progress indication, and long-context frameworks where streaming is the expected UX.

**No Built-in Cost Guard / Budget Cap:**
- Problem: The `AuditTrail` tracks cost after-the-fact, but there is no mechanism to abort a run if accumulated spend exceeds a threshold. A misconfigured run with many agents at high `maxTokens` can incur unexpected API costs with no circuit breaker.
- Blocks: Safe production deployment and multi-user scenarios.

## Test Coverage Gaps

**Framework-Internal Logic Has No Unit Tests:**
- What's not tested: Individual agent functions (`prosecute()`, `defend()`, `deliberate()`, `renderVerdict()`, `conductReview()`, etc.) are only tested through full E2E flows that require live API keys.
- Files: `frameworks/courtroom/prosecutor.ts`, `frameworks/courtroom/defense.ts`, `frameworks/courtroom/jury.ts`, `frameworks/courtroom/judge.ts`, `frameworks/peer-review/reviewer.ts`, `frameworks/peer-review/author.ts`, `frameworks/peer-review/editor.ts`, and equivalents in all 26 frameworks.
- Risk: A regression in a single agent function would only surface in expensive E2E tests. The `continue-on-error: true` CI flag means it might not surface at all.
- Priority: High

**`AuditTrail` and Observability Layer Have No Tests:**
- What's not tested: `core/observability.ts` — `AuditTrail.recordStep()`, `AuditTrail.finalize()`, `AuditTrail.getTotalCost()`, `formatCostReport()`.
- Files: `core/observability.ts`
- Risk: Cost reporting bugs would go undetected.
- Priority: Medium

**`createProvider()` and `getProviderFromEnv()` Have No Tests:**
- What's not tested: Provider selection logic, fallback order (Anthropic → OpenAI → OpenRouter), error message when no key is present.
- Files: `core/providers/index.ts`
- Risk: Provider selection regressions would only surface at runtime.
- Priority: Medium

---

*Concerns audit: 2026-03-16*
