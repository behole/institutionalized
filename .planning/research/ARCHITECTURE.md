# Architecture Patterns

**Domain:** Multi-agent LLM reasoning library (hardening + npm publish + Claude Code skill)
**Researched:** 2026-03-16
**Confidence:** HIGH (based on direct codebase inspection + Node.js official docs)

---

## Recommended Architecture

This project is already structurally sound. The milestone work is hardening and extending the existing
architecture — not replacing it. The architecture analysis below describes what the system should look
like after the milestone, annotated with current gaps that need to close.

### Component Map

```
┌─────────────────────────────────────────────────────────────┐
│  Entry Points                                               │
│                                                             │
│  ┌──────────┐  ┌────────────┐  ┌──────────────────────────┐│
│  │  cli.ts  │  │ mcp-server │  │  Claude Code Skill       ││
│  │          │  │ /index.ts  │  │  skills/institutionalized ││
│  └────┬─────┘  └─────┬──────┘  └──────────────┬───────────┘│
└───────┼──────────────┼────────────────────────┼────────────┘
        │              │                         │
        ▼              ▼                         ▼
┌─────────────────────────────────────────────────────────────┐
│  Framework Layer  (frameworks/<name>/index.ts)              │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  run(input, flags): Promise<TResult>                 │  │
│  │  — the single public contract all consumers depend on │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │orchestrator│  │ agent files  │  │   types.ts       │   │
│  │  .ts       │  │ (role per    │  │   DEFAULT_CONFIG │   │
│  │            │  │  file)       │  │                  │   │
│  └────────────┘  └──────────────┘  └──────────────────┘   │
└───────────────────────────────┬─────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│  Core Layer  (core/)                                        │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │  providers/  │  │orchestrator.ts│  │  observability   │  │
│  │  (Strategy)  │  │ primitives   │  │  AuditTrail      │  │
│  │  LLMProvider │  │ executeParallel│ │  AuditLog        │  │
│  │  interface   │  │ executeSeq   │  │  formatCostReport│  │
│  │              │  │ executeIter  │  │                  │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ validators.ts│  │  config.ts   │  │  types.ts        │  │
│  │              │  │ getAPIKey()  │  │  LLMProvider     │  │
│  │              │  │ loadConfig() │  │  LLMCallParams   │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│  External SDKs                                              │
│  @anthropic-ai/sdk    openai    (OpenRouter: raw fetch)     │
└─────────────────────────────────────────────────────────────┘
```

---

## Component Boundaries

### Core Layer (`core/`)

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| `types.ts` | Shared interfaces: `LLMProvider`, `LLMCallParams`, `LLMResponse`, `Message` | All consumers |
| `providers/` | Normalize Anthropic / OpenAI / OpenRouter behind `LLMProvider` interface. Factory `createProvider()`, env-detect `getProviderFromEnv()` | Frameworks (via constructor injection), CLI (via `getProviderFromEnv`) |
| `orchestrator.ts` | Primitives: `executeParallel`, `executeSequential`, `executeIterative`. Stateful context object `FrameworkRunner` that tracks audit trail per run. `parseJSON<T>()`, `generateObject<T>()` helpers | Frameworks that opt in to `FrameworkRunner` |
| `observability.ts` | `AuditTrail` (append-only, in-memory during run) → `AuditLog` (finalized). Cost + token accumulation. `formatCostReport()` | Frameworks (via `FrameworkRunner` or direct); CLI for output |
| `validators.ts` | Validate LLM output shapes: quote grounding, word count, required fields, range checks | Framework orchestrators after JSON parsing |
| `config.ts` | `getAPIKey()` (throws on missing env var), `loadConfig<T>()` (merge defaults with overrides), `validateModelConfig()` | Framework `index.ts` during startup |

**Boundary rules:**
- Core never imports from frameworks
- Core never imports from CLI or MCP server
- Frameworks import from core only via `@core/*` path alias — never by relative `../../../core/` paths
- Providers are injected (not instantiated inside orchestrators)

---

### Framework Layer (`frameworks/<name>/`)

Each framework is a self-contained plugin. The contract is one public function.

