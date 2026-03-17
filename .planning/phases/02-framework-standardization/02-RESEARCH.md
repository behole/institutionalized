# Phase 2: Framework Standardization - Research

**Researched:** 2026-03-16
**Domain:** TypeScript multi-agent framework refactoring — FrameworkRunner migration, import standardization, cost tracking
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Agent file structure**
- Keep separate agent files where they already exist (courtroom: 4 files, peer-review: 3 files)
- Don't force separate agent files on simple frameworks — if it's currently consolidated in orchestrator.ts, leave it
- index.ts remains the entry point for every framework, re-exporting run() and types
- orchestrator.ts contains the logic, agent files contain role-specific code

**Migration ordering**
- Fix the 7 broken frameworks first (courtroom, writers-workshop, hegelian, regulatory-impact, war-gaming, talmudic, dissertation-committee)
- Courtroom goes first among the broken 7 — hardest case, sets the pattern
- Remaining 19 working frameworks migrated in batches grouped by similarity (e.g., all 2-agent sequential frameworks together, all parallel-agent frameworks together)
- Peer-review's relative import fix (`../../core/types` → `@core/types`) folded into its migration — no separate plan

**Output format preservation**
- run() function signature stays identical — same params, same return type
- metadata.costUSD field populated with real values from provider.calculateCost() (replacing $0.00 placeholders)
- modelUsage token counts also verified and fixed alongside cost
- FrameworkRunner is purely an implementation detail — consumers see no change
- No additions to return types in this phase

**Courtroom refactor**
- Full restructure — courtroom becomes the gold standard for multi-agent frameworks
- Capture current courtroom output as test fixtures BEFORE refactoring (per STATE.md decision)
- Replace all direct Anthropic SDK calls with LLMProvider abstraction via FrameworkRunner
- Accept any LLMProvider, not just Anthropic — provider selection is the caller's responsibility
- Preserve the exact multi-round institutional flow (opening statements → cross-examination → closing → verdict) — the structure is the value

### Claude's Discretion
- What agent files export (prompt builders vs full agent functions) — choose cleanest pattern for FrameworkRunner's API
- Exact batching groups for the 19 working frameworks
- How to handle any edge cases in cost calculation where provider.calculateCost() doesn't map cleanly to existing metadata shape

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CODE-02 | Standardize all import paths to `@core/*` across all 26 frameworks | Import audit shows 3 categories of non-standard imports; `@core/*` already mapped in tsconfig.json paths |
| CODE-05 | Ensure all 26 frameworks consistently adopt `FrameworkRunner` for orchestration and audit trails | `FrameworkRunner` fully built in `core/orchestrator.ts:143-266`; no framework currently uses it |
| PROV-02 | Refactor courtroom framework to use `LLMProvider` abstraction instead of direct Anthropic SDK calls | All 4 courtroom agent files have `import Anthropic from "@anthropic-ai/sdk"` with module-level singleton — needs full replacement |
| PROV-03 | Fix 7 frameworks with hardcoded `$0.00` cost tracking to report accurate costs | Confirmed 7 orchestrators with `costUSD = 0.0 // Placeholder`; `FrameworkRunner.runAgent()` auto-records cost via `provider.calculateCost()` |
</phase_requirements>

---

## Summary

Phase 2 is a pure internal refactoring with zero API surface changes. The goal is uniformity: every framework's orchestrator.ts becomes a thin wrapper over `FrameworkRunner`, and every agent call routes through `provider.call()` + `provider.calculateCost()` automatically. The external `run()` contract is frozen — callers see no changes.

The codebase has three distinct import problems that need fixing: (1) four courtroom agent files import `Anthropic` from `@anthropic-ai/sdk` directly, (2) six frameworks in the "broken" group import `generateObject` from `@institutional-reasoning/core` (workspace package name), and (3) all four peer-review agent files use `../../core/types` relative paths. All three resolve to `@core/*` equivalents.

