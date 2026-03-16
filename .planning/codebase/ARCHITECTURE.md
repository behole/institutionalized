# Architecture

**Analysis Date:** 2026-03-16

## Pattern Overview

**Overall:** Plugin-based multi-agent orchestration library

**Key Characteristics:**
- A shared `core/` layer provides LLM provider abstraction, orchestration primitives, validation utilities, and observability
- Each of 26 "frameworks" is an isolated plugin in `frameworks/<name>/` that models a real-world institutional decision process (courtroom, peer review, etc.)
- Every framework exposes a single `run(input, flags)` function as its contract, consumed by both the CLI and the MCP server
- Agents within a framework are individual TypeScript files (one per role: `prosecutor.ts`, `judge.ts`, etc.) that call LLMs and return typed JSON
- Frameworks are discovered and dispatched dynamically at runtime via `import()` — no central registry beyond the CLI/MCP lookup tables

## Layers

**Core Infrastructure:**
- Purpose: Shared abstractions used by every framework
- Location: `core/`
- Contains: Provider implementations, orchestration primitives, validators, observability, config helpers
- Depends on: `@anthropic-ai/sdk`, `openai` packages
- Used by: All frameworks, CLI, MCP server

**LLM Providers:**
- Purpose: Normalize calls to Anthropic, OpenAI, and OpenRouter behind a single `LLMProvider` interface
- Location: `core/providers/` (`anthropic.ts`, `openai.ts`, `openrouter.ts`, `index.ts`)
- Contains: Provider classes implementing `LLMProvider`, factory `createProvider()`, env-based auto-detect `getProviderFromEnv()`
- Depends on: `core/types.ts`
- Used by: Frameworks that create a provider at startup

**Frameworks:**
- Purpose: Encode a specific human decision-making institution as a multi-agent pipeline
- Location: `frameworks/<framework-name>/`
- Contains: `index.ts` (entry point), `orchestrator.ts` (pipeline logic), `types.ts` (domain types + DEFAULT_CONFIG), one file per agent role
- Depends on: `core/` via `@core/*` path aliases
- Used by: CLI (`cli.ts`), MCP server (`mcp-server/index.ts`), programmatic callers

**CLI Entry Point:**
- Purpose: Parse `bun cli.ts <framework> <input-file> [flags]`, dynamically import the framework, run it, map verdict to exit code
- Location: `cli.ts`
- Depends on: Framework `index.ts` files (dynamic import), `package.json` for version
- Used by: Developers and automation

**MCP Server:**
- Purpose: Expose all frameworks as Model Context Protocol tools consumable by Claude Code and other MCP clients
- Location: `mcp-server/index.ts`
- Contains: Tool definitions with JSON schemas, `CallToolRequestSchema` handler that dynamically imports and calls `run()`
- Depends on: `@modelcontextprotocol/sdk`, framework `index.ts` files (dynamic import)
- Used by: Claude Code, MCP-compatible AI assistants

**Tests:**
- Purpose: Unit tests for core primitives and e2e tests for each framework against real LLM calls
- Location: `test/core/` (unit), `test/frameworks/` (e2e)
- Depends on: `bun:test`, framework `index.ts` exports

## Data Flow

**CLI Invocation:**

1. User runs `bun cli.ts <framework> <input-file> [flags]`
2. `cli.ts` parses flags and validates framework name against known list
3. Input file is loaded (JSON parsed if `.json`, otherwise wrapped as `{ content: string }`)
4. `cli.ts` dynamically imports `./frameworks/<framework>/index.ts`
5. Calls `module.run(input, flags)`
6. Framework `index.ts` resolves config (defaults merged with flags), creates `LLMProvider` via `core/providers`
7. Framework calls its own `orchestrator.ts` `run*()` function with typed input + config + provider
8. Orchestrator calls agent role files sequentially and/or in parallel; each role calls `provider.call()` and returns typed JSON parsed from LLM response
9. Orchestrator assembles typed result and returns to `index.ts`
10. `cli.ts` optionally writes JSON to `--output` file, then maps `result.verdict.decision` to exit code (0/1/3) or exits 2 on error

**MCP Tool Invocation:**

1. MCP client calls a tool by framework name
2. `mcp-server/index.ts` `CallToolRequestSchema` handler dynamically imports `../frameworks/<name>/index.ts`
3. Calls `framework.run(args, args)` (args passed as both input and flags)
4. Result stringified as JSON and returned as MCP text content

**Agent Orchestration (inside a framework orchestrator):**

