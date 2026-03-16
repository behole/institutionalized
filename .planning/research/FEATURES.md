# Feature Landscape

**Domain:** Multi-agent LLM reasoning library (npm package + Claude Code skill)
**Researched:** 2026-03-16
**Confidence note:** Research performed from codebase analysis + training knowledge of production npm/LLM library patterns. Web search unavailable; confidence levels reflect this constraint.

---

## Table Stakes

Features users expect. Missing = product feels broken or unpublishable.

### A. npm Package Table Stakes

| Feature | Why Expected | Complexity | Status | Notes |
|---------|--------------|------------|--------|-------|
| Clean `exports` map in package.json | Node/Bun resolution fails without it; users get import errors | Low | Missing | No `exports` field; `main`/`module` also absent |
| Proper TypeScript declarations (`.d.ts`) | TypeScript callers get no autocomplete or type errors without it | Medium | Missing | No build step; no `types` field in package.json |
| Full package.json metadata | npm search, security scans, and trust signals require `author`, `repository`, `homepage`, `bugs` | Low | Partial | `author` and `repository.url` are empty strings |
| Semantic versioning with CHANGELOG | Users need to know what changed between `0.1.0` and `0.2.0`; npm shows version history | Low | Missing | No CHANGELOG.md |
| `README` with install + usage in first 5 lines | npm page shows README; users bounce if they have to scroll to find `npm install` | Low | Partial | README exists but install section uses `bun install` without npm equivalent |
| MIT or similar license file | Many organizations block packages without a verified OSS license | Low | Done | LICENSE present |
| No `devDependencies` in `dependencies` | Ships bloat to downstream users; `@types/bun` in `devDependencies` is correct but `typescript` is missing entirely | Low | Partial | `typescript` not declared as devDependency though typecheck script uses it |
| Passing `npm pack` dry run | Verifies package contains expected files and no secrets/build artifacts | Low | Unknown | No `.npmignore` or `files` field |

### B. TypeScript Library Table Stakes

| Feature | Why Expected | Complexity | Status | Notes |
|---------|--------------|------------|--------|-------|
| No `any` types in public API | TypeScript users expect type safety at call sites; `any` propagates unsafely | Medium | Missing | Every `run(input, flags)` types `flags` as `Record<string, any>` across all 26 frameworks |
| Exported type definitions for all public interfaces | Users need `RunResult`, `AuditLog`, etc. types to build typed wrappers | Low | Partial | Core types exported but per-framework result types inconsistently exported |
| Strict mode passes without errors | Production TypeScript projects won't use libraries that fail strict checks | High | Broken | `tsc --noEmit` is broken (TypeScript not in devDependencies) |
| Consistent import paths | Mixed `@core/*` vs `@institutional-reasoning/core` imports confuse IDEs and bundlers | Low | Broken | 6 newer frameworks use package name; older use path alias |
| Error types, not just `Error` strings | Callers can't write `catch (e) { if (e instanceof FrameworkError)` without named error classes | Medium | Missing | All errors are generic `Error` throws |

### C. Production-Grade LLM Library Table Stakes

| Feature | Why Expected | Complexity | Status | Notes |
|---------|--------------|------------|--------|-------|
| Graceful LLM failure handling | LLM APIs return 429, 500, timeout; silent hangs or crashes are unacceptable | Medium | Missing | No timeouts, no retry logic, no 429 backoff on OpenAI/OpenRouter providers |
| Accurate cost tracking | Audit trail is a core advertised feature; `$0.00` for 7 frameworks breaks trust | Medium | Broken | 7 frameworks hardcode `costUSD = 0.0` |
| Provider abstraction actually abstracts | Users pick `openai` expecting courtroom to use OpenAI; it doesn't | High | Broken | Courtroom bypasses `LLMProvider` and hard-wires Anthropic SDK |
| Meaningful error messages when API key missing | First-run UX fails silently or with cryptic SDK errors | Low | Broken | Courtroom passes `undefined` to SDK; other frameworks OK via `getAPIKey()` |
| JSON parsing resilience | LLM output varies; single-point JSON parsing failure breaks all frameworks | Medium | Fragile | `parseJSON()` in core is single point of failure; courtroom duplicates it without markdown-fence support |
| Typed run() flags | Configuration bugs are invisible with `Record<string, any>`; MCP server currently passes args twice | Medium | Missing | See CONCERNS.md: `run(args, args)` in MCP server is a silent bug |

### D. Claude Code Skill Table Stakes