| File | Responsibility | Boundary |
|------|---------------|----------|
| `index.ts` | Public entry point. Resolves config (defaults + flags), creates `LLMProvider`, calls orchestrator. Re-exports types for programmatic consumers. | The only file CLI/MCP server ever imports |
| `orchestrator.ts` | Pipeline logic: which agents run, in what order, with what inputs. Calls core primitives. | Private — framework internal |
| `types.ts` | Domain types for input, per-agent outputs, final result, `DEFAULT_CONFIG`. | Exported via `index.ts` |
| `<role>.ts` | Single agent file per institutional role (prosecutor, judge, etc.). Receives typed context, calls provider, returns typed JSON. | Private — called only by orchestrator |

**Boundary rules:**
- Framework internal files never import each other circularly (roles are leaf nodes; orchestrator imports roles)
- The `run()` function signature must satisfy: `(input: TInput | { content: string }, flags: Record<string, any>) => Promise<TResult>` — this is the CLI/MCP contract
- Frameworks never import from CLI or MCP server
- Frameworks never directly import `@anthropic-ai/sdk` — always go through `@core/providers`

**Current gap:** Some frameworks call `@anthropic-ai/sdk` or providers directly rather than using core primitives. Inconsistency in `FrameworkRunner` adoption (some use it; others call provider directly and manually accumulate costs).

---

### CLI (`cli.ts`)

| Responsibility | Details |
|---------------|---------|
| Argument parsing | Framework name, input file path, `--verbose`, `--output`, `--config`, etc. |
| Input loading | JSON parse if `.json`; wrap as `{ content: string }` otherwise |
| Dynamic dispatch | `await import('./frameworks/<name>/index.ts')` — no static registry beyond the lookup table |
| Exit code mapping | `verdict.decision` → 0 (positive), 1 (negative), 2 (error), 3 (indeterminate) |
| Error boundary | Single top-level `try/catch`; prints message, shows stack with `--verbose` |

**Current gap:** The `FRAMEWORKS` lookup table in CLI and in MCP server are duplicated and diverged (CLI has 26; MCP has 20). A single source of truth (e.g., `core/registry.ts`) would eliminate this.

---

### MCP Server (`mcp-server/index.ts`)

| Responsibility | Details |
|---------------|---------|
| Tool registration | `ListToolsRequestSchema` handler returns all framework tool definitions with JSON schemas |
| Tool dispatch | `CallToolRequestSchema` handler dynamically imports framework, calls `run(args, args)` |
| Error isolation | Per-tool `try/catch`; returns `isError: true` in MCP response — does not crash server |
| Transport | `StdioServerTransport` — stdio-based MCP protocol |

**Current gap:** Input schema definitions live in `mcp-server/index.ts` rather than alongside the framework types where they belong. For 26 frameworks, this is ~200 lines of duplicated schema that drifts from framework types.

---

### Claude Code Skill (`skills/institutionalized/`)

The planned `/institutionalized` skill differs architecturally from the existing `institutional-lite` skill:

| Dimension | `institutional-lite` (existing) | `/institutionalized` (planned) |
|-----------|----------------------------------|-------------------------------|
| Implementation | Single-call: Claude simulates the framework inline, no process spawn | Full multi-agent: calls the library's `run()` via subprocess or Node API |
| API key | Uses Claude Code's own model (no external key) | Default: Claude Code's own model; optional: external API key for model control |
| Output | JSON returned inline in chat | Key findings streamed inline; full report written to file |
| Framework routing | Static selection by user | Guided: skill asks about decision type, recommends framework |
| Audit trail | None | Full `AuditLog` from library saved with report |

**Skill integration model — how it works:**

Claude Code skills are SKILL.md files. A skill is a set of instructions given to Claude Code as context when the `/skill-name` command is invoked. The skill instructions can tell Claude Code to:
1. Ask the user clarifying questions
2. Run bash commands (including spawning `bun cli.ts <framework> <input.json>`)
3. Read files the CLI produces (e.g., the `--output results.json`)
4. Summarize and stream findings back to the user

**Consequence for skill architecture:** The skill does NOT call the library as a TypeScript API. It orchestrates the library by invoking the CLI as a subprocess, reading output files, and formatting the result for the user. This means the CLI's `--output` flag is the integration point — the skill tells Claude Code to run the CLI and then read the JSON output.