- **Sequential pipeline:** `prosecute() → defend() → deliberate() → renderVerdict()` — each step receives prior outputs
- **Parallel fan-out:** `deliberate()` spawns N juror agents via `Promise.all()`, collects votes
- **Iterative refinement:** Used in Delphi and Socratic frameworks — agent runs in a loop until `evaluator()` returns `true` or `maxRounds` is reached
- Core primitives for these patterns: `executeParallel<T>()`, `executeSequential<T>()`, `executeIterative<T>()` in `core/orchestrator.ts`

**State Management:**
- No persistent state. Each invocation is stateless.
- `AuditTrail` class in `core/observability.ts` accumulates steps in memory during a run, finalized to `AuditLog` at end
- Results are returned from `run()` to caller; optionally written to disk by CLI via `--output`

## Key Abstractions

**`LLMProvider` interface:**
- Purpose: Uniform contract for calling any LLM and calculating cost
- Definition: `core/types.ts`
- Implementations: `core/providers/anthropic.ts`, `core/providers/openai.ts`, `core/providers/openrouter.ts`
- Pattern: Strategy pattern — frameworks receive a provider instance, never reference a specific SDK directly

**`FrameworkRunner` class:**
- Purpose: Convenience wrapper that bundles a provider, runs agents, and records each step in an `AuditTrail`
- Location: `core/orchestrator.ts`
- Pattern: Stateful context object passed through a framework run; not universally adopted across all frameworks (some use provider directly)

**Framework `run()` export:**
- Purpose: Standardized entry-point contract every framework must satisfy
- Signature: `export async function run(input: TInput | { content: string }, flags: Record<string, any>): Promise<TResult>`
- Pattern: CLI and MCP server depend only on this interface, never on framework internals

**`AuditLog` / `AuditTrail`:**
- Purpose: Full structured record of every LLM call — prompt, response, tokens, cost, duration
- Location: `core/observability.ts`
- Pattern: Append-only log built during run, finalized and returned with result

**Per-framework `types.ts`:**
- Purpose: Domain types for input, intermediate agent outputs, final result, and `DEFAULT_CONFIG`
- Pattern: Each framework defines its own closed type hierarchy; no shared domain types across frameworks
- Examples: `frameworks/courtroom/types.ts`, `frameworks/peer-review/types.ts`

## Entry Points

**CLI:**
- Location: `cli.ts`
- Triggers: `bun cli.ts <framework> <input-file> [options]` or package scripts (`bun run courtroom`, etc.)
- Responsibilities: Argument parsing, input loading, dynamic framework dispatch, output writing, exit code mapping

**MCP Server:**
- Location: `mcp-server/index.ts`
- Triggers: MCP client connection over stdio (e.g., Claude Code configured to use this server)
- Responsibilities: List tools, accept tool call requests, dispatch to framework `run()`, return JSON response

**Programmatic API:**
- Location: Any `frameworks/<name>/index.ts`
- Triggers: Direct TypeScript import by external code
- Responsibilities: Accept typed input, run framework pipeline, return typed result

## Error Handling

**Strategy:** Exceptions propagate up; CLI catches at top level and exits with code 2 + error message. Framework internals throw on validation failure or missing API keys.

**Patterns:**
- `core/config.ts` `getAPIKey()` throws immediately if env var is missing
- `core/validators.ts` functions throw `Error` with descriptive messages on invalid LLM output
- `core/orchestrator.ts` `parseJSON<T>()` throws if no valid JSON is found in LLM response
- `cli.ts` wraps `runFramework()` in try/catch; prints error and exits with code 2; stack trace shown with `--verbose`
- `mcp-server/index.ts` catches errors per-tool and returns `isError: true` in MCP response

## Cross-Cutting Concerns

**Logging:** `console.log` directly in framework orchestrators for phase banners; `console.error` in CLI and MCP server for errors. No structured logging library.

**Validation:** `core/validators.ts` provides `validateQuote()`, `validateSubstantive()`, `validateRequired()`, `validateStructure()`, `validateNonEmpty()`, `validateRange()`. Frameworks call these on parsed LLM JSON.

**Authentication:** API keys read from environment variables (`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `OPENROUTER_API_KEY`) via `core/config.ts` `getAPIKey()`. First available provider is used as default.

**Cost tracking:** Each `LLMProvider` implements `calculateCost(usage, model)` with hardcoded per-token pricing. Costs accumulated in `AuditTrail` steps; total surfaced in `AuditLog.metadata.totalCost`.

**Model selection:** Role-based — heavyweight synthesis roles use larger/slower models (default: `claude-3-7-sonnet-20250219`); parallel diversity roles can use cheaper models. Per-role model strings live in each framework's `DEFAULT_CONFIG.models`.

---

*Architecture analysis: 2026-03-16*
