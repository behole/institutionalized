# Technology Stack

**Analysis Date:** 2026-03-16

## Languages

**Primary:**
- TypeScript 5.x (ES2022 target) - All source files, frameworks, CLI, MCP server, tests
- No JavaScript source files; pure TypeScript codebase

**Secondary:**
- Shell - `scripts/install-codex-skill.sh` installer script
- HTML - `website/index.html` landing page

## Runtime

**Environment:**
- Bun (latest) - Primary runtime, test runner, file I/O, package manager
- Node.js >=18.0.0 - Declared as minimum in `package.json` engines field, but Bun is used in practice

**Package Manager:**
- Bun (workspace-aware monorepo)
- Lockfile: `bun.lock` present and committed

## Frameworks

**Core:**
- No web framework; this is a CLI/library/MCP server project
- Module system: ES Modules (`"type": "module"` everywhere)

**Testing:**
- Bun's built-in test runner - zero external test framework dependencies
- Config: no separate config file; tests invoked via `bun test` and `bun test <path>`

**Build/Dev:**
- TypeScript compiler via Bun (`bun tsc --noEmit`) - type checking only, no emit
- `bun build` - used in `mcp-server` to compile a self-contained binary: `bun build index.ts --compile --outfile institutional-reasoning-mcp`

## Key Dependencies

**Critical (root `package.json`):**
- `@anthropic-ai/sdk` ^0.32.1 - Official Anthropic client, used in `core/providers/anthropic.ts`
- `openai` ^4.76.1 - Declared in root but OpenAI provider in `core/providers/openai.ts` uses raw `fetch` (not this SDK)

**Infrastructure:**
- `@modelcontextprotocol/sdk` ^1.0.4 - MCP server/transport layer, used in `mcp-server/index.ts`
- `@institutional-reasoning/core` workspace:* - Internal shared core, used by all 26 framework packages and the MCP server

**Dev Only:**
- `@types/bun` latest - Bun type definitions
- `bun-types` latest - Additional Bun API types (both specified; redundant)

## Monorepo Workspace Structure

Bun workspaces declared in root `package.json`:
- `frameworks/*` - 26 individual framework packages (each with own `package.json`)
- `core` - Shared infrastructure package (`@institutional-reasoning/core`)
- `mcp-server` - MCP server package (`@institutional-reasoning/mcp-server`)

Each framework package depends only on `@institutional-reasoning/core`.

## Configuration

**TypeScript (`tsconfig.json`):**
- Target: ES2022
- Module: ESNext with `moduleResolution: bundler`
- Strict mode enabled
- `allowImportingTsExtensions: true` (required for Bun's `.ts` imports)
- `noEmit: true` (type checking only)
- Path aliases: `@core/*` → `./core/*`, `@frameworks/*` → `./frameworks/*`
- Types: `bun-types`
- Excludes: `node_modules`, POC directories

**Environment:**
- API keys read from `process.env` or `Bun.env` (see `core/config.ts`)
- No `.env` file present; keys must be set in shell environment
- MCP server config references `${ANTHROPIC_API_KEY}` via `mcp-server/claude-code-config.json`

**Build:**
- No transpile/bundle step for library use - Bun runs `.ts` files directly
- MCP server binary compilation: `cd mcp-server && bun run build`

## Platform Requirements

**Development:**
- Bun installed (latest)
- One of: `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, or `OPENROUTER_API_KEY` set in environment

**Production:**
- MCP server: Bun runtime or compiled binary
- CLI: Bun runtime (`#!/usr/bin/env bun` shebang in `cli.ts`)
- CI: Ubuntu latest via GitHub Actions with `oven-sh/setup-bun@v1`

---

*Stack analysis: 2026-03-16*