**Provider model for "default to Claude Code's model":** When the skill invokes the CLI, it needs an LLM provider. To avoid requiring an API key, the skill can pass `ANTHROPIC_API_KEY` from Claude Code's own environment (Claude Code has `ANTHROPIC_API_KEY` set when it runs tools). The skill instructions explicitly tell Claude Code to pass the env var through. This is the zero-friction path. Power users who want a different model pass `--config` with a custom model string.

---

### npm Package (`package.json` exports map — does not exist yet)

The current `package.json` has no `exports` field, no build step, no `dist/`, and no type declarations output. Publishing to npm requires:

| Component | What's Needed | Current State |
|-----------|--------------|---------------|
| `exports` map | Defines importable entry points and conditions | Missing entirely |
| TypeScript declarations | `*.d.ts` files so consumers get types | Not generated (no `tsc --emitDeclarationOnly`) |
| Built JS | `dist/*.js` for consumers who don't use Bun | Not built (Bun runs TS directly; npm consumers can't) |
| `main` + `types` fields | Fallback for older toolchains | Missing |
| `files` field | Restricts what goes into the tarball | Missing (everything would publish) |

**Recommended `exports` shape (after build step added):**

```json
{
  "name": "institutional-reasoning",
  "version": "1.0.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    },
    "./frameworks/*": {
      "types": "./dist/frameworks/*/index.d.ts",
      "import": "./dist/frameworks/*/index.js"
    }
  },
  "files": ["dist", "README.md", "LICENSE"]
}
```

The `"types"` condition MUST appear first in the condition order (authoritative: Node.js docs).

**Build tool decision:** Bun's bundler can emit declarations (`bun build --target=node --declaration`). Alternatively, `tsc --emitDeclarationOnly` + `bun build` for JS. Either approach works; the tsconfig already has `noEmit: true` which must flip to `declaration: true` + `declarationDir` for a publish build.

---

## Data Flow

### CLI Invocation

```
User → cli.ts
  → parseFlags()
  → loadInput(file)                    // reads .json or wraps text
  → import('./frameworks/<name>/index.ts')  // dynamic; no registry
  → module.run(input, flags)
      → framework/index.ts
          → loadConfig(DEFAULT_CONFIG, flags.config)
          → getProviderFromEnv(flags.provider)  // core/providers
          → runOrchestrator(input, config, provider)
              → sequential/parallel agent calls
                  → provider.call(params)  // LLM API
                  → parseJSON<T>(response.content)  // core/orchestrator
                  → validateXxx(parsed)  // core/validators
              → AuditTrail.recordStep(...)  // per call
              → AuditTrail.finalize(result)
          → return TResult (includes auditLog)
  → Bun.write(flags.output, JSON)     // optional
  → process.exit(exitCode)
```

### MCP Tool Invocation

```
MCP client → mcp-server/index.ts
  → CallToolRequestSchema handler
  → import('../frameworks/<name>/index.ts')  // dynamic
  → framework.run(args, args)               // args as both input and flags
  → JSON.stringify(result)
  → MCP text content response
```

Note: The MCP server passes `args` as both `input` and `flags`. This works because framework
`index.ts` files guard against unknown flags. It is an existing wart, not a new design.

### Skill Invocation (planned)

```
User → /institutionalized in Claude Code
  → SKILL.md instructions active
  → Claude asks: "What kind of decision are you facing?"
  → User describes decision
  → Claude selects framework (e.g., "pre-mortem for risk enumeration")
  → Claude runs: bun cli.ts <framework> <input-file> --output /tmp/report.json
      (using ANTHROPIC_API_KEY from Claude Code's environment)
  → CLI produces /tmp/report.json
  → Claude reads file
  → Claude streams key findings inline to user
  → Claude writes final report to <project>/institutionalized-report-<timestamp>.json
  → Claude summarizes: "Full report saved to ..."
```

### Agent Orchestration (inside a framework)

Three patterns, composed as needed:

| Pattern | Function | Used By |
|---------|----------|---------|
| Sequential pipeline | `executeSequential<T>()` | Courtroom (prosecute → defend → deliberate → judge) |
| Parallel fan-out | `executeParallel<T>()` + `Promise.all` | Jury deliberation, multiple reviewers |
| Iterative refinement | `executeIterative<T>()` | Delphi (multi-round expert consensus), Socratic (probing loop) |

---

## Key Abstractions

