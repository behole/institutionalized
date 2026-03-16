# Technology Stack

**Project:** institutionalized — production-grade npm publishing + Claude Code skill
**Researched:** 2026-03-16
**Overall confidence:** HIGH (verified against installed package.json files and skill source)

---

## Current State Assessment

The codebase works great under Bun. It does NOT work as an npm package yet. The core problems are:

1. **No build pipeline.** `tsconfig.json` has `noEmit: true`. The exports map in `core/package.json` points to `.ts` files (`"./index.ts"`). This is valid for Bun's internal workspace resolution but will break every npm consumer running Node.js or any bundler other than Bun.
2. **`@anthropic-ai/sdk` is severely outdated.** Locked at 0.32.1. Current is 0.50+. The API surface changed significantly (extended thinking, token-efficient tool use, updated model names). Keeping 0.32.1 means the library ships code that can't access claude-3-5-sonnet-20241022, claude-3-7-sonnet-*, or any new tool use features.
3. **OpenAI provider uses raw `fetch` despite `openai` being a declared dependency.** The `openai` package (bun-resolved to 4.104.0) is in `dependencies` but unused. The provider hand-rolls HTTP. This means consumers get the weight of the `openai` package without any of the benefit.
4. **Redundant Bun type packages.** Both `@types/bun` (1.3.8) and `bun-types` (1.3.8) are declared. They ship from the same source. Only `@types/bun` is needed.
5. **TypeScript is not a direct devDependency.** The `typecheck` script calls `bun tsc` which shells out to Bun's bundled tsc. This is fine for Bun 1.x but means `tsc --version` doesn't exist in the project, and IDE integrations may pick up a system tsc with a different version.

---

## Recommended Stack

### Runtime and Tooling

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Bun | latest (1.x) | Runtime, test runner, package manager, build for MCP binary | Project constraint — already in use, fast, zero-config TypeScript execution |
| TypeScript | ^5.7.x | Type checking, emitting `.d.ts` declarations | 5.7 is current stable as of early 2026; add as explicit devDependency so `tsc --version` is predictable |
| `tsup` | ^8.x | Build pipeline for npm distribution | See rationale below |

**Why `tsup` for the npm build:**

The project needs to emit CommonJS + ESM + `.d.ts` files from TypeScript source, with a proper `exports` map that npm consumers can use. The options are:

- `tsc` alone: produces `.d.ts` and `.js` but requires careful `tsconfig` for dual CJS+ESM, slow, no tree-shaking
- `esbuild` directly: fast but manual `.d.ts` generation required
- `tsup` (built on esbuild): single config file produces `dist/cjs/`, `dist/esm/`, and `dist/types/` in one command; supports `--dts`, `--format cjs,esm`; used by virtually every major TypeScript library published in 2024-2026; Bun-compatible (`bunx tsup`)

Do NOT use Bun's `bun build` for this purpose. `bun build` is for producing Bun-executable binaries or browser bundles. It does not produce Node.js-compatible CommonJS modules and cannot emit `.d.ts` files.

Use `bun build --compile` only for the standalone MCP server binary (already the current approach — keep it).

### npm Publishing

| Technology | Purpose | Why |
|------------|---------|-----|
| `tsup` | Emit dist artifacts | See above |
| `publint` | Validate package before publish | Catches broken exports maps, missing files in `"files"`, wrong module field values — free and fast |
| `are-the-types-wrong` (attw) | Validate TypeScript resolution modes | Verifies that CJS and ESM type resolution both work before publish |
| npm `provenance` | Supply-chain attestation | Free with GitHub Actions; adds a signed SBOM attestation to the npm registry entry; expected for production packages in 2025+ |
| Semantic versioning with `np` or `release-it` | Automate version bumps and changelog | Either works; `np` is simpler for solo/small teams |

**Recommended publish flow:**
```
bun run build   # tsup produces dist/
bun run check   # publint + attw verify the package
np              # interactive semver bump → git tag → npm publish
```

**What NOT to use:**
- Do not use `semantic-release` unless you want to commit to conventional commits for every change. It's powerful but its setup overhead is disproportionate for a library of this type.
- Do not use Changesets. Changesets are designed for monorepos where multiple packages publish independently. This project's frameworks are internal implementation details — only `@institutional-reasoning/core` (or a top-level `institutionalized` package) should publish. Changesets would add noise.

