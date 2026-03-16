# Codebase Structure

**Analysis Date:** 2026-03-16

## Directory Layout

```
institutionalized/
├── cli.ts                        # Unified CLI entry point for all frameworks
├── package.json                  # Workspace root; bun workspaces for core, frameworks/*, mcp-server
├── tsconfig.json                 # Root TS config; path aliases @core/* and @frameworks/*
├── bun.lock                      # Lockfile
├── ARCHITECTURE.md               # Project architecture documentation (in-repo)
├── README.md                     # Project README
├── frameworks-catalog.md         # Human-readable catalog of all 26 frameworks
│
├── core/                         # Shared infrastructure used by every framework
│   ├── types.ts                  # LLMProvider, LLMResponse, LLMCallParams, Message interfaces
│   ├── orchestrator.ts           # executeParallel, executeSequential, executeIterative, FrameworkRunner, parseJSON, generateObject
│   ├── validators.ts             # validateQuote, validateSubstantive, validateRequired, etc.
│   ├── observability.ts          # AuditTrail class, AuditLog interface, formatCostReport
│   ├── config.ts                 # loadConfig, getAPIKey, validateModelConfig
│   ├── package.json              # Workspace package: name "@core"
│   └── providers/
│       ├── index.ts              # createProvider() factory, getProviderFromEnv() / getProvider()
│       ├── anthropic.ts          # AnthropicProvider class
│       ├── openai.ts             # OpenAIProvider class
│       └── openrouter.ts         # OpenRouterProvider class
│
├── frameworks/                   # 26 institutional decision frameworks (one directory each)
│   ├── courtroom/
│   │   ├── index.ts              # run() entry point; merges config; calls runCourtroom()
│   │   ├── orchestrator.ts       # runCourtroom() pipeline: prosecute→defend→deliberate→renderVerdict
│   │   ├── types.ts              # Case, Prosecution, Defense, JuryVerdict, Verdict, CourtroomResult, CourtroomConfig, DEFAULT_CONFIG
│   │   ├── prosecutor.ts         # prosecute() agent
│   │   ├── defense.ts            # defend() agent
│   │   ├── jury.ts               # deliberate() — parallel jury agents
│   │   ├── judge.ts              # renderVerdict() agent
│   │   ├── package.json          # Workspace package: name "courtroom"
│   │   └── README.md
│   ├── peer-review/              # Pattern identical to courtroom
│   │   ├── index.ts
│   │   ├── orchestrator.ts
│   │   ├── types.ts
│   │   ├── reviewer.ts
│   │   ├── author.ts
│   │   ├── editor.ts
│   │   └── package.json
│   ├── red-blue/                 # Same pattern
│   ├── pre-mortem/               # Same pattern
│   ├── studio/                   # Same pattern
│   ├── devils-advocate/
│   ├── aar/
│   ├── six-hats/
│   ├── phd-defense/
│   ├── architecture-review/
│   ├── grant-panel/
│   ├── intelligence-analysis/
│   ├── delphi/
│   ├── design-critique/
│   ├── consensus-circle/
│   ├── differential-diagnosis/
│   ├── socratic/
│   ├── swot/
│   ├── tumor-board/
│   ├── parliamentary/
│   ├── war-gaming/
│   ├── writers-workshop/
│   ├── regulatory-impact/
│   ├── hegelian/
│   ├── talmudic/
│   └── dissertation-committee/
│
├── mcp-server/
│   ├── index.ts                  # MCP server exposing all frameworks as tools via stdio transport
│   ├── package.json
│   ├── README.md
│   └── SETUP.md
│
├── test/
│   ├── core/
│   │   ├── orchestrator.test.ts  # Unit tests for executeParallel, executeSequential, parseJSON
│   │   └── validators.test.ts    # Unit tests for validator functions
│   └── frameworks/               # E2E tests for each framework (require live LLM API keys)
│       ├── courtroom.e2e.test.ts
│       ├── peer-review.e2e.test.ts
│       └── ... (one per framework)
│
├── test-suite/                   # Standalone test runner and benchmark cases
│   ├── run-tests.ts
│   ├── package.json
│   └── cases/                    # Input fixtures for test cases
│
├── benchmark/
│   └── run-benchmarks.ts         # Benchmarking harness
│
├── examples/                     # Sample input files and worked examples
│   ├── courtroom/                # e.g., merge-pr.json, should-publish-essay.json
│   ├── peer-review/
│   ├── pre-mortem/
│   ├── red-blue/
│   └── studio/
│
├── scripts/
│   └── install-codex-skill.sh    # Installer for Claude Code skill
│
├── skills/
│   └── institutional-lite/
│       ├── SKILL.md              # Claude Code skill definition
│       └── references/
│           └── framework-templates.md
│
├── website/
│   └── index.html                # Static project website
│
└── .planning/
    └── codebase/                 # GSD codebase analysis documents (this directory)
```

## Directory Purposes

**`core/`:**
- Purpose: Shared infrastructure; the only code imported across framework boundaries
- Contains: LLM provider abstraction, agent orchestration primitives, validation helpers, observability, config utilities
- Key files: `core/orchestrator.ts`, `core/types.ts`, `core/providers/index.ts`