### `LLMProvider` Interface (Strategy Pattern)

```typescript
interface LLMProvider {
  name: string;
  call(params: LLMCallParams): Promise<LLMResponse>;
  calculateCost(usage: { inputTokens: number; outputTokens: number }, model: string): number;
}
```

Frameworks receive a provider instance; they never import an SDK directly. This is the primary
extension point for adding providers (Gemini, local, etc.) without touching framework code.

### Framework `run()` Contract

```typescript
export async function run(
  input: TInput | { content: string },
  flags: Record<string, any>
): Promise<TResult>
```

This is the CLI/MCP seam. Everything downstream of this signature is a framework's private concern.
The `{ content: string }` fallback exists so users can pass plain text files without pre-structuring
JSON. Every framework must handle this fallback.

**Current gap:** `flags: Record<string, any>` is too loose. Production-grade: each framework should
define its own `FlagsSchema` and validate at the entry point boundary rather than letting unknown
flags silently pass through to the orchestrator.

### `FrameworkRunner` (Stateful Context Object)

Bundles provider + audit trail into a single context object passed through a framework run. Simplifies
agent code (no need to manually track costs) but is not universally adopted — some older frameworks
bypass it.

**Current gap:** Inconsistent adoption is the root cause of "some frameworks have detailed audit logs,
others have none." The hardening milestone should enforce `FrameworkRunner` adoption across all 26.

### `AuditLog` / `AuditTrail` (Append-only run log)

`AuditTrail` is a mutable in-memory accumulator during a run. `AuditLog` is the immutable snapshot
finalized at the end. The distinction matters for error handling: a partially-completed run can still
produce an `AuditLog` with whatever steps completed.

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Direct SDK Imports in Framework Code

**What:** `import Anthropic from "@anthropic-ai/sdk"` inside a framework agent file
**Why bad:** Locks the framework to one provider. Breaks if that provider is unavailable. Bypasses cost tracking.
**Instead:** Accept `LLMProvider` as a constructor parameter or function argument

### Anti-Pattern 2: Duplicate Framework Registries

**What:** Both `cli.ts` and `mcp-server/index.ts` maintain their own `FRAMEWORKS` lookup tables
**Why bad:** They are already out of sync (CLI: 26 frameworks; MCP: 20 frameworks). Adding a new framework requires touching 2+ files.
**Instead:** Extract to `core/registry.ts` — a single source of truth mapping framework names to metadata and input schemas

### Anti-Pattern 3: Throw-Only Error Handling

**What:** `getAPIKey()` throws immediately on missing key; no retry, no fallback, no structured error type
**Why bad:** CLI consumers get raw Error messages. MCP consumers get `isError: true` with a raw string. No way to programmatically distinguish "missing API key" from "LLM rate limit" from "malformed response".
**Instead:** Define a typed error hierarchy: `InstitutionalError` (base) → `ProviderError`, `ValidationError`, `FrameworkError`. CLI and MCP server can format each type appropriately.

### Anti-Pattern 4: `flags: Record<string, any>` at Framework Boundaries

**What:** Every framework accepts arbitrary flags with no validation
**Why bad:** Typos in flags silently do nothing. Type safety ends at the CLI seam.
**Instead:** Each framework defines and validates its own flags schema at the `index.ts` entry point. Unknown flags should warn; invalid values should throw `ValidationError`.

### Anti-Pattern 5: `package.json` `main` without `exports`

**What:** Publishing to npm without an `exports` map
**Why bad:** Consumers can deep-import `require('institutional-reasoning/core/providers/anthropic')` — bypassing the public API. Any internal refactor becomes a breaking change.
**Instead:** Explicit `exports` map — only `.` and `./frameworks/*` are public. Core internals are not exported.

### Anti-Pattern 6: Skill as Pure Prompt vs Skill as CLI Orchestrator

**What:** Building the `/institutionalized` skill to inline all framework logic as prompts (like `institutional-lite` does)
**Why bad:** Defeats the entire point of the library. Single-call simulation does not produce multi-agent reasoning with separation of concerns.
**Instead:** Skill orchestrates the real CLI binary. The library does the reasoning; the skill handles user interaction and output formatting.

---

## Build Order for Milestone Phases

Based on component dependencies, this is the correct build order:

### Phase 1: Core Hardening (foundation — everything else depends on it)

