# Phase 3: Registry and Entry Point Cleanup - Context

**Gathered:** 2026-06-17
**Status:** Ready for planning

## Current State

Phase 1 (Core Hardening) and Phase 2 (Framework Standardization) are complete and verified. All 26 frameworks use `FrameworkRunner`, `@core/*` imports, and audit-trail cost tracking. The foundation is stable.

## Problem

Framework metadata is defined in **three separate places**, and the MCP server exposes only 20 of 26 frameworks:

1. **`cli.ts`** — `FRAMEWORKS` const (lines 43-544): 26 frameworks with full metadata (description, tier, category, purpose, agents, complexity, bestFor, exampleUseCases, typicalTime, output). Plus `FRAMEWORK_DIRS` (lines 551-577) mapping names to directories, and `AUTO_DETECT_PATTERNS` (lines 580-622) for file-based framework detection.

2. **`mcp-server/index.ts`** — `FRAMEWORKS` const (lines 13-356): **only 20 frameworks** with minimal metadata (description, inputSchema). Missing: hegelian, talmudic, regulatory-impact, war-gaming, writers-workshop, dissertation-committee (the 6 frameworks fixed in Phase 2 plan 02-02).

3. **Implicit in each framework's `types.ts`** — `DEFAULT_CONFIG` with model strings, parameters, etc.

Additionally, the MCP server has a **double-pass bug** at line 399: `framework.run(args, args)` passes the same object as both domain input and execution flags. Framework `run()` signatures treat the first param as domain input and the second as `RunFlags`. Passing `args` as input injects MCP tool parameters (verbose, rounds, etc.) into the domain input object, potentially confusing LLM prompts.

## Requirements

- **REG-01**: Create `core/registry.ts` as single source of truth for framework metadata and input schemas
- **REG-02**: Fix MCP server framework count from 20 to 26
- **REG-03**: Wire CLI and MCP server to read from registry instead of duplicate lookup tables
- **PROV-04**: Fix MCP server `run(args, args)` double-pass bug

## Key Files

- `cli.ts` — 1276 lines; `FRAMEWORKS` table (43-544), `FRAMEWORK_DIRS` (551-577), `AUTO_DETECT_PATTERNS` (580-622), `listFrameworks()` (889-943), `interactiveMode()` (944-1006), `recommendFramework()` (1148-1204), `showHelp()` (1206-1270), `runFramework()` (780-832)
- `mcp-server/index.ts` — 432 lines; `FRAMEWORKS` table (13-356), `CallToolRequestSchema` handler (382-421) with the `run(args, args)` bug at line 399
- `core/types.ts` — `RunFlags` interface (typed in Phase 1)
- `core/config.ts` — `DEFAULT_MODELS`, `BaseFrameworkConfig`

## Design Constraints

1. **Registry must be the only place to add a framework.** Adding a framework should require exactly one file change to appear in both CLI and MCP.
2. **Registry metadata must be rich enough for CLI.** The CLI's `--list`, `--interactive`, and `--which` commands use description, tier, category, purpose, agents, agentCount, complexity, bestFor, exampleUseCases, typicalTime, output. The registry must carry all of these.
3. **Registry must expose input schemas for MCP.** Each framework needs an `inputSchema` (JSON Schema) for the MCP tool definition.
4. **MCP must pass correct args.** The `run(args, args)` bug must become `run(input, flags)` where input is the domain object and flags is a properly constructed `RunFlags` object.
5. **No breaking changes to framework `run()` signatures.** The registry imports from existing framework `index.ts` files, not the other way around.
6. **CLI auto-detection patterns stay in CLI.** `AUTO_DETECT_PATTERNS` is a CLI UX feature, not framework metadata. It can reference the registry for validation but lives in `cli.ts`.

## Risks

- **CLI is 1276 lines with many functions depending on the inline `FRAMEWORKS` const.** Extracting to a registry means updating `listFrameworks`, `interactiveMode`, `recommendFramework`, `showHelp`, `runFramework`, and the auto-detection logic. All must continue to work.
- **MCP `inputSchema` definitions are currently hand-written in `mcp-server/index.ts`.** Moving them to the registry means each framework needs a schema. The 6 missing frameworks have no MCP schema yet — they need to be created.
- **`FrameworkName` type in cli.ts is derived from the `FRAMEWORKS` const via `keyof typeof`.** Moving to a registry means the type must come from the registry export.