The cost tracking problem is mechanically simple once FrameworkRunner is in place: `FrameworkRunner.runAgent()` calls `provider.calculateCost(response.usage, model)` and writes to the AuditTrail automatically. The seven broken orchestrators just need to stop computing `costUSD = 0.0` manually and instead use `runner.getAuditTrail().getTotalCost()` after all agents complete.

**Primary recommendation:** Migrate courtroom first as the gold standard, then group remaining 25 frameworks into 5 batches by structural similarity (parallel-juror, sequential-dialectic, generateObject-based, LLMProvider-passing, and simple single-agent).

---

## Standard Stack

### Core (already in place — do not change)

| Component | Location | Purpose | Notes |
|-----------|----------|---------|-------|
| `FrameworkRunner<TInput, TResult>` | `core/orchestrator.ts:143-266` | Orchestration + auto cost tracking | `runAgent()`, `runParallel()`, `getAuditTrail()`, `finalize()` |
| `AuditTrail` | `core/observability.ts` | Per-step cost, token, timing records | `recordStep()`, `getTotalCost()`, `finalize()` |
| `LLMProvider` interface | `core/types.ts:34` | Provider abstraction | `call()` + `calculateCost()` |
| `AnthropicProvider.calculateCost()` | `core/providers/anthropic.ts:58-81` | Real pricing for all Claude models | Falls back to `claude-3-5-sonnet-20241022` rates for unknown models |
| `createProvider()` | `core/providers/index.ts` | Factory for anthropic/openai/openrouter | Already used in all working frameworks' index.ts files |
| `parseJSON<T>()` | `core/orchestrator.ts:271-287` | JSON extraction from LLM text | Handles markdown code blocks |
| `generateObject<T>()` | `core/orchestrator.ts:293-324` | Typed object from LLM | Has optional `provider` param — this is what broken frameworks need to thread through |

### Path Alias (already configured)

```json
// tsconfig.json paths (line 17-20)
"paths": {
  "@core/*": ["./core/*"],
  "@frameworks/*": ["./frameworks/*"]
}
```

`@institutional-reasoning/core` resolves via workspace to the same `core/` directory. After migration all imports use `@core/*` directly.

### No new dependencies required for this phase.

---

## Architecture Patterns

### Current State Audit (confirmed by code inspection)

**Non-standard imports to fix:**

| Category | Files | Problem | Fix |
|----------|-------|---------|-----|
| Direct SDK | `courtroom/{prosecutor,defense,jury,judge}.ts` | `import Anthropic from "@anthropic-ai/sdk"` + module singleton | Replace with `LLMProvider` param + `FrameworkRunner.runAgent()` |
| Workspace alias | `{writers-workshop,hegelian,regulatory-impact,war-gaming,talmudic,dissertation-committee}` agent files | `import { generateObject } from "@institutional-reasoning/core"` | Replace with `import { generateObject } from "@core/orchestrator"` (or use `runner.runAgent()` directly) |
| Relative path | `peer-review/{orchestrator,reviewer,author,editor}.ts` | `import type { LLMProvider } from "../../core/types"` | Replace with `import type { LLMProvider } from "@core/types"` |

**Cost tracking problem (confirmed 7 files):**
All 7 have this pattern in their orchestrator.ts:
```typescript
const costUSD = 0.0; // Placeholder
// ...
metadata: { costUSD, ... }
```

**No framework currently uses FrameworkRunner** (confirmed by full audit).

---

### Pattern 1: FrameworkRunner — Single Agent Framework

**What:** Simplest migration pattern for frameworks that make one or two sequential LLM calls in `index.ts` (AAR, devils-advocate, swot, socratic, etc.)

**When to use:** Framework has consolidated orchestration in a single file with straightforward linear flow.