Work: TypeScript strict mode everywhere, typed error hierarchy, FrameworkRunner adoption, validators coverage.

Dependency rationale: All 26 frameworks import from core. If core types are unstable (e.g., `any` types), fixing them later causes cascading changes. Fix core first so framework cleanup happens once.

Components touched: `core/types.ts`, `core/orchestrator.ts`, `core/config.ts`, `core/validators.ts`, `core/observability.ts`

### Phase 2: Framework Standardization (depends on Phase 1)

Work: All 26 frameworks use `FrameworkRunner`, validate flags at entry, handle `{ content: string }` fallback consistently, no direct SDK imports.

Dependency rationale: Standardization requires the typed error hierarchy and `FrameworkRunner` improvements from Phase 1. Doing this in parallel with Phase 1 means rework.

Components touched: All `frameworks/<name>/index.ts` and `orchestrator.ts` files

### Phase 3: Registry + Entry Point Cleanup (depends on Phase 2)

Work: `core/registry.ts` as single source of truth. CLI and MCP server read from registry. MCP input schemas derived from or colocated with framework types.

Dependency rationale: Registry design requires knowing what 26 frameworks look like after standardization. Building it before Phase 2 means rebuilding it after.

Components touched: `core/registry.ts` (new), `cli.ts`, `mcp-server/index.ts`

### Phase 4: npm Package + Build Pipeline (depends on Phase 3)

Work: Build script (`bun build` or `tsc`), `exports` map in `package.json`, type declarations, `files` whitelist, README, versioning.

Dependency rationale: Package structure stabilizes only after frameworks are standardized and registry exists. Packaging half-standardized code means the first published version has known quality issues.

Components touched: `package.json`, `tsconfig.json`, new `build.ts` or `build.sh`

### Phase 5: Claude Code Skill (depends on Phase 4, optionally Phase 3)

Work: `skills/institutionalized/SKILL.md` with guided framework selection, CLI subprocess invocation, inline streaming findings, report file output.

Dependency rationale: Skill relies on the CLI's `--output` flag working reliably for all frameworks (Phase 2) and the CLI being the canonical interface (Phase 3). Can be done in parallel with Phase 4 if CLI is stable.

Components touched: `skills/institutionalized/SKILL.md` (new), `skills/institutionalized/references/` (framework selection guide, output templates)

### Phase 6: Tests (threads through all phases, explicit gate at end)

Work: Unit tests for core typed errors, FrameworkRunner paths, validators edge cases. Integration tests per framework (not E2E/real API — use mock provider). E2E tests for CLI exit codes.

Dependency rationale: Tests cannot be written meaningfully until the component being tested is stable. Deferring all tests to Phase 6 is a risk; prefer writing tests alongside each phase but the explicit hardening pass happens at the end.

---

## Scalability Considerations

This library is stateless and single-process-per-invocation. Scalability concerns are LLM throughput, not infrastructure.

| Concern | At 10 runs/day | At 1000 runs/day | At 10K runs/day |
|---------|---------------|-----------------|----------------|
| LLM API rate limits | Not a concern | Monitor per-framework cost, pick cheaper models for parallelizable roles | Rate limiting needed; abstract retry/backoff into provider layer |
| Cost per run | Track via AuditLog | Expose cost estimate before running | Add `--dry-run` cost estimate mode |
| Cold start | Import time negligible | Dynamic imports add ~10-20ms overhead | Preload registry; lazy-load framework code only |
| Error rate | Handle at CLI/MCP level | Structured errors → observability hooks | Error telemetry export (OpenTelemetry) |

---

## Sources

- Direct codebase inspection: `core/`, `frameworks/courtroom/`, `cli.ts`, `mcp-server/index.ts`, `skills/institutional-lite/SKILL.md` — HIGH confidence
- Node.js official documentation for `package.json` exports field (https://nodejs.org/api/packages.html#exports) — HIGH confidence
- Claude Code SKILL.md format: inferred from existing `skills/institutional-lite/SKILL.md` in the repository — MEDIUM confidence (official docs blocked during research; inference from working example)
- npm TypeScript library patterns: established community practice for `"types"` condition ordering — MEDIUM confidence (Node.js docs confirm condition ordering rule; TypeScript-specific conventions from training data, no fresh external verification)
