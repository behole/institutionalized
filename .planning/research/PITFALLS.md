# Domain Pitfalls

**Domain:** Multi-agent LLM reasoning library — npm publishing, skill creation, library hardening
**Project:** Institutional Reasoning
**Researched:** 2026-03-16
**Confidence:** HIGH (primary source: direct codebase analysis of `CONCERNS.md` and code inspection)

---

## Critical Pitfalls

Mistakes that cause rewrites, silent regressions, or broken npm packages.

---

### Pitfall 1: Publishing a Monorepo as a Single npm Package Without an Exports Map

**What goes wrong:** The root `package.json` uses `"main": "./index.ts"` (or has no `main` at all). Consumers who `npm install institutional-reasoning` can import the root, but sub-paths like `institutional-reasoning/frameworks/courtroom` either don't resolve or resolve to `.ts` files that can't run in non-Bun environments. The Bun workspace `workspace:*` references in each framework's `package.json` are dev-time only and will not work after publish.

**Why it happens:** The current root `package.json` lacks an `exports` map entirely. Each framework `package.json` uses `"main": "./index.ts"` — a TypeScript file as the main entry. This works at dev time with Bun but produces broken packages for npm consumers running Node.

**Consequences:**
- Downstream consumers get `ERR_PACKAGE_PATH_NOT_EXPORTED` or import TypeScript source directly
- Tree-shaking and conditional exports (CJS/ESM) are unavailable
- The `workspace:*` protocol is specific to Bun/yarn workspaces and breaks on publish