**`frameworks/<name>/`:**
- Purpose: Each directory is a self-contained institutional reasoning framework
- Contains: `index.ts` (public API), `orchestrator.ts` (pipeline), `types.ts` (domain types + DEFAULT_CONFIG), one `.ts` file per agent role
- Key files: `index.ts` is the only file the CLI and MCP server call directly

**`mcp-server/`:**
- Purpose: Model Context Protocol server that exposes all frameworks as AI assistant tools
- Contains: Single `index.ts` server; tool schemas defined inline; dispatches to framework `run()` via dynamic import

**`test/`:**
- Purpose: Automated tests; `core/` for pure unit tests, `frameworks/` for integration/e2e tests requiring API keys
- Key files: `test/core/orchestrator.test.ts`, `test/frameworks/courtroom.e2e.test.ts`

**`examples/`:**
- Purpose: Sample JSON/text input files showing how to invoke each framework from the CLI
- Not imported by production code; used for manual testing and documentation

**`skills/`:**
- Purpose: Claude Code "Codex skill" enabling AI assistants to run frameworks conversationally without the CLI
- Contains: `SKILL.md` skill definition, reference templates

## Key File Locations

**Entry Points:**
- `cli.ts`: CLI dispatcher — start here to trace execution
- `mcp-server/index.ts`: MCP server entry point
- `frameworks/<name>/index.ts`: Programmatic API for each framework

**Configuration:**
- `tsconfig.json`: TypeScript config; defines `@core/*` → `./core/*` and `@frameworks/*` → `./frameworks/*` path aliases
- `package.json`: Bun workspace config listing `frameworks/*`, `core`, and `mcp-server`
- `core/config.ts`: Runtime config helpers and API key loader

**Core Logic:**
- `core/orchestrator.ts`: `executeParallel`, `executeSequential`, `executeIterative`, `FrameworkRunner`, `parseJSON`, `generateObject`
- `core/types.ts`: `LLMProvider`, `LLMResponse`, `LLMCallParams`, `Message` — foundation interfaces
- `core/providers/index.ts`: `createProvider()` factory and `getProvider()` / `getProviderFromEnv()` convenience functions

**Testing:**
- `test/core/orchestrator.test.ts`: Core orchestration unit tests
- `test/core/validators.test.ts`: Validator unit tests
- `test/frameworks/*.e2e.test.ts`: Framework-level e2e tests (require API keys, 60-120s timeouts)

## Naming Conventions

**Files:**
- kebab-case for all source files: `orchestrator.ts`, `peer-review/`, `run-benchmarks.ts`
- Role agent files named after the role they model: `prosecutor.ts`, `defense.ts`, `judge.ts`, `reviewer.ts`, `editor.ts`
- Entry points always named `index.ts`
- Test files: `<module>.test.ts` for unit tests, `<framework>.e2e.test.ts` for e2e tests

**Directories:**
- kebab-case for framework directories matching CLI framework name exactly: `red-blue/`, `phd-defense/`, `six-hats/`
- Core directory is simply `core/`

**TypeScript:**
- Interfaces use PascalCase: `LLMProvider`, `CourtroomResult`, `AuditLog`
- Types (unions, aliases) use PascalCase: `Vote`, `Decision`
- Functions use camelCase: `executeParallel`, `runCourtroom`, `validateQuote`
- Classes use PascalCase: `AnthropicProvider`, `AuditTrail`, `FrameworkRunner`
- Constants use SCREAMING_SNAKE_CASE: `DEFAULT_CONFIG`

## Where to Add New Code

**New Framework:**
1. Create `frameworks/<framework-name>/` directory
2. Add `package.json` with workspace package name
3. Define domain types and `DEFAULT_CONFIG` in `types.ts`
4. Create one `.ts` file per agent role
5. Create `orchestrator.ts` with the pipeline function `run<FrameworkName>(input, config, provider)`
6. Create `index.ts` exporting `run(input, flags)` — this is the contract the CLI and MCP server call
7. Add `README.md`
8. Register the framework name + description in `cli.ts` `FRAMEWORKS` object and `mcp-server/index.ts` `FRAMEWORKS` object with its input schema
9. Add `frameworks/<framework-name>.e2e.test.ts` in `test/frameworks/`

**New Core Utility:**
- Add to the appropriate `core/` file: orchestration primitives → `core/orchestrator.ts`, validators → `core/validators.ts`, observability → `core/observability.ts`
- Import via `@core/<filename>` path alias in frameworks

**New LLM Provider:**
- Add `core/providers/<provider-name>.ts` implementing `LLMProvider` interface from `core/types.ts`
- Export from `core/providers/index.ts` and add case to `createProvider()` factory
- Add env var detection in `getProviderFromEnv()`

**New Example Input:**
- Add to `examples/<framework-name>/` as a `.json` or `.md` file
- Document usage in the framework's `README.md`

## Special Directories

**`node_modules/` (root and per-framework):**
- Purpose: Bun workspace dependencies; each framework has its own `node_modules/` for workspace isolation
- Generated: Yes
- Committed: No

**`.planning/codebase/`:**
- Purpose: GSD codebase analysis documents written by mapping agents
- Generated: Yes (by AI agents)
- Committed: Yes

**`.github/`:**
- Purpose: GitHub Actions CI workflows and issue templates
- Generated: No
- Committed: Yes

---

*Structure analysis: 2026-03-16*