**Example (current working pattern in `aar/index.ts` — needs FrameworkRunner wrapper added):**
```typescript
// BEFORE (current): direct provider.call() in index.ts
const response = await provider.call({ model, messages, maxTokens });
const parsed = parseJSON<{...}>(response.content);
return { ..., metadata: { timestamp, config } }; // no cost!

// AFTER: FrameworkRunner wraps the call
const runner = new FrameworkRunner<AARInput, AARResult>("aar", review);
const response = await runner.runAgent(
  "facilitator",
  provider,
  config.models.facilitator,
  prompt,
  config.parameters.temperature,
  4096
);
const parsed = parseJSON<{...}>(response.content);
const { auditLog } = await runner.finalize(result, "complete");
return {
  ...result,
  metadata: { timestamp, config, costUSD: auditLog.metadata.totalCost }
};
```

### Pattern 2: FrameworkRunner — Multi-Agent Sequential (orchestrator.ts pattern)

**What:** Frameworks with separate agent files already accepting `LLMProvider` param (pre-mortem, red-blue, studio, peer-review). Orchestrator.ts calls individual agent functions in sequence.

**When to use:** Agent functions already take `(input, config, provider)` signature.

**Example (pre-mortem pattern — add FrameworkRunner to orchestrator.ts):**
```typescript
// Source: core/orchestrator.ts:143-266
// In orchestrator.ts: wrap existing calls with runner
export async function runPreMortem(
  plan: Plan,
  config: PreMortemConfig,
  provider: LLMProvider
): Promise<PreMortemResult> {
  const runner = new FrameworkRunner<Plan, PreMortemResult>("pre-mortem", plan);

  // Replace: const scenarios = await Promise.all(pessimistPromises)
  // With: runner.runParallel() handles concurrency + cost tracking
  const responses = await runner.runParallel(
    Array.from({ length: config.parameters.numPessimists }, (_, i) => ({
      name: `pessimist-${i+1}`,
      provider,
      model: config.models.pessimist,
      prompt: buildPessimistPrompt(i+1, plan, config),
      temperature: config.parameters.temperature,
    }))
  );
  // parse responses into FailureScenario[]...

  const { auditLog } = await runner.finalize(result, "complete");
  return { ...result, metadata: { ...result.metadata, costUSD: auditLog.metadata.totalCost } };
}
```

**NOTE:** The current `pre-mortem` agent functions (`imagineFailure`, `synthesizeRisks`) call `provider.call()` directly and return parsed domain types. For FrameworkRunner integration, there are two clean approaches:
1. **Inline prompts in orchestrator.ts** — orchestrator calls `runner.runAgent()` with the prompt, parses the response itself
2. **Agent functions return prompt string** — agent file exports `buildPrompt()`, orchestrator calls `runner.runAgent()` then passes response to a `parseResponse()` helper

The CONTEXT.md grants discretion on this. Approach 1 is cleaner when the prompt logic is simple; Approach 2 when agent files contain significant prompt-building complexity worth preserving as separate units.

### Pattern 3: Broken Framework with `generateObject` — Add Provider Threading

**What:** The 6 broken frameworks (writers-workshop, hegelian, regulatory-impact, war-gaming, talmudic, dissertation-committee) use `generateObject` from `@institutional-reasoning/core` without a provider. The function auto-creates a provider via `getProvider()`. This means: no cost tracking, no FrameworkRunner, wrong import.

**Root cause:** `generateObject` accepts `provider?: LLMProvider` (optional). These frameworks never pass it, so the auto-created internal provider's usage can't be tracked.

**Fix steps:**
1. Change import: `@institutional-reasoning/core` → `@core/orchestrator`
2. Thread `provider` through orchestrator → agent files
3. Wrap orchestrator with `FrameworkRunner`; replace direct `generateObject` calls with `runner.runAgent()` (which calls `provider.call()` + auto-records cost)
   — OR — pass `provider` to `generateObject` and record cost manually after