**Prevention:**
- Add an `exports` map to the root `package.json` before running `npm publish`
- Build step must emit `.js` files (Bun's `bun build --target=node`) alongside `.d.ts` declarations
- Use `"main"` for legacy CJS and `"module"` + `"exports"` for ESM dual packaging
- Strip `workspace:*` dependencies and replace with real semver ranges in published packages

**Warning signs:**
- `package.json` has no `exports` field
- Framework `package.json` entries point to `.ts` files as `main`
- No `build` script in any package

**Phase:** npm publishing phase — must be addressed before any `npm publish` run

---

### Pitfall 2: The Typecheck Script Is Broken and Will Let Type Errors Ship

**What goes wrong:** `tsconfig.json` uses `"types": ["bun-types"]` and `"moduleResolution": "bundler"`. The `bun typecheck` script runs `bun tsc --noEmit`. TypeScript is not listed as a direct devDependency in `package.json`. This means the typecheck script either uses a stale globally installed `tsc`, fails silently, or runs with wrong compiler settings for a publish build.

**Why it happens:** TypeScript was never added as an explicit devDependency. The CI workflow runs `bun typecheck` but does not verify it exits non-zero on actual type errors. The `flags: Record<string, any>` across all 26 `run()` functions means strict mode isn't catching real problems.

**Consequences:**
- Type errors merge undetected
- Published package ships with incorrect type definitions
- Library consumers see `any` types for the main entry point (`flags` parameter) — zero IDE help
- The typecheck CI step may be passing by accident (no TS installed = command not found = skip?)

**Prevention:**
- Add `typescript` to `devDependencies` with an explicit version
- Verify `bun typecheck` fails on a deliberate type error before trusting it
- Define `RunFlags` interface in `core/types.ts` and replace all `Record<string, any>` in `run()` signatures
- Add `"exports"` with `"types"` pointers in each package's `package.json`

**Warning signs:**
- `bun x tsc --version` returns a different version than expected
- CI passes with deliberate `any` casts in public API
- No `typescript` in `devDependencies` in root `package.json`

**Phase:** Library hardening (TypeScript strictness pass) — first phase of the milestone

---

### Pitfall 3: Treating `continue-on-error: true` on E2E Tests as Acceptable Long-Term

**What goes wrong:** Any regression in any of the 26 frameworks' LLM integration is silently swallowed. A refactor that breaks courtroom's output parsing, changes a provider interface, or corrupts cost tracking will pass CI and merge to main.

**Why it happens:** E2E tests require live API keys, which are legitimately absent on PRs. The shortcut of `continue-on-error: true` was applied instead of adding mock infrastructure. With 26 frameworks and no per-framework unit tests, this is the only test signal for framework behavior — and it's been disabled.

**Consequences:**
- A provider abstraction refactor can silently break 7 frameworks
- Published npm package may ship broken framework implementations
- The `$0.00` cost bug in 7 frameworks was not caught by tests

**Prevention:**
- Before publishing: add mocked LLM responses for at least the "happy path" of each framework's orchestrator
- Do not remove `continue-on-error: true` until mock infrastructure exists
- Add unit tests for all individual agent functions (`prosecute()`, `defend()`, `deliberate()`) that inject a mock provider
- The `LLMProvider` interface makes this straightforward — pass a `MockProvider` that returns deterministic fixtures

**Warning signs:**
- No `__mocks__` or fixture files in the test directory
- All tests in `test/frameworks/` depend on `ANTHROPIC_API_KEY` being set
- `bun test:unit` passes but covers zero framework-internal logic

**Phase:** Test hardening phase — must precede the refactoring phase (refactor without test coverage is extremely high risk with 26 frameworks)

---

### Pitfall 4: Refactoring Courtroom Without a Test Net Will Break the Skill and MCP Server

**What goes wrong:** Courtroom is the most cited framework in the README, the skill, and the original POCs. It also has the most tech debt: it bypasses the provider abstraction, hardcodes Anthropic, has broken cost tracking, and duplicates JSON parsing. A refactor that touches all four agents simultaneously is likely to break output schema, breaking the MCP server and the skill in one go.

**Why it happens:** The courtroom framework was the first built and predates the core abstractions. The other 25 frameworks all depend on the patterns it introduced — but in their corrected form (via `FrameworkRunner`). Courtroom itself was never updated.

**Consequences:**
- Post-refactor courtroom may produce different JSON field names, breaking callers
- MCP server passes `(args, args)` as `(input, flags)` — fixing this simultaneously risks double-regression
- The `CourtroomConfig` type has fields (provider, model) that are silently ignored at runtime; callers may be relying on that ignored behavior

**Prevention:**
- Fix the MCP `(args, args)` bug as a separate, isolated commit before touching courtroom
- Add output fixture tests for courtroom's current (broken) behavior before refactoring — so regressions are visible
- Refactor courtroom agents one at a time, not all four simultaneously
- Do not change the public `run(input, flags)` signature — the `backwards compatibility` constraint in PROJECT.md is real

**Warning signs:**
- MCP `index.ts:371` still reads `framework.run(args, args)` at the start of the courtroom refactor
- No fixture for `CourtroomResult` shape exists before the refactor begins

**Phase:** Courtroom refactor should be gated on: (1) MCP bug fix, (2) fixture test for current output shape

---

### Pitfall 5: Publishing With Placeholder Cost Data (`$0.00`) Destroys Library Trust

**What goes wrong:** Seven frameworks hardcode `const costUSD = 0.0` and return it in their result. The `AuditTrail` then reports `Total cost: $0.00` for every run of these frameworks. Users relying on cost tracking for budget control discover the data is fabricated — this is a credibility-destroying bug for a library that markets audit trails as a feature.

**Why it happens:** Cost wiring was added to `FrameworkRunner` but the seven frameworks using their own orchestration patterns (not `FrameworkRunner`) were never updated. The files are: `courtroom`, `writers-workshop`, `hegelian`, `regulatory-impact`, `war-gaming`, `talmudic`, `dissertation-committee`.

**Consequences:**
- Published library has factually wrong audit trail output for nearly 30% of frameworks
- "No built-in cost guard" pitfall is worsened — you can't add a cost circuit breaker if the cost data is zero
- README's audit trail feature claim becomes misleading marketing

**Prevention:**
- Treat zero-cost frameworks as blocked from the publish checklist
- Wire `AuditTrail.getTotalCost()` pattern through all seven before publishing
- Add a test that asserts `auditLog.metadata.totalCost > 0` after a real (mocked) run

**Warning signs:**
- `grep -r "costUSD = 0.0"` in `frameworks/` returns any results
- `AuditLog.metadata.totalCost` is 0 in integration test output

**Phase:** Library hardening — cost wiring is a prerequisite for the "clean npm release" milestone

---

## Moderate Pitfalls

### Pitfall 6: The Anthropic System Message Bug Will Cause Subtle Prompt Degradation

**What goes wrong:** `core/providers/anthropic.ts` prepends `{ role: "system", content: systemPrompt }` to the messages array, then maps all `system` roles to `"user"`. The result is a user-turn message at position 0 containing the system prompt text. This is not how the Anthropic API expects system prompts — the correct approach is passing `system` as a top-level API parameter to `messages.create()`.

**Why it happens:** The `LLMCallParams` interface was designed for provider-agnostic message passing. The Anthropic SDK has a unique `system` parameter not present in OpenAI's interface, so the mapping was done incorrectly.

**Consequences:**
- All 26 frameworks are sending system prompts as user messages to Anthropic
- Framework reasoning quality is degraded — the model handles user-turn instructions differently than true system prompts
- If Anthropic SDK is upgraded and the behavior changes, all 26 frameworks' outputs shift simultaneously

**Prevention:**
- Fix the Anthropic provider before upgrading the SDK (the CONCERNS.md note is correct)
- Map `systemPrompt` to the `system` top-level parameter, strip `system`-role messages from the array
- Add a specific test: confirm `messages.create()` is called with a top-level `system` param, not a user-role message

**Warning signs:**
- Provider test doesn't assert the shape of the API call, only the returned content
- SDK upgrade is attempted before this fix

**Phase:** Provider fixes phase — must precede SDK upgrade

---

### Pitfall 7: Hardcoded Model IDs in 26 `DEFAULT_CONFIG` Objects Will Break at Deprecation

**What goes wrong:** Every framework's `types.ts` hardcodes a specific model string like `"claude-3-7-sonnet-20250219"`. When Anthropic deprecates these IDs, all 26 files fail at runtime with an opaque API error. The pricing table in `core/providers/anthropic.ts` has the same fragility — unknown model IDs fall back to `claude-3-5-sonnet` pricing, silently miscalculating costs.

**Why it happens:** No central model registry exists. Each framework was written with a current model at the time.

**Consequences:**
- Post-deprecation: all 26 frameworks fail simultaneously with no clear error
- Cost calculations silently use wrong rates for any model not in the 4-entry pricing table
- A model upgrade requires 26 file edits instead of 1

**Prevention:**
- Add `DEFAULT_MODELS` constants to `core/config.ts` (e.g., `FAST_MODEL`, `STANDARD_MODEL`, `CAPABLE_MODEL`)
- Update all `DEFAULT_CONFIG` objects to reference these constants
- The pricing table should use a fallback that logs a warning, not silently uses wrong rates

**Warning signs:**
- `grep -r "claude-3-" frameworks/` returns 26+ results
- No constants file for model names in `core/`

**Phase:** Library hardening — should be part of the "standardize framework patterns" pass

---

### Pitfall 8: Skill Routing Logic Will Degrade Without Decision Criteria

**What goes wrong:** The planned `/institutionalized` skill is supposed to ask "What kind of decision are you facing?" and recommend the right framework. With 26 options, a vague routing prompt will produce random-feeling recommendations. Users will distrust the guidance after two or three poor matches.

**Why it happens:** The existing `institutional-lite` SKILL.md uses only 6 frameworks with a simple selection guide. Scaling to 26 requires explicit disambiguation criteria — not just listing framework names.

**Consequences:**
- The skill recommends "courtroom" for everything adversarial, even when "red-blue" or "devils-advocate" is better
- Users who know the frameworks bypass the skill entirely
- The skill's value proposition ("guided discovery") is lost

**Prevention:**
- Write explicit disambiguation questions in the skill: "Is there a binary yes/no decision? → courtroom. Is this a plan/system to stress-test? → red-blue."
- Group frameworks into 4-5 decision archetypes before writing the routing logic
- Test the routing logic against 10 real decision scenarios before publishing the skill

**Warning signs:**
- The skill's framework selection section is just a list of 26 names with one-line descriptions
- No decision tree or disambiguation questions in the SKILL.md draft

**Phase:** Skill creation phase

---

### Pitfall 9: `openai` npm Package Declared but OpenAI Provider Uses Raw `fetch`

**What goes wrong:** `package.json` declares `"openai": "^4.76.1"` but `core/providers/openai.ts` uses raw `fetch()` calls, not the `openai` SDK. The declared dependency is phantom — it adds to install size without being used. Meanwhile, the raw `fetch` implementation misses retry logic, streaming, timeout handling, and the type safety the SDK provides.

**Why it happens:** The OpenAI provider was written before or independently of the SDK adoption decision.

**Consequences:**
- Phantom dependency confuses library consumers reading `package.json`
- OpenAI rate limit (429) errors hang indefinitely — no retry, no backoff
- If the OpenAI API changes response shape, `fetch` calls break silently
- Library consumers may expect `openai` SDK instances to be injectable, but the interface doesn't support this

**Prevention:**
- Decide: use the `openai` SDK properly, or remove the dependency and document that OpenAI is accessed via raw fetch
- If using the SDK: refactor `openai.ts` to use the `OpenAI` client constructor
- If not: remove `"openai"` from `dependencies` to keep the install footprint honest

**Warning signs:**
- `grep -r "from 'openai'" core/` returns zero results while `package.json` has the dependency

**Phase:** Dependency cleanup — part of the pre-publish audit

---

## Minor Pitfalls

### Pitfall 10: Import Alias Inconsistency Will Confuse IDEs and Refactoring Tools

**What goes wrong:** Newer frameworks import from `@institutional-reasoning/core` (the package name) while older ones use `@core/*` (the tsconfig path alias). Both resolve to the same code at dev time in Bun, but after building for npm publish, `@core/*` path aliases do not resolve in the published package without a bundler.

**Prevention:**
- Standardize on `@core/*` (it is defined in `tsconfig.json`) before the npm build step
- Add a lint rule or CI check: `grep -r "@institutional-reasoning/core" frameworks/` should return zero results post-standardization

**Warning signs:**
- IDE shows "cannot find module" for some frameworks when TypeScript language server resolves paths
- A global find-replace for core imports misses half the usages

**Phase:** Library hardening — standardize imports as part of the TypeScript strict pass

---

### Pitfall 11: Demo Files with Non-null API Key Assertions Will Fail for New Contributors

**What goes wrong:** `demo-terminal-velocity.ts` and `demo-terminal-simple.ts` use `process.env.ANTHROPIC_API_KEY!`. A new contributor who clones the repo and runs a demo without setting the key gets a runtime error at the API call site, not at startup — making the diagnosis non-obvious.

**Prevention:**
- Replace `!` assertions with explicit guards: `if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY required")`
- Or delete demo files if they're not part of the npm package surface area

**Warning signs:**
- Any `!` on an env var access in demo or example files

**Phase:** Dead code / cleanup pass

---

### Pitfall 12: `executeParallel()` With No Concurrency Cap Will Trigger API Rate Limits

**What goes wrong:** `Promise.all()` fires all agents simultaneously. Six-hats fires 6 calls, pre-mortem fires 5, courtroom jury fires 5. Under a tight rate limit tier, these burst calls hit 429 errors with no retry. Silently hanging because there is no timeout.

**Prevention:**
- Add a `concurrency` parameter to `executeParallel()` defaulting to 3
- Implement a simple semaphore using a counter + `Promise` queue
- Add `AbortController` with a configurable timeout (default: 30s) to all raw `fetch()` calls

**Warning signs:**
- `core/orchestrator.ts` `executeParallel` is still `Promise.all()` with no limit
- No timeout parameter anywhere in the provider implementations

**Phase:** Reliability hardening — can be done after the core refactor pass, before publishing

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|----------------|------------|
| TypeScript strict pass | `flags: Record<string, any>` will require touching all 26 `run()` signatures simultaneously — high blast radius | Define `RunFlags` in core first, then update frameworks one at a time; verify each with `bun typecheck` |
| Courtroom provider refactor | Changing agent internals may shift `CourtroomResult` JSON shape, breaking MCP and skill | Capture current output fixture before touching any agent file |
| npm publish prep | `workspace:*` deps and `.ts` main entries will produce a broken package | Run a dry `npm pack` and install the tarball in a fresh Node project before final publish |
| Skill creation | 26-framework routing will produce poor recommendations without explicit disambiguation | Write decision-tree questions, not just a name list; test with 10 real scenarios |
| Dependency upgrade (`@anthropic-ai/sdk` 0.32 → 0.50+) | System message bug will interact with SDK changes | Fix the system message mapping in `anthropic.ts` before upgrading the SDK version |
| Cost tracking fix | Seven frameworks need wiring through `AuditTrail` | Do not mark any framework as "done" in the hardening pass until `totalCost > 0` is verified |
| E2E test gate removal | Removing `continue-on-error: true` before mock infrastructure exists blocks all PRs on flaky LLM responses | Add mock provider fixtures first; only then tighten the CI gate |
| Import alias standardization | Mixed `@core/*` vs `@institutional-reasoning/core` will survive partial find-replace | Run `grep -r "@institutional-reasoning/core" frameworks/` as a CI lint check post-standardization |

---

## Sources

- Direct codebase analysis: `.planning/codebase/CONCERNS.md` (HIGH confidence — first-party audit)
- Direct codebase analysis: `core/providers/anthropic.ts`, `core/orchestrator.ts`, `mcp-server/index.ts`, `package.json`, `tsconfig.json`, `.github/workflows/test.yml` (HIGH confidence — source of truth)
- Project constraints: `.planning/PROJECT.md` (HIGH confidence — authoritative project scope)
- Training data on npm publish pitfalls, TypeScript monorepo publishing, and LLM library patterns (MEDIUM confidence — verified against observed codebase state where possible)