| Feature | Why Expected | Complexity | Status | Notes |
|---------|--------------|------------|--------|-------|
| SKILL.md with `name`, `description`, `metadata` frontmatter | Claude Code skill system requires this format | Low | Done | `institutional-lite/SKILL.md` exists with correct frontmatter |
| Zero-friction first use (no API key required) | Skills that require API key setup before first use have high drop-off | Medium | Missing | Current skill references external API keys; PROJECT.md plans Claude Code model default |
| Clear "when to use / when not to use" instructions | Skill must tell Claude when to invoke it vs. answer directly | Low | Done | `institutional-lite/SKILL.md` has "When not to use" section |
| Concrete output format | Skill must specify what Claude emits (JSON, markdown, streaming) | Low | Done | Specifies JSON-only output |
| Handles ambiguous input gracefully | Users won't always specify a framework; skill must recommend one | Low | Partial | Lite skill has framework selection guide but no guided questioning |

---

## Differentiators

Features that distinguish this library from "just use ChatGPT." Not expected, but create lasting value.

### D1. Guided Framework Selection

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Interactive framework recommendation | User says "I'm facing a hard decision" — skill asks 3 questions and recommends the right framework | Medium | PROJECT.md explicitly calls this out; "What kind of decision are you facing?" |
| Decision taxonomy in skill | Map user language ("I need feedback", "Should I do X?", "What could go wrong?") to framework families | Low | Can be pure prompt engineering; no code required |
| Confidence in recommendation | Skill explains *why* it chose courtroom vs. pre-mortem for a given question | Low | Prompt engineering only |

### D2. Output Quality

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Inline key findings + full report to file | Best of both worlds: immediate answer in chat, full audit trail on disk | Medium | PROJECT.md calls this out as core skill vision |
| Structured result types per framework | Callers get typed verdict, analysis, recommendations — not untyped JSON blobs | Medium | Requires per-framework Result types to be strict |
| Confidence scores where applicable | "The jury voted 4-1" is more useful than just "Guilty" | Low | Partially exists in courtroom/peer-review outputs already |
| Actionable recommendations | Each framework should produce "next actions" not just analysis | Low | Variable across frameworks; needs consistency audit |

### D3. Reliability Features

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Configurable timeouts per agent | Users can set `timeout: 30s` for fast-fail on expensive frameworks | Medium | Currently zero timeout infrastructure |
| Concurrency cap on parallel agents | Prevents rate limit explosions on frameworks like courtroom (7 agents) | Low | `executeParallel()` needs a semaphore; ~20 lines of code |
| Budget cap / cost guard | Abort run if accumulated cost exceeds threshold — critical for production | Medium | `AuditTrail` tracks cost post-hoc; need pre-run estimate + abort hook |
| Retry with exponential backoff | 429 errors from OpenAI/OpenRouter should retry, not crash | Medium | Provider-level; Anthropic SDK has built-in retry; OpenAI/OpenRouter need manual implementation |

### D4. Developer Experience

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| `bun run institutionalized --help` from npm | Discovery of all 26 frameworks from the published package | Low | CLI needs a `bin` entry in package.json |
| Per-framework TypeScript types importable | `import type { CourtroomResult } from 'institutional-reasoning/courtroom'` | Medium | Requires exports map with per-framework sub-paths |
| Dry-run mode that shows prompts without calling LLMs | Lets developers verify prompt templates without spending money | Low | `--dry-run` flag is documented in CLI help but not implemented |
| Verbose mode with per-agent timing | Performance debugging requires knowing which agent is the bottleneck | Low | Duration tracked in AuditTrail but not printed to console in verbose mode |

### D5. Skill Excellence Factors

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Uses Claude Code's own model by default | Zero API key friction; 90% of users never need to configure anything | Medium | Requires skill script that calls `claude` subprocess or uses Claude Code API passthrough |
| Optional model override for power users | Power users can use GPT-4o or claude-3-opus for specific frameworks | Low | Flags-based; already partially supported in framework `run()` |
| Streams findings inline as they complete | User sees courtroom prosecution result before jury finishes | High | Out of scope per PROJECT.md for v1; would require streaming refactor of all 26 frameworks |
| Report saved to timestamped file | `institutionalized-report-2026-03-16T14:32.md` — persistent, shareable | Low | One `Bun.write()` call in skill script |
| Framework explains its own reasoning | "I'm using Pre-mortem because you're about to commit to a course of action and want to identify failure modes" | Low | Prompt engineering in skill |

---

## Anti-Features

