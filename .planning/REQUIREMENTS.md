# Requirements: Institutional Reasoning

**Defined:** 2026-03-16
**Core Value:** Every framework must produce genuinely better reasoning than a single LLM call — the institutional structure is the point.

## v1 Requirements

Requirements for production-grade library, npm package, and Claude Code skill.

### Code Quality

- [ ] **CODE-01**: Add `typescript` as explicit devDependency and make `bun run typecheck` pass with strict mode
- [ ] **CODE-02**: Standardize all import paths to `@core/*` across all 26 frameworks
- [ ] **CODE-03**: Replace `flags: Record<string, any>` with typed `RunFlags` interface in all 26 `run()` signatures
- [ ] **CODE-04**: Implement typed error hierarchy (`InstitutionalError` → `ProviderError`, `ValidationError`, `FrameworkError`)
- [ ] **CODE-05**: Ensure all 26 frameworks consistently adopt `FrameworkRunner` for orchestration and audit trails
- [ ] **CODE-06**: Centralize model constants in `core/config.ts` (`DEFAULT_MODELS`) replacing 26 hardcoded model strings
- [ ] **CODE-07**: Add concurrency cap (semaphore) to `executeParallel()` to prevent rate limit bursts

### Providers

- [ ] **PROV-01**: Fix Anthropic provider system message bug (currently sends system prompt as user-turn message)
- [ ] **PROV-02**: Refactor courtroom framework to use `LLMProvider` abstraction instead of direct Anthropic SDK calls
- [ ] **PROV-03**: Fix 7 frameworks with hardcoded `$0.00` cost tracking to report accurate costs
- [ ] **PROV-04**: Fix MCP server `run(args, args)` double-pass bug
- [ ] **PROV-05**: Upgrade `@anthropic-ai/sdk` from ^0.32.1 to ^0.50.0+
- [ ] **PROV-06**: Add retry with exponential backoff for OpenAI/OpenRouter providers on 429/500 errors
- [ ] **PROV-07**: Add configurable per-agent timeouts via AbortController

### Registry

- [ ] **REG-01**: Create `core/registry.ts` as single source of truth for framework metadata and input schemas
- [ ] **REG-02**: Fix MCP server framework count from 20 to 26
- [ ] **REG-03**: Wire CLI and MCP server to read from registry instead of duplicate lookup tables

### Testing

- [ ] **TEST-01**: Create mock `LLMProvider` fixture infrastructure for unit testing without API keys
- [ ] **TEST-02**: Write happy-path unit tests for each of the 26 framework orchestrators using mock provider
- [ ] **TEST-03**: Remove `continue-on-error: true` from CI once mock tests provide coverage

### npm Package

- [ ] **NPM-01**: Add `tsup` build pipeline producing dual CJS+ESM output with `.d.ts` declarations
- [ ] **NPM-02**: Add proper `exports` map to package.json with per-framework sub-path exports
- [ ] **NPM-03**: Complete package.json metadata (author, repository, homepage, bugs, files field)
- [ ] **NPM-04**: Create CHANGELOG.md with semantic versioning
- [ ] **NPM-05**: Add `publint` + `@arethetypeswrong/cli` pre-publish validation
- [ ] **NPM-06**: Add `bin` entry for CLI discovery via `npx institutionalized`

### Skill

- [ ] **SKIL-01**: Create `/institutionalized` skill with guided framework selection using decision-tree questions
- [ ] **SKIL-02**: Implement default-to-Claude-Code-model behavior with optional API key override for power users
- [ ] **SKIL-03**: Skill streams key findings inline and saves full timestamped report to file

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Reliability

- **REL-01**: Budget cap / cost guard — abort run if accumulated cost exceeds threshold
- **REL-02**: Dry-run mode that shows prompts without calling LLMs

### Developer Experience

- **DX-01**: Per-agent streaming output in real-time as agents complete
- **DX-02**: Verbose mode printing per-agent timing to console

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Web UI / dashboard | This is a library/skill, not a product with a frontend |
| Real-time per-agent streaming | Async generator refactor of all 26 frameworks; 3x scope multiplier |
| Custom framework builder | 26 curated frameworks is the value; open-ended builder dilutes quality |
| Persistent state / database | Stateless invocations are simpler, cheaper, more predictable |
| Per-framework skills (`/courtroom`, `/pre-mortem`) | One unified `/institutionalized` skill handles routing |
| Plugin / extension system | Premature abstraction; community adds frameworks via PRs |
| Auto-model selection based on task | Unpredictable costs; users should control model choice |
| Scoped npm packages (`@institutionalized/courtroom`) | Premature until adoption demands it |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| CODE-01 | Phase 1 | Pending |
| CODE-02 | Phase 2 | Pending |
| CODE-03 | Phase 1 | Pending |
| CODE-04 | Phase 1 | Pending |
| CODE-05 | Phase 2 | Pending |
| CODE-06 | Phase 1 | Pending |
| CODE-07 | Phase 1 | Pending |
| PROV-01 | Phase 1 | Pending |
| PROV-02 | Phase 2 | Pending |
| PROV-03 | Phase 2 | Pending |
| PROV-04 | Phase 3 | Pending |
| PROV-05 | Phase 1 | Pending |
| PROV-06 | Phase 1 | Pending |
| PROV-07 | Phase 1 | Pending |
| REG-01 | Phase 3 | Pending |
| REG-02 | Phase 3 | Pending |
| REG-03 | Phase 3 | Pending |
| TEST-01 | Phase 4 | Pending |
| TEST-02 | Phase 4 | Pending |
| TEST-03 | Phase 4 | Pending |
| NPM-01 | Phase 5 | Pending |
| NPM-02 | Phase 5 | Pending |
| NPM-03 | Phase 5 | Pending |
| NPM-04 | Phase 5 | Pending |
| NPM-05 | Phase 5 | Pending |
| NPM-06 | Phase 5 | Pending |
| SKIL-01 | Phase 6 | Pending |
| SKIL-02 | Phase 6 | Pending |
| SKIL-03 | Phase 6 | Pending |

**Coverage:**
- v1 requirements: 29 total
- Mapped to phases: 29
- Unmapped: 0

---
*Requirements defined: 2026-03-16*
*Last updated: 2026-03-16 after roadmap creation*
