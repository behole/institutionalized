# Project Research Summary

**Project:** institutionalized — multi-agent LLM reasoning library (npm package + Claude Code skill)
**Domain:** TypeScript library publishing, LLM reasoning frameworks, Claude Code skill authoring
**Researched:** 2026-03-16
**Confidence:** HIGH (primary source: direct codebase analysis; MEDIUM for external ecosystem claims due to web search unavailability)

## Executive Summary

The institutionalized library is a production-quality multi-agent reasoning engine that works correctly at dev time under Bun, but is not yet publishable to npm. The core architecture is sound — 26 frameworks each expose a `run(input, flags)` contract, backed by a clean provider abstraction (`LLMProvider`), audit trail infrastructure, and composable orchestration primitives (`executeParallel`, `executeSequential`, `executeIterative`). The milestone requires hardening this existing architecture across four dimensions: TypeScript correctness, framework standardization, build pipeline for npm, and a new Claude Code skill.

The recommended approach is to work inside-out: fix the core layer first (typed errors, strict TypeScript, FrameworkRunner adoption), standardize all 26 frameworks against that cleaned core, then build the npm package and skill on top of a stable foundation. The publish path requires adding `tsup` as a build tool, a proper `exports` map, and running `publint` + `attw` before any `npm publish`. The Claude Code skill should orchestrate the real CLI via subprocess (using `ANTHROPIC_API_KEY` from Claude Code's own environment), not inline all logic as a prompt — this preserves the multi-agent nature of the library.

The key risks are: (1) publishing with broken exports or placeholder `$0.00` cost data before the 7 affected frameworks are fixed — both are credibility-destroying on launch; (2) refactoring courtroom without first capturing output fixtures, given it is the most tech-debt-laden framework and most-referenced in all downstream consumers; and (3) upgrading `@anthropic-ai/sdk` before fixing the system message bug in `core/providers/anthropic.ts`, which currently sends system prompts as user-turn messages to all 26 frameworks. Address these three in Phase 1 before any framework is considered "done."

## Key Findings

### Recommended Stack

The project runs on Bun and should continue to do so for the development toolchain. The npm publish gap is solved by adding `tsup` (esbuild-based, produces dual CJS+ESM with `.d.ts` in one config), `publint` for exports map validation, and `@arethetypeswrong/cli` for TypeScript resolution verification. `TypeScript ^5.7.x` must be added as an explicit `devDependency` — currently the typecheck script relies on Bun's bundled tsc, making the CI check unreliable. The `@anthropic-ai/sdk` must be upgraded from 0.32.1 to `^0.50.0` (after fixing the system message bug); `bun-types` should be removed as it is redundant with `@types/bun` since Bun 1.x.

The package should publish as a single `institutionalized` package (Option A) rather than 26 scoped sub-packages — these frameworks run server-side against LLM APIs, so bundle-size arguments for splitting don't apply, and versioning 26+ packages independently adds overhead without user benefit.

**Core technologies:**
- Bun 1.x: runtime, test runner, package manager — project constraint, fast, zero-config TypeScript execution
- TypeScript ^5.7.x: explicit devDependency for predictable tsc in CI and IDEs
- tsup ^8.x: npm build pipeline — single config, dual CJS+ESM, `.d.ts` output, Bun-compatible
- publint ^0.3.x: pre-publish exports map validation — catches broken package before consumers see it
- @arethetypeswrong/cli ^0.17.x: TypeScript resolution mode validation — verifies CJS and ESM types both resolve
- @anthropic-ai/sdk ^0.50.0: upgrade from 0.32.1 to access current models and correct system prompt API
- openai ^4.x: wire to the actual SDK in `core/providers/openai.ts` — currently declared but unused (raw fetch instead)
- np: interactive semver release automation — simpler than semantic-release for a single-package library

### Expected Features

Research from codebase analysis reveals significant gaps between current state and publishable state. Six features are blocking npm publication; three more are blocking skill launch.

**Must have (blocking npm publication):**
- Proper `exports` map pointing to compiled artifacts — currently missing; consumers get `ERR_PACKAGE_PATH_NOT_EXPORTED`
- TypeScript declarations (`.d.ts`) — no build step exists; `types` field absent from package.json
- TypeScript as explicit devDependency + working typecheck — CI may be silently passing with broken types
- Accurate cost tracking for all 26 frameworks — 7 frameworks hardcode `$0.00`; breaks the core audit trail value proposition
- Courtroom provider bypass fix — courtroom hardwires Anthropic SDK directly, bypassing `LLMProvider`, breaking provider selection and cost tracking
- Package.json metadata completeness — `author` and `repository.url` are empty strings

**Must have (skill launch):**
- Guided framework selection with explicit decision-tree questions for 26 frameworks
- Default-to-Claude-Code-model behavior using `ANTHROPIC_API_KEY` from Claude Code's environment
- Inline key findings + report-to-file output pattern in skill

**Should have (competitive differentiators):**
- Typed `RunFlags` interface replacing `Record<string, any>` across all 26 `run()` signatures
- Typed error hierarchy (`InstitutionalError` → `ProviderError`, `ValidationError`, `FrameworkError`)
- Centralized model constants in `core/config.ts` (vs. 26 hardcoded model strings that break at deprecation)
- Concurrency cap on `executeParallel()` — prevents 429 burst errors on multi-agent frameworks
- Retry with exponential backoff in OpenAI/OpenRouter providers (Anthropic SDK has built-in retry already)

**Defer to next milestone:**
- Per-agent streaming output — requires async generator refactor of all 26 frameworks; 3x scope
- Budget cap / cost guard — needs accurate cost data first (Phase 1), then can be added as Phase 2+ feature
- Dry-run mode — documented but unimplemented; leave until post-launch
- Scoped per-framework npm packages (`@institutionalized/courtroom`) — Option B; premature until adoption demands it

### Architecture Approach

The architecture is already correct in its layering — Core → Framework → CLI/MCP/Skill — with clean dependency direction (core never imports frameworks, frameworks never import CLI). The milestone work is closing gaps in adoption consistency, not redesigning. Three structural gaps need closing before publish: (1) `FrameworkRunner` is not adopted by all 26 frameworks, causing inconsistent audit trails; (2) framework registries are duplicated and diverged between `cli.ts` (26 frameworks) and `mcp-server/index.ts` (20 frameworks) — a `core/registry.ts` source of truth resolves this; (3) MCP input schema definitions live in `mcp-server/index.ts` instead of alongside framework types, causing drift.

**Major components:**
1. Core Layer (`core/`) — shared types, LLMProvider interface, orchestration primitives, AuditTrail, config, validators
2. Framework Layer (`frameworks/<name>/`) — 26 self-contained plugins, each with a `run(input, flags)` public contract, private orchestrator/agent files, and domain types
3. Entry Points — `cli.ts` (argument parsing, dynamic dispatch, exit code mapping), `mcp-server/index.ts` (tool registration/dispatch via MCP stdio protocol), `skills/institutionalized/` (SKILL.md that orchestrates CLI via subprocess)
4. Build/Publish Layer — tsup build producing `dist/`, exports map, type declarations, `files` whitelist (does not exist yet)
5. Registry (`core/registry.ts`) — single source of truth for framework metadata and input schemas (does not exist yet; needed to de-duplicate CLI/MCP lookup tables)

### Critical Pitfalls

1. **Publishing without exports map or compiled artifacts** — every npm consumer running Node.js gets `ERR_PACKAGE_PATH_NOT_EXPORTED` or raw TypeScript source; prevent by running `npm pack --dry-run` and installing the tarball in a fresh Node project before publishing
2. **Upgrading `@anthropic-ai/sdk` before fixing the system message bug** — `anthropic.ts` currently sends system prompts as user-turn messages; an SDK upgrade shifts behavior for all 26 frameworks simultaneously; fix the `system` parameter mapping first, then upgrade
3. **Refactoring courtroom without output fixtures** — courtroom bypasses the provider abstraction and has the most tech debt; capture `CourtroomResult` fixture before touching any agent file; fix the MCP `run(args, args)` bug as an isolated commit first
4. **Publishing with `$0.00` cost data in 7 frameworks** — `courtroom`, `writers-workshop`, `hegelian`, `regulatory-impact`, `war-gaming`, `talmudic`, `dissertation-committee` hardcode zero cost; this is a credibility-destroying bug for a library that markets audit trails as a core feature
5. **Skill routing degradation with 26 options** — a vague "pick a framework" prompt will produce random-feeling recommendations; write explicit decision-tree questions grouped into 4-5 decision archetypes, not just a list of 26 names; test against 10 real scenarios before publishing the skill

## Implications for Roadmap

Based on combined research, the correct phase structure is determined by component dependencies. Core must stabilize before frameworks are touched; frameworks must standardize before the registry is extracted; the registry must exist before the package is built; the skill can proceed in parallel with packaging once the CLI is stable.

### Phase 1: Core Hardening

**Rationale:** All 26 frameworks import from core. Unstable core types (especially `any` in `flags`, missing typed errors) cause cascading rework if fixed later. The Anthropic system message bug and cost tracking architecture must be correct before any framework is considered fixed. This is the riskiest phase because it has the highest blast radius — do it first with tight test coverage.
**Delivers:** TypeScript strict mode passing, typed error hierarchy, `FrameworkRunner` adoption contract finalized, Anthropic provider system message fix, `@anthropic-ai/sdk` upgraded to ^0.50.0, `typescript` as explicit devDependency
**Addresses:** Table-stakes TypeScript correctness (FEATURES.md), Anthropic system message bug (PITFALLS.md #6), broken typecheck CI (PITFALLS.md #2)
**Avoids:** Pitfall #2 (broken typecheck), Pitfall #6 (system message bug), Pitfall #7 (hardcoded model IDs — add `DEFAULT_MODELS` constants to `core/config.ts`)

### Phase 2: Framework Standardization

**Rationale:** With a clean core, standardizing all 26 frameworks becomes mechanical and safe. Every framework adopts `FrameworkRunner`, validates flags at entry, handles `{ content: string }` fallback, and uses `@core/*` import paths only. Courtroom — the most complex — gets refactored here with the safety of output fixtures captured first.
**Delivers:** All 26 frameworks using `FrameworkRunner`, accurate cost tracking for all 7 previously-broken frameworks, courtroom wired through `LLMProvider` (no direct SDK imports), `RunFlags` typed interface replacing `Record<string, any>`, import aliases standardized
**Addresses:** Accurate cost tracking (FEATURES.md table stakes), provider abstraction completeness (FEATURES.md), `flags: Record<string, any>` (ARCHITECTURE.md anti-pattern #4)
**Avoids:** Pitfall #4 (courtroom refactor without test net — capture fixtures first), Pitfall #5 ($0.00 cost data), Pitfall #10 (import alias inconsistency)

### Phase 3: Registry and Entry Point Cleanup

**Rationale:** The registry design must see final framework shapes post-standardization. Building it before Phase 2 means rebuilding after. The MCP server's 6-framework gap and the duplicate lookup tables are low-effort to fix once a registry exists.
**Delivers:** `core/registry.ts` as single source of truth, CLI and MCP server reading from registry, MCP framework count corrected to 26, MCP input schema colocated with framework types, `run(args, args)` wart in MCP fixed
**Addresses:** Framework registry duplication (ARCHITECTURE.md anti-pattern #2), MCP server gap (CONCERNS.md)
**Avoids:** Pitfall #4 (MCP `args, args` bug fixed as isolated commit), future drift between CLI and MCP

### Phase 4: Test Infrastructure

**Rationale:** Testing must happen before packaging. With 26 frameworks having `continue-on-error: true` on all E2E tests, the only way to trust the Phase 2 standardization work is a mock provider test pass. Tests cannot be written meaningfully until components are stable (after Phase 2). This is the gate before publishing.
**Delivers:** Mock `LLMProvider` fixture infrastructure, happy-path unit tests for each framework's orchestrator, CLI exit code integration tests, `continue-on-error: true` safely removed from CI once mocks exist
**Addresses:** Test coverage gap (PITFALLS.md #3), lack of `__mocks__` or fixture files
**Avoids:** Pitfall #3 (silent regressions in 26 frameworks shipping to npm), Pitfall #4 (courtroom refactor coverage)

### Phase 5: npm Package and Build Pipeline

**Rationale:** Package structure stabilizes only after frameworks are standardized and the registry exists. Packaging half-standardized code means the first published version has known quality issues. This phase is mechanical once the groundwork is laid.
**Delivers:** `tsup` build pipeline, dual CJS+ESM `dist/`, TypeScript declarations, proper `exports` map, `files` whitelist, complete `package.json` metadata, `publint` + `attw` pre-publish validation passing, `npm provenance` in GitHub Actions, initial `1.0.0` npm publish
**Uses:** tsup, publint, @arethetypeswrong/cli, np, GitHub Actions `id-token: write` (STACK.md)
**Avoids:** Pitfall #1 (missing exports map), Pitfall #9 (phantom openai dependency — wire to real SDK or remove)

### Phase 6: Claude Code Skill

**Rationale:** The skill depends on the CLI's `--output` flag being reliable for all 26 frameworks (Phase 2) and the CLI being the canonical interface with a stable registry (Phase 3). Can proceed in parallel with Phase 5 once the CLI is confirmed stable.
**Delivers:** `skills/institutionalized/SKILL.md` with guided framework selection (decision-tree questions, not just a list of 26 names), CLI subprocess orchestration using `ANTHROPIC_API_KEY` from Claude Code's environment, inline key findings output, timestamped report file written to project directory, `skills/institutionalized/references/` with framework selection guide
**Implements:** Planned skill architecture (ARCHITECTURE.md — skill as CLI orchestrator, not prompt inlining)
**Avoids:** Pitfall #8 (skill routing degradation — write explicit disambiguation, test 10 scenarios), ARCHITECTURE.md anti-pattern #6 (skill as pure prompt vs. CLI orchestrator)

### Phase Ordering Rationale

- Core before frameworks: `core/types.ts` changes cascade to all 26 framework files; do it once, do it first
- Frameworks before registry: registry design must reflect final framework shapes to avoid rebuilding
- Registry before packaging: package entry points should map to stabilized, registered frameworks
- Tests before publishing: the 26-framework E2E `continue-on-error` safety net must be replaced with mocks before npm release
- Skill parallel with packaging: once CLI is stable post-Phase 3, skill authoring is independent of build pipeline work

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 4 (Test Infrastructure):** Mock provider pattern for Bun test runner — verify `bun test` mock injection patterns; the `MockProvider` approach is conceptually straightforward but Bun's module mocking API may require specific patterns
- **Phase 5 (npm Package):** `tsup` and `attw` version pinning — web search was unavailable during research; verify current stable versions of `tsup ^8.x`, `publint ^0.3.x`, `@arethetypeswrong/cli ^0.17.x` against npmjs.com before pinning
- **Phase 6 (Skill):** Claude Code skill subprocess invocation — the `ANTHROPIC_API_KEY` passthrough mechanism (Claude Code's env var available to subprocess tools) is the stated intent in PROJECT.md but was not verified against current Claude Code documentation; confirm before writing skill instructions

Phases with standard patterns (skip research-phase):
- **Phase 1 (Core Hardening):** TypeScript strict mode patterns and typed error hierarchies are well-documented; `DEFAULT_MODELS` constant pattern is straightforward
- **Phase 2 (Framework Standardization):** Pure mechanical refactoring against a fixed contract; no external API research needed
- **Phase 3 (Registry):** Simple module extraction; no novel patterns
- **Phase 5 (npm Packaging):** Exports map and dual CJS+ESM are well-documented; Node.js official docs confirm `"types"` condition ordering rule

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Core toolchain (Bun, TypeScript, tsup approach) verified against installed packages and codebase; `tsup`/`publint`/`attw` version numbers are MEDIUM — from training data, not current npmjs.com |
| Features | HIGH | Table stakes derived from direct codebase gap analysis; LLM library patterns (retry, timeout, cost) are MEDIUM from training data |
| Architecture | HIGH | Based on direct codebase inspection of all major components; Node.js official docs confirm exports map condition ordering |
| Pitfalls | HIGH | Pitfalls 1-5 and 10-12 verified from direct code reading (CONCERNS.md, source files); Pitfall 6 (system message bug) verified from `anthropic.ts` source |

**Overall confidence:** HIGH

### Gaps to Address

- **Skill subprocess mechanism:** The claim that Claude Code skills can invoke `ANTHROPIC_API_KEY` from Claude Code's own environment is stated as project intent but not verified against current Claude Code documentation. Validate this during Phase 6 planning before writing skill instructions that depend on it.
- **tsup/publint/attw current versions:** Research used training-data knowledge (cutoff Aug 2025); versions `tsup ^8.x`, `publint ^0.3.x`, `@arethetypeswrong/cli ^0.17.x` should be verified against npmjs.com before the Phase 5 build script is written.
- **Bun mock injection patterns:** Bun's test runner module mocking API was not verified against current Bun 1.x docs. Check before writing mock provider test infrastructure in Phase 4.
- **`np` vs alternatives:** `np` is recommended for release automation but was not verified as current/maintained. Check npmjs.com before committing to it in Phase 5.

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection — `core/`, `frameworks/courtroom/`, `cli.ts`, `mcp-server/index.ts`, `skills/institutional-lite/SKILL.md`, `.planning/codebase/CONCERNS.md`
- Installed package versions — `/Users/jjoosshhmbpm1/institutionalized/node_modules/.bun/*/package.json`
- Node.js official documentation — `package.json` exports field, `"types"` condition ordering rule
- npm provenance — official npm feature since 2023, well-documented in npm CLI docs

### Secondary (MEDIUM confidence)
- Training data knowledge of TypeScript library ecosystem (tsup, publint, attw, np) — conventions current as of Aug 2025 training cutoff
- LLM library patterns (retry, timeout, cost tracking) — LangChain, Vercel AI SDK, Anthropic SDK as reference points from training data
- Claude Code skill format — inferred from working `skills/institutional-lite/SKILL.md` example; official docs not directly consulted

### Tertiary (LOW confidence)
- Skill `ANTHROPIC_API_KEY` passthrough mechanism — stated intent in PROJECT.md but not verified against current Claude Code documentation; needs validation before Phase 6 implementation

---
*Research completed: 2026-03-16*
*Ready for roadmap: yes*