Things to deliberately NOT build in this milestone.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Web UI / dashboard | This is a library, not a product; UI adds deployment, hosting, auth complexity for no user value | Keep as CLI + skill |
| Real-time per-agent streaming | Requires async generator refactor of all 26 frameworks, test suite changes, provider streaming support in all 3 providers — 3x scope multiplier | Stream final summary only; mark as future milestone |
| Custom framework builder | 26 curated frameworks is the value; open-ended builder dilutes quality and support surface | Document the pattern in CONTRIBUTING.md for community contributions |
| Persistent session state / conversation history | Stateless invocations are simpler, cheaper, and more predictable; state brings database, concurrency, auth | Each run is independent by design |
| Per-framework CLI skills (`/courtroom`, `/pre-mortem`) | 26 skills creates skill discovery problem; single `/institutionalized` with guided routing is better UX | One skill, guided framework selection inside |
| Plugin / extension system | Premature abstraction; creates API surface to maintain; the 26 frameworks are the extension | Community adds frameworks via PRs, not plugins |
| Auto-model selection based on task | Model selection introduces unpredictable costs and non-determinism; users should control this | Recommend models in documentation; let users override |
| LLM output validation with schemas | Zod/ajv validation on LLM output adds dependency weight and brittle schemas that break on model updates | Keep `parseJSON()` robust; validate structure cheaply via TypeScript types |

---

## Feature Dependencies

```
TypeScript strict mode passes
  → requires: typescript in devDependencies
  → requires: all `flags: Record<string, any>` typed as RunFlags
  → requires: import paths standardized (@core/* or package name, not both)
  → enables: .d.ts generation

npm package publishable
  → requires: TypeScript strict mode passes (or explicit type skips)
  → requires: exports map in package.json
  → requires: .d.ts generated or bundled
  → requires: package.json metadata complete (author, repository, files)
  → requires: no secrets in published files (.npmignore or files field)

Accurate cost tracking
  → requires: courtroom refactored to use LLMProvider (not direct SDK)
  → requires: 7 frameworks with hardcoded $0.00 wired to real usage data
  → enables: budget cap / cost guard feature

Budget cap / cost guard
  → requires: accurate cost tracking
  → requires: pre-run cost estimate OR per-step abort check in AuditTrail

Claude Code skill with default model
  → requires: skill script that invokes Claude Code API without external API key
  → requires: guided framework selection logic (prompt engineering)
  → requires: report file output (Bun.write)
  → depends on: npm package being published (so skill can npm install it) OR
                 skill runs directly from repo (simpler)

Retry / backoff
  → requires: timeout infrastructure (AbortController) for OpenAI/OpenRouter providers
  → independent of: Anthropic SDK (already has built-in retry)

Concurrency cap
  → modifies: executeParallel() in core/orchestrator.ts
  → requires: no changes to any of the 26 frameworks (transparent)
```

---

## MVP Recommendation

For this milestone (polish + npm publishing + skill), prioritize in this order:

**Must-ship (blocking npm publication):**
1. Fix TypeScript devDependency + make `bun run typecheck` pass
2. Standardize import paths across all 26 frameworks
3. Type `flags` as `RunFlags` interface in all `run()` signatures
4. Add `exports` map + `types` field + author/repository to package.json
5. Fix courtroom provider bypass (enables accurate cost tracking)
6. Fix 7 frameworks with hardcoded `$0.00` cost

**Must-ship (skill launch):**
7. Guided framework selection in skill (prompt engineering, not code)
8. Default-to-Claude-Code-model behavior in skill
9. Inline findings + file report output pattern in skill

**Defer to next milestone:**
- Streaming per-agent output (scope too large)
- Budget cap (nice to have; not blocking)
- Dry-run mode (documented but unimplemented; leave as-is until post-launch)
- Retry/backoff (important for production hardening; not blocking publication)
- Concurrency cap (low-risk improvement; address after publish)

---

## Sources

**Confidence levels:**
- Codebase analysis (CONCERNS.md, source files): HIGH — direct observation
- npm package best practices (exports map, .d.ts, package.json metadata): MEDIUM — well-established conventions from training data; not verified against current npm docs due to web search unavailability
- Claude Code skill SKILL.md format: HIGH — read from existing `institutional-lite/SKILL.md` which follows the format
- LLM library patterns (retry, timeout, cost tracking): MEDIUM — standard industry patterns from training data (LangChain, Vercel AI SDK, Anthropic SDK as reference points)
- Specific claim: "Claude Code skills can call Claude Code's own model without API key" — LOW confidence — this is the project's stated intent but the mechanism is not verified from current Claude Code documentation