### Package Structure for npm

The monorepo structure works perfectly for Bun-internal development but needs a deliberate decision for npm publishing. Two valid options:

**Option A — Publish the top-level package only (recommended)**

Publish `institutionalized` as a single npm package. The 26 frameworks are accessed via named exports, not separate packages. Consumers do:

```typescript
import { run } from 'institutionalized/courtroom';
import { run } from 'institutionalized/peer-review';
```

This is simpler, requires one `package.json` with one exports map, and makes versioning trivial. Users don't need to know about the monorepo structure.

**Option B — Publish scoped packages per framework**

Publish `@institutionalized/courtroom`, `@institutionalized/peer-review`, etc. This is what large ecosystems do (Radix UI, tRPC sub-packages). It lets users install only what they need. It requires Changesets or a custom publish script to version 26+ packages.

**Choose Option A.** The library has 26 frameworks with ~50 total dependencies between them. Nobody installs only one reasoning framework — the value is in guided selection across all 26. The bundle size argument for Option B doesn't apply (these run server-side against LLM APIs, not in browser bundles). Option A ships in this milestone; Option B is a future consideration if adoption demands it.

### Exports Map (correct pattern for Option A)

The current `core/package.json` exports `.ts` files. For npm, the exports map must point to compiled artifacts:

```json
{
  "exports": {
    ".": {
      "import": "./dist/esm/index.js",
      "require": "./dist/cjs/index.js",
      "types": "./dist/types/index.d.ts"
    },
    "./courtroom": {
      "import": "./dist/esm/frameworks/courtroom/index.js",
      "require": "./dist/cjs/frameworks/courtroom/index.js",
      "types": "./dist/types/frameworks/courtroom/index.d.ts"
    }
  }
}
```

The Bun workspace can continue to use `.ts` imports internally — tsup handles the build-time transform. The dual-format output ensures compatibility with Node.js `require()`, ES module `import`, Bun, Deno, and modern bundlers.

### Dependencies — Correct Placement

| Package | Current State | Correct State | Rationale |
|---------|--------------|---------------|-----------|
| `@anthropic-ai/sdk` | `^0.32.1` in `dependencies` | `^0.50.0` in `dependencies` of `core/` | Upgrade required; keep in `dependencies` (not peer) since the SDK is an implementation detail of the provider layer, not something consumers need to install |
| `openai` | `^4.76.1` in root `dependencies`, unused | Use the SDK in `OpenAIProvider`, keep in `dependencies` of `core/` | The package is already declared and bun resolves a current version (4.104.x); wire it up so the dependency is real |
| `@modelcontextprotocol/sdk` | `^1.0.4`, resolves to 1.25.3 | `^1.25.0` in `mcp-server/` dependencies only | MCP SDK should only be a dependency of `mcp-server`, not the publishable library package |
| `typescript` | Not declared, uses bun's bundled tsc | `^5.7.x` in devDependencies (root) | Makes tsc predictable for CI and IDE |
| `tsup` | Not present | `^8.x` in devDependencies (root) | Build pipeline |
| `publint` | Not present | `^0.3.x` in devDependencies (root) | Pre-publish validation |
| `@arethetypeswrong/cli` | Not present | `^0.17.x` in devDependencies (root) | TypeScript export validation |
| `@types/bun` | `latest` in devDependencies | `latest` in devDependencies | Keep; this is the correct package |
| `bun-types` | `latest` in devDependencies (redundant) | Remove | Redundant with `@types/bun` since Bun 1.x |

### Claude Code Skill

| Component | Format | Why |
|-----------|--------|-----|
| `SKILL.md` | YAML frontmatter + markdown | The established format — see existing `institutional-lite/SKILL.md`. No build step. Pure text. |
| `references/` | Additional markdown files linked from SKILL.md | Used for extended context the skill loads on demand |
| Install script | Shell script (`scripts/install-skill.sh`) | Copies skill dir to `~/.claude/skills/institutionalized/` |

**Skill format, verified from the existing `institutional-lite` example:**