**Recommended:** Use `runner.runAgent()` directly and parse the response with `parseJSON<T>()`. This eliminates `generateObject` entirely for these frameworks and makes cost tracking automatic.

**Example (hegelian/dialectic.ts after migration):**
```typescript
// Source: core/orchestrator.ts
import { parseJSON } from "@core/orchestrator";
import type { LLMProvider } from "@core/types";

// BEFORE:
export async function generateThesis(problem, config): Promise<Thesis> {
  return await generateObject<Thesis>({ model, system, prompt, temperature });
}

// AFTER: accept provider, return LLMCallResult tuple for runner integration
// Called from orchestrator with runner.runAgent(), then parse response here
export function buildThesisPrompt(problem: DialecticalProblem): { system: string; user: string } {
  return { system: "...", user: "..." };
}
export function parseThesisResponse(text: string): Thesis {
  return parseJSON<Thesis>(text);
}
```

### Pattern 4: Courtroom — Full Multi-Agent Refactor (gold standard)

**What:** Most complex case. Four agent files (prosecutor.ts, defense.ts, jury.ts, judge.ts) each have a module-level `const anthropic = new Anthropic(...)` singleton. Each agent function accepts `(input, config)` with no provider param.

**Changes required:**
1. Remove `import Anthropic from "@anthropic-ai/sdk"` from all 4 agent files
2. Remove module-level `anthropic` singletons
3. Agent functions gain `provider: LLMProvider` parameter
4. Agent functions call `provider.call(params)` instead of `anthropic.messages.create(params)`
5. Map Anthropic SDK response shape → `LLMResponse` shape (already done in AnthropicProvider)
6. Orchestrator.ts wraps all calls in `FrameworkRunner`
7. Jury parallelism: `jury.ts` currently uses `Promise.all(jurorPromises)` → replace with `runner.runParallel()`
8. Cost tracking: remove `const costUSD = 0.0` in orchestrator.ts, use `runner.getAuditTrail().getTotalCost()` after all phases complete

**Multi-round flow must be preserved:**
```
Phase 1: prosecute()       → runner.runAgent("prosecutor", ...)
Phase 2: defend()          → runner.runAgent("defense", ...)
Phase 3: deliberate()      → runner.runParallel(jurors)  ← config.parameters.jurySize jurors
Phase 4: renderVerdict()   → runner.runAgent("judge", ...)  [conditional on jury.proceedsToJudge]
```

**Validation logic preservation:** The exhibit validation in `prosecutor.ts` (`validateExhibits`) and juror reasoning validation are pure logic with no LLM calls. Keep them as-is — they don't need FrameworkRunner.

### Anti-Patterns to Avoid

- **Don't change `run()` signatures in index.ts** — `run(input, flags)` is the frozen contract; provider creation stays in index.ts
- **Don't add `provider` to index.ts `run()` params** — index.ts creates the provider from `flags.provider` + API key, then passes to orchestrator
- **Don't use `runner.finalize()` for intermediate steps** — call `finalize()` once at the end; use `runner.getAuditTrail().getTotalCost()` mid-execution if needed
- **Don't skip fixture capture for courtroom** — STATE.md mandates capturing output fixtures before any code changes
- **Don't import `@institutional-reasoning/core` in any file** — always use `@core/*`
- **Don't use `generateObject` without passing a provider** — auto-provider creation bypasses cost tracking

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Cost calculation per API call | Custom pricing tables | `provider.calculateCost(response.usage, model)` | AnthropicProvider already has full pricing; other providers implement same interface |
| Concurrency limiting for parallel agents | Custom semaphore | `FrameworkRunner.runParallel()` | Already wraps shared semaphore; avoids duplicate concurrent logic |
| Audit trail accumulation | Custom cost accumulators | `AuditTrail.recordStep()` / `getTotalCost()` | Already handles multi-step accumulation with timestamps and per-step breakdown |
| JSON extraction from LLM text | Custom regex matching | `parseJSON<T>()` from `@core/orchestrator` | Already handles markdown code blocks + raw JSON |
| Provider creation from env | Custom env reading | `createProvider({ name, apiKey })` + `getAPIKey(provider)` | Already handles anthropic/openai/openrouter switching |

