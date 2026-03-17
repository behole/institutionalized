# Roadmap: Institutional Reasoning

## Overview

The library's core architecture is sound — 26 frameworks, a clean provider abstraction, orchestration primitives, and audit trails already exist. This roadmap hardens what's there and ships it: strict TypeScript, consistent framework patterns, a unified registry, mock-based test coverage, a publishable npm package, and a Claude Code skill that guides users to the right framework. Work proceeds inside-out — core stability unlocks framework standardization, which unlocks the registry, which unlocks packaging; the skill proceeds in parallel with packaging once the CLI is stable.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Core Hardening** - Fix the foundation: strict TypeScript, typed errors, provider bugs, and SDK upgrade
- [ ] **Phase 2: Framework Standardization** - Bring all 26 frameworks up to the same pattern against the cleaned core
- [ ] **Phase 3: Registry and Entry Point Cleanup** - Create single source of truth and wire CLI/MCP to it
- [ ] **Phase 4: Test Infrastructure** - Mock provider tests for all 26 frameworks; remove CI safety net
- [ ] **Phase 5: npm Package** - Build pipeline, exports map, and publish 1.0.0
- [ ] **Phase 6: Claude Code Skill** - Guided framework selection skill with inline findings and file report

## Phase Details

### Phase 1: Core Hardening
**Goal**: The core layer is type-safe, the Anthropic provider works correctly, and the SDK is current — a stable foundation all 26 frameworks can depend on
**Depends on**: Nothing (first phase)
**Requirements**: CODE-01, CODE-03, CODE-04, CODE-06, CODE-07, PROV-01, PROV-05, PROV-06, PROV-07
**Success Criteria** (what must be TRUE):
  1. `bun run typecheck` passes with zero errors against TypeScript strict mode (no `any` escapes in core)
  2. All 26 framework `run()` signatures accept `RunFlags` typed interface instead of `Record<string, any>`
  3. Typed error hierarchy exists — catching `InstitutionalError` catches `ProviderError`, `ValidationError`, and `FrameworkError`
  4. The Anthropic provider sends system prompts in the `system` parameter, not as a user-turn message
  5. `@anthropic-ai/sdk` is at ^0.50.0 and `executeParallel()` has a configurable concurrency cap
**Plans:** 2/4 plans executed
Plans:
- [ ] 01-01-PLAN.md — TypeScript setup + typed error hierarchy
- [ ] 01-02-PLAN.md — Anthropic system message bug fix + SDK upgrade
- [ ] 01-03-PLAN.md — Retry/timeout infrastructure + concurrency semaphore
- [ ] 01-04-PLAN.md — RunFlags interface + DEFAULT_MODELS across all 26 frameworks

### Phase 2: Framework Standardization
**Goal**: All 26 frameworks follow consistent patterns — FrameworkRunner for orchestration, `@core/*` imports, and accurate cost tracking
**Depends on**: Phase 1
**Requirements**: CODE-02, CODE-05, PROV-02, PROV-03
**Success Criteria** (what must be TRUE):
  1. Every framework uses `FrameworkRunner` from core — no direct provider SDK calls anywhere in `frameworks/`
  2. All 26 frameworks use `@core/*` import paths with zero relative `../../core` traversals
  3. Running any of the 7 previously-broken frameworks (courtroom, writers-workshop, hegelian, regulatory-impact, war-gaming, talmudic, dissertation-committee) reports a non-zero cost in the audit trail
  4. Courtroom framework routes through `LLMProvider` abstraction — provider selection and cost tracking work the same as any other framework
**Plans**: TBD

### Phase 3: Registry and Entry Point Cleanup
**Goal**: A single `core/registry.ts` source of truth eliminates duplication between CLI and MCP, and the MCP server correctly exposes all 26 frameworks
**Depends on**: Phase 2
**Requirements**: REG-01, REG-02, REG-03, PROV-04
**Success Criteria** (what must be TRUE):
  1. `core/registry.ts` exists and is the only place where framework metadata and input schemas are defined
  2. Running `bun cli.ts --list` and querying the MCP server both return exactly 26 frameworks
  3. The MCP `run(args, args)` double-pass bug is fixed — MCP tool calls pass the correct input to frameworks
  4. Adding a new framework requires a change in exactly one file (the registry) to appear in both CLI and MCP
**Plans**: TBD

### Phase 4: Test Infrastructure
**Goal**: All 26 frameworks have mock-backed unit tests that run without API keys, giving CI a real safety net
**Depends on**: Phase 3
**Requirements**: TEST-01, TEST-02, TEST-03
**Success Criteria** (what must be TRUE):
  1. A `MockLLMProvider` fixture exists that can be injected into any framework's orchestrator for unit testing
  2. `bun test` runs all 26 framework happy-path tests to completion with zero API calls
  3. CI passes without `continue-on-error: true` on any test step
**Plans**: TBD

### Phase 5: npm Package
**Goal**: The library is installable from npm, exports compile correctly for both CJS and ESM consumers, and 1.0.0 is published with provenance
**Depends on**: Phase 4
**Requirements**: NPM-01, NPM-02, NPM-03, NPM-04, NPM-05, NPM-06
**Success Criteria** (what must be TRUE):
  1. `npm pack --dry-run` produces a tarball that a fresh Node.js project can install without `ERR_PACKAGE_PATH_NOT_EXPORTED`
  2. TypeScript consumers get `.d.ts` declarations for all exported types and framework `run()` signatures
  3. `publint` and `@arethetypeswrong/cli` both pass with zero errors or warnings
  4. `npx institutionalized --help` works after install (bin entry resolves to CLI)
  5. The package is published at version 1.0.0 with npm provenance attestation
**Plans**: TBD

### Phase 6: Claude Code Skill
**Goal**: A single `/institutionalized` skill guides users to the right framework via decision-tree questions and delivers findings inline and as a file
**Depends on**: Phase 3
**Requirements**: SKIL-01, SKIL-02, SKIL-03
**Success Criteria** (what must be TRUE):
  1. Invoking `/institutionalized` asks the user at least one disambiguation question before recommending a framework (never dumps a raw list of 26 names)
  2. The skill runs a framework end-to-end using Claude Code's own model with no API key configuration required from the user
  3. Key findings appear inline in the Claude Code chat window during the run
  4. A timestamped full report file is written to the project directory after the run completes
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 (Phase 6 can proceed in parallel with Phase 5 once Phase 3 is complete)

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Core Hardening | 2/4 | In Progress|  |
| 2. Framework Standardization | 0/TBD | Not started | - |
| 3. Registry and Entry Point Cleanup | 0/TBD | Not started | - |
| 4. Test Infrastructure | 0/TBD | Not started | - |
| 5. npm Package | 0/TBD | Not started | - |
| 6. Claude Code Skill | 0/TBD | Not started | - |
