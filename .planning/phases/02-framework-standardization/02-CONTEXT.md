# Phase 2: Framework Standardization - Context

**Gathered:** 2026-03-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Migrate all 26 frameworks to consistent patterns: FrameworkRunner for orchestration, `@core/*` imports, and accurate cost tracking. This is a pure internal refactor — the `run()` contract, return shapes, and external API are preserved. No new capabilities added.

</domain>

<decisions>
## Implementation Decisions

### Agent file structure
- Keep separate agent files where they already exist (courtroom: 4 files, peer-review: 3 files)
- Don't force separate agent files on simple frameworks — if it's currently consolidated in orchestrator.ts, leave it
- index.ts remains the entry point for every framework, re-exporting run() and types
- orchestrator.ts contains the logic, agent files contain role-specific code

### Migration ordering
- Fix the 7 broken frameworks first (courtroom, writers-workshop, hegelian, regulatory-impact, war-gaming, talmudic, dissertation-committee)
- Courtroom goes first among the broken 7 — hardest case, sets the pattern
- Remaining 19 working frameworks migrated in batches grouped by similarity (e.g., all 2-agent sequential frameworks together, all parallel-agent frameworks together)
- Peer-review's relative import fix (`../../core/types` → `@core/types`) folded into its migration — no separate plan

### Output format preservation
- run() function signature stays identical — same params, same return type
- metadata.costUSD field populated with real values from provider.calculateCost() (replacing $0.00 placeholders)
- modelUsage token counts also verified and fixed alongside cost
- FrameworkRunner is purely an implementation detail — consumers see no change
- No additions to return types in this phase

### Courtroom refactor
- Full restructure — courtroom becomes the gold standard for multi-agent frameworks
- Capture current courtroom output as test fixtures BEFORE refactoring (per STATE.md decision)
- Replace all direct Anthropic SDK calls with LLMProvider abstraction via FrameworkRunner
- Accept any LLMProvider, not just Anthropic — provider selection is the caller's responsibility
- Preserve the exact multi-round institutional flow (opening statements → cross-examination → closing → verdict) — the structure is the value

### Claude's Discretion
- What agent files export (prompt builders vs full agent functions) — choose cleanest pattern for FrameworkRunner's API
- Exact batching groups for the 19 working frameworks
- How to handle any edge cases in cost calculation where provider.calculateCost() doesn't map cleanly to existing metadata shape

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `FrameworkRunner` (core/orchestrator.ts:143-266): runAgent(), runParallel(), getAuditTrail(), finalize() — built-in cost tracking and semaphore
- `AuditTrail` (core/observability.ts): recordStep() with cost, getTotalCost(), formatCostReport()
- `LLMProvider` interface (core/types.ts:34): call() and calculateCost() — all providers implement this
- `AnthropicProvider.calculateCost()` (core/providers/anthropic.ts:58-81): Pricing tables for all Claude models

### Established Patterns
- Provider pattern: each provider implements LLMProvider with call() and calculateCost()
- FrameworkRunner.runAgent() calls provider.call() then provider.calculateCost() and records to audit trail automatically
- executeParallel() uses Promise.allSettled + AggregateError (from Phase 1)
- `@core/*` path alias configured in tsconfig.json paths (line 17-20)

### Integration Points
- 0/26 frameworks currently use FrameworkRunner — all need migration
- 7 frameworks have costUSD = 0.0 placeholders in orchestrator.ts
- Courtroom's 4 agent files (prosecutor.ts, defense.ts, judge.ts, jury.ts) import Anthropic SDK directly
- peer-review has mixed imports: @core/config + ../../core/types
- All frameworks export run() from index.ts — this entry point contract is preserved

</code_context>

<specifics>
## Specific Ideas

- Courtroom should be the "gold standard" multi-agent framework after refactoring — if courtroom works cleanly with FrameworkRunner, every other framework will too
- Capture courtroom output fixtures before touching any code (STATE.md: "Capture courtroom output fixtures before refactoring — most tech-debt-laden framework")
- Core value applies: "Every framework must produce genuinely better reasoning than a single LLM call — the institutional structure is the point"

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-framework-standardization*
*Context gathered: 2026-03-16*