**Key insight:** `FrameworkRunner.runAgent()` is the single choke-point. It calls `provider.call()`, calculates cost, and writes to AuditTrail in one step. Bypassing it for any agent call means that call has zero cost tracking.

---

## Common Pitfalls

### Pitfall 1: Provider passes through but cost still shows $0.00
**What goes wrong:** The orchestrator creates a `FrameworkRunner` and gets agent responses, but the returned `metadata.costUSD` is still 0.
**Why it happens:** Calling `provider.call()` directly instead of `runner.runAgent()`. Direct calls don't write to the AuditTrail.
**How to avoid:** All LLM calls must go through `runner.runAgent()` or `runner.runParallel()`. Never call `provider.call()` directly inside a framework orchestrator.
**Warning signs:** `runner.getAuditTrail().getTotalCost()` returns 0 after execution.

### Pitfall 2: `generateObject` still getting called without provider
**What goes wrong:** Agent file still imports `generateObject` from `@core/orchestrator` and calls it without `provider`. No TypeScript error because `provider` is optional.
**Why it happens:** Partial migration — import path updated but function signature not changed.
**How to avoid:** After updating the import, also update every `generateObject()` call to either pass `provider` explicitly, or replace with `runner.runAgent()` + `parseJSON<T>()`.
**Warning signs:** TypeScript compiles clean but cost remains $0.00 at runtime.

### Pitfall 3: Jury parallelism loses cost tracking
**What goes wrong:** `jury.ts` still uses `Promise.all(jurorPromises)` internally; FrameworkRunner is never involved for juror calls.
**Why it happens:** The juror promises call `provider.call()` directly — migrating the prosecutor but forgetting the parallel juror pattern.
**How to avoid:** Replace the `runJuror()` internal calls with prompts passed to `runner.runParallel()` from the orchestrator level. The jury phase needs to be orchestrated by FrameworkRunner.
**Warning signs:** Audit trail has steps for prosecutor, defense, judge — but not for individual jurors.

### Pitfall 4: Breaking `run()` contract by changing return shape
**What goes wrong:** After migrating to FrameworkRunner, the returned object shape changes (e.g., costUSD moves, modelUsage disappears).
**Why it happens:** `runner.finalize()` returns `{ result, auditLog }` — if the orchestrator returns this directly instead of the original result type, the shape breaks.
**How to avoid:** `runner.finalize()` is for internal use. Extract `auditLog.metadata.totalCost` and assign to `metadata.costUSD`. Return the original result type unchanged.

### Pitfall 5: Fixture capture skipped for courtroom
**What goes wrong:** Courtroom is refactored first and fixtures are captured after the fact.
**Why it happens:** Rushing — fixture capture feels optional.
**How to avoid:** Write a small test script that calls `run()` and saves the output to a `.json` file BEFORE touching any courtroom code. This is a STATE.md requirement.

### Pitfall 6: `@institutional-reasoning/core` import left in non-broken frameworks
**What goes wrong:** After fixing the broken 7, the 19 working frameworks still pass typecheck but some have `@institutional-reasoning/core` imports that were missed.
**Why it happens:** Working frameworks don't use `@institutional-reasoning/core` currently (confirmed by audit — only the broken 6 do). But future frameworks might accidentally add it.
**How to avoid:** After all migrations, run a grep audit: `grep -r "@institutional-reasoning" frameworks/ --include="*.ts"` should return zero results.