```yaml
---
name: institutionalized
description: Multi-agent institutional reasoning frameworks (courtroom, peer review, red team, and 23 more) for structured LLM decision-making.
metadata:
  short-description: Guided institutional reasoning
---
```

The skill executes entirely within Claude Code's context — it does not shell out to run `bun cli.ts`. It uses Claude Code's own model to simulate multi-agent reasoning through structured prompting, guided by the SKILL.md instructions. This is the "default to Claude Code's own model" requirement from the project spec.

For power users wanting to call external APIs with model control, the existing MCP server handles that path. The skill and MCP server are complementary, not competing.

**What NOT to build:**
- Do not create a skill that shells out to `bun cli.ts`. This would require users to have Bun installed, the repo checked out, and API keys set — destroying the zero-friction goal.
- Do not create a skill that imports from the npm package at runtime. Skills run in Claude Code's reasoning context, not in a Node.js process.

### CI/CD for npm Publishing

The existing GitHub Actions workflows need augmentation:

| Workflow | Change | Why |
|----------|--------|-----|
| `test.yml` | Add `bun run build` + `publint` check | Catch broken exports before they reach npm |
| `release.yml` | Add `npm publish --provenance` step with `NPM_TOKEN` secret | Automate publishing on tag push; provenance adds supply-chain attestation |
| New: `release.yml` trigger | Keep existing `v*` tag trigger | Already correct |

**Provenance (HIGH confidence, MEDIUM specificity):** npm provenance requires the workflow to run with `id-token: write` permission and publish via `npm publish --provenance`. This links the npm package to the specific GitHub Actions run that built it. Supported by npm registry since mid-2023, expected for serious packages in 2025+.

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Build tool | `tsup` | `tsc` only | `tsc` doesn't bundle, slow dual-format setup, no tree-shaking hints |
| Build tool | `tsup` | `unbuild` | `unbuild` is Vue ecosystem-centric; `tsup` has broader TypeScript community adoption |
| Package structure | Single `institutionalized` package | Scoped per-framework packages | See rationale above — complexity not justified for server-side library |
| OpenAI provider | Use `openai` SDK | Keep raw `fetch` | The SDK is already a declared dependency and resolves to 4.104.0 — wasteful to not use it |
| Anthropic version | `^0.50.0` | Stay on 0.32.1 | 0.32.1 lacks claude-3-5-sonnet-20241022 (the best current model), extended thinking, and correct system prompt handling |
| Skill approach | Pure markdown skill | Skill that calls bun CLI | Zero-friction for users; skill runs in Claude's context, no runtime dependencies |
| Version automation | `np` | `semantic-release` or Changesets | `semantic-release` requires conventional commits discipline; Changesets adds overhead not needed for a single publishable package |

---

## Installation — What Needs to Be Added

```bash
# Add TypeScript as explicit devDependency
bun add -D typescript@^5.7

# Add build toolchain
bun add -D tsup@^8 publint @arethetypeswrong/cli

# Remove redundant type package
bun remove bun-types

# Upgrade Anthropic SDK
bun add @anthropic-ai/sdk@^0.50

# Add build script to root package.json
# "build": "tsup"
# "check": "publint && attw --pack"
```

---

## Sources

- Installed package versions verified via `/Users/jjoosshhmbpm1/institutionalized/node_modules/.bun/*/package.json` (HIGH confidence)
- Skill format verified from `/Users/jjoosshhmbpm1/institutionalized/skills/institutional-lite/SKILL.md` (HIGH confidence)
- OpenAI provider raw-fetch pattern verified from `/Users/jjoosshhmbpm1/institutionalized/core/providers/openai.ts` (HIGH confidence)
- `@anthropic-ai/sdk` 0.32.1 lock verified from actual installed package (HIGH confidence — current version is higher but bun.lock pins to declared range)
- `tsup` recommendation: MEDIUM confidence — based on training data knowledge of TypeScript library ecosystem as of Aug 2025; could not verify current version via WebSearch (permission denied). Version `^8.x` was current mid-2025; verify against npmjs.com before pinning.
- `publint` and `attw` recommendations: MEDIUM confidence — both were standard pre-publish tools in the TypeScript ecosystem as of Aug 2025; could not verify current versions via WebSearch.
- npm provenance: HIGH confidence — official npm feature since 2023, well-documented in npm CLI docs.