### Pitfall 7: FrameworkRunner concurrency vs. writers-workshop sequential peer reviews
**What goes wrong:** writers-workshop currently runs peer reviews sequentially (for loop, not parallel). Naively migrating to `runner.runParallel()` changes behavior.
**Why it happens:** The CONTEXT.md says "Preserve the exact multi-round institutional flow — the structure is the value." Peer reviews in writers-workshop are currently sequential.
**How to avoid:** Check existing parallelism pattern before migrating. writers-workshop's `for` loop can use `runner.runAgent()` in a loop (not `runParallel()`). The key requirement is cost tracking, not parallelization change.

---

## Code Examples

### FrameworkRunner instantiation and finalize
```typescript
// Source: core/orchestrator.ts:143-266
const runner = new FrameworkRunner<InputType, ResultType>("framework-name", input);

// Single agent call
const response = await runner.runAgent(
  "agent-name",   // name for audit trail
  provider,       // LLMProvider instance
  model,          // string e.g. DEFAULT_MODELS.CLAUDE_SONNET
  prompt,         // user prompt string
  0.7,            // temperature (default 0.7)
  2048,           // maxTokens (default 2048)
  systemPrompt    // optional system prompt string
);
// response.content, response.usage.inputTokens, response.usage.outputTokens

// Parallel agents
const responses = await runner.runParallel([
  { name: "juror-1", provider, model, prompt: juror1Prompt, temperature: 0.9, maxTokens: 2048 },
  { name: "juror-2", provider, model, prompt: juror2Prompt, temperature: 0.9, maxTokens: 2048 },
]);

// Get accumulated cost mid-execution (before finalize)
const runningCost = runner.getAuditTrail().getTotalCost();

// At end: finalize
const { auditLog } = await runner.finalize(result, "outcome-description");
const totalCostUSD = auditLog.metadata.totalCost;
```

### Cost extraction for metadata
```typescript
// BEFORE (broken pattern)
const costUSD = 0.0; // Placeholder
return { ..., metadata: { costUSD, ... } };

// AFTER (correct pattern)
// All agent calls go through runner.runAgent()
// After finalize:
const { auditLog } = await runner.finalize(frameworkResult, "complete");
return {
  ...frameworkResult,
  metadata: {
    timestamp: new Date().toISOString(),
    duration: Date.now() - startTime,
    costUSD: auditLog.metadata.totalCost,
    modelUsage: config.models,
  },
};
```

### Replacing direct Anthropic SDK call (courtroom pattern)
```typescript
// Source: frameworks/courtroom/prosecutor.ts (current)
// BEFORE
import Anthropic from "@anthropic-ai/sdk";
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function prosecute(caseInput, config): Promise<Prosecution> {
  const message = await anthropic.messages.create({
    model: config.models.prosecutor,
    max_tokens: 4096,
    temperature: 0.7,
    messages: [{ role: "user", content: prompt }],
  });
  const content = message.content[0];
  // ...parse content.text
}

// AFTER: remove Anthropic import, add provider param
import type { LLMProvider } from "@core/types";
import { parseJSON } from "@core/orchestrator";

export async function prosecute(
  caseInput: Case,
  config: CourtroomConfig,
  provider: LLMProvider   // ← new param
): Promise<Prosecution> {
  const response = await provider.call({
    model: config.models.prosecutor,
    maxTokens: 4096,
    temperature: 0.7,
    messages: [{ role: "user", content: prompt }],
  });
  const prosecution = parseJSON<Prosecution>(response.content);
  // validate...
  return prosecution;
}
```

### Replacing generateObject with runner.runAgent (broken framework pattern)
```typescript
// BEFORE (hegelian/dialectic.ts)
import { generateObject } from "@institutional-reasoning/core";

export async function generateThesis(problem, config): Promise<Thesis> {
  return await generateObject<Thesis>({ model, system, prompt, temperature });
}

// AFTER option A: agent file exports prompt builder, orchestrator uses runner
// dialectic.ts:
import { parseJSON } from "@core/orchestrator";
import type { LLMProvider } from "@core/types";

export async function generateThesis(
  problem: DialecticalProblem,
  config: HegelianConfig,
  provider: LLMProvider
): Promise<Thesis> {
  const response = await provider.call({
    model: config.models.thesis,
    messages: [{ role: "user", content: userPrompt }],
    temperature: config.parameters.temperature,
    systemPrompt: systemPrompt,
  });
  return parseJSON<Thesis>(response.content);
}

// orchestrator.ts: use runner.runAgent() to wrap above
// OR call generateThesis() then record cost manually
// RECOMMENDED: call runner.runAgent() in orchestrator, parse in agent file
```

### Relative import fix (peer-review pattern)
```typescript
// BEFORE (peer-review/reviewer.ts, author.ts, editor.ts, orchestrator.ts)
import type { LLMProvider } from "../../core/types";

// AFTER
import type { LLMProvider } from "@core/types";
```

---

## Framework Batch Groups (Claude's Discretion — Recommended Groupings)

Based on structural similarity, the 26 frameworks can be migrated in these batches:

**Wave 1: Broken — Direct SDK (1 framework)**
- courtroom — hardest, establishes the multi-agent pattern

**Wave 2: Broken — generateObject pattern (6 frameworks)**
- writers-workshop, hegelian, regulatory-impact, war-gaming, talmudic, dissertation-committee
- All share: `@institutional-reasoning/core` imports, no FrameworkRunner, `costUSD = 0.0`

**Wave 3: Working — LLMProvider-passing orchestrators (3 frameworks)**
- pre-mortem, red-blue, studio — already pass `provider` to agent functions, just need FrameworkRunner wrapper + cost extraction

**Wave 4: Working — peer-review (1 framework)**
- peer-review — relative import fix + FrameworkRunner (special case, separate batch)

**Wave 5: Working — index.ts-consolidated, parallel (5 frameworks)**
- six-hats, consensus-circle, architecture-review, tumor-board, grant-panel, phd-defense
- Use `parseJSON` + `executeParallel` in index.ts — consolidate into orchestrator + FrameworkRunner

**Wave 6: Working — index.ts-consolidated, sequential (11 frameworks)**
- aar, delphi, design-critique, devils-advocate, differential-diagnosis, intelligence-analysis, parliamentary, socratic, swot — single-agent or sequential with inline LLM calls

---

## State of the Art

| Old Approach | Current Approach | Relevance |
|--------------|------------------|-----------|
| `generateObject()` without provider | `runner.runAgent()` + `parseJSON<T>()` | Direct migration path for 6 broken frameworks |
| `Promise.all(jurorPromises)` | `runner.runParallel([...])` | Courtroom jury + any parallel pattern |
| `costUSD = 0.0` | `auditLog.metadata.totalCost` | All 7 broken frameworks |
| `import Anthropic from "@anthropic-ai/sdk"` | `import type { LLMProvider } from "@core/types"` | Courtroom agent files |
| `../../core/types` relative | `@core/types` alias | peer-review agent files |
| `@institutional-reasoning/core` | `@core/orchestrator` or `@core/types` | 6 broken framework agent files |

---

## Open Questions

1. **How should generateObject callers handle the provider threading?**
   - What we know: `generateObject` accepts optional `provider`; calling without it auto-creates via `getProvider()` (bypasses cost tracking)
   - What's unclear: Whether to keep `generateObject` calls (pass provider) vs. replace with `runner.runAgent()` + `parseJSON`
   - Recommendation: Replace with `runner.runAgent()` + `parseJSON<T>()` for consistency — this eliminates the optional-param footgun entirely

2. **writers-workshop sequential vs parallel peer reviews**
   - What we know: Current code runs peer reviews sequentially via `for` loop; orchestrator comments say "parallel" in Phase 1 heading but code is sequential
   - What's unclear: Was this intentional or a bug?
   - Recommendation: Preserve current sequential behavior to honor "structure is the value" principle; use `runner.runAgent()` in a loop, not `runner.runParallel()`

3. **dissertation-committee has a formDefaultCommittee local function shadowing the imported formCommittee**
   - What we know: orchestrator.ts has both `import { conductReview, formCommittee } from "./committee"` AND a local `function formDefaultCommittee()` — STATE.md notes this was fixed in Phase 1 as `Rename local formCommittee to formDefaultCommittee`
   - What's unclear: Whether this fix is already applied in the current codebase (code inspection shows both exist)
   - Recommendation: Verify the current state before migrating; if local function still shadows import, the Phase 1 fix may not have landed on current branch

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Bun test (built-in, no separate install) |
| Config file | `package.json` scripts: `"test": "bun test"` |
| Quick run command | `bun test test/core/orchestrator.test.ts` |
| Full suite command | `bun test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CODE-02 | Zero `../../core` or `@institutional-reasoning` imports in frameworks/ | lint/grep | `grep -r "@institutional-reasoning\|../../core\|../core" frameworks/ --include="*.ts"` returns empty | ✅ (post-migration grep) |
| CODE-05 | All 26 frameworks use FrameworkRunner | grep audit | `grep -rL "FrameworkRunner" frameworks/*/orchestrator.ts frameworks/*/index.ts` returns empty | ✅ (post-migration grep) |
| PROV-02 | Courtroom routes through LLMProvider | unit | `bun test test/core/orchestrator.test.ts` (existing FrameworkRunner tests) | ✅ |
| PROV-03 | 7 broken frameworks report non-zero costUSD | integration | Manual verification with mock provider OR e2e test checking `result.metadata.costUSD > 0` | ⚠️ Wave 0 gap — test needs mock provider (Phase 4 work) |

**Note on PROV-03 testing:** Full automated testing of cost tracking requires `MockLLMProvider` from Phase 4. For Phase 2 verification, use a grep check that no `costUSD = 0.0` placeholder remains, plus a runtime smoke test with a real provider.

### Sampling Rate
- **Per task commit:** `bun run typecheck && grep -r "@institutional-reasoning\|../../core" frameworks/ --include="*.ts" | wc -l` (should be 0)
- **Per wave merge:** `bun test test/core/` (core unit tests)
- **Phase gate:** `bun run typecheck` clean + grep audits return zero results before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `test/frameworks/courtroom-fixture.ts` — capture courtroom output before refactoring (manual capture script)
- [ ] No new test framework needed — Bun test already configured

---

## Sources

### Primary (HIGH confidence)
- Direct code inspection: `core/orchestrator.ts` — FrameworkRunner API, runAgent/runParallel signatures
- Direct code inspection: `core/observability.ts` — AuditTrail recordStep, getTotalCost, finalize
- Direct code inspection: `core/types.ts` — LLMProvider interface
- Direct code inspection: `core/providers/anthropic.ts` — calculateCost pricing tables
- Direct code inspection: `tsconfig.json` — `@core/*` path alias confirmed at lines 17-20
- Direct code inspection: all 26 framework files — import patterns, cost placeholder locations confirmed

### Secondary (MEDIUM confidence)
- `bun run typecheck` passes clean (confirmed): all existing imports are currently valid
- Package.json workspace config: `@institutional-reasoning/core` resolves to `./core` via Bun workspace

### Tertiary (LOW confidence)
- None — all findings verified by direct code inspection

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — verified by direct inspection of core/orchestrator.ts, core/types.ts, core/observability.ts
- Architecture patterns: HIGH — verified by auditing all 26 framework files
- Pitfalls: HIGH — derived from actual code patterns found in the broken frameworks
- Import audit: HIGH — exact file-by-file grep confirmed

**Research date:** 2026-03-16
**Valid until:** 2026-04-15 (stable internal codebase — no external dependencies changing)
