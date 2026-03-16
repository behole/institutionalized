# Institutional Reasoning

## What This Is

A TypeScript library of 26 multi-agent reasoning frameworks modeled on real-world institutional decision-making processes (courtroom debates, peer review, red-blue team, pre-mortem, etc.). Each framework orchestrates multiple LLM "agents" in structured roles to produce higher-quality analysis than a single prompt. Available as a library, CLI, MCP server, and Claude Code skill.

## Core Value

Every framework must produce genuinely better reasoning than a single LLM call — the institutional structure is the point, not the novelty.

## Requirements

### Validated

<!-- Shipped and confirmed valuable. -->

- ✓ 26 institutional reasoning frameworks implemented — existing
- ✓ Multi-provider LLM support (Anthropic, OpenAI, OpenRouter) — existing
- ✓ CLI entry point (`bun cli.ts <framework> <input>`) — existing
- ✓ MCP server exposing all frameworks as tools — existing
- ✓ Shared core layer with provider abstraction, orchestration primitives, validation, observability — existing
- ✓ Audit trail with cost tracking per run — existing
- ✓ Bun workspace monorepo structure — existing
- ✓ Unit + E2E test suite — existing
- ✓ GitHub Actions CI/CD — existing

### Active

<!-- Current scope. Building toward these. -->

- [ ] All 26 frameworks follow consistent code patterns, types, and error handling
- [ ] Real error handling — graceful failures, retries, meaningful error messages
- [ ] Full TypeScript strictness — no `any` types, proper generics, exported type definitions
- [ ] Tests that verify actual behavior, not just "did it throw"
- [ ] Claude Code skill with guided framework selection ("What kind of decision are you facing?")
- [ ] Skill defaults to Claude Code's own model, with optional API key override for power users
- [ ] Skill streams key findings inline and saves full structured report to file
- [ ] Published npm package with clean exports, proper versioning, README
- [ ] Dead code removal — no stubs, placeholders, or unused exports
- [ ] Proper package.json metadata (author, repository URL, exports map)

### Out of Scope

<!-- Explicit boundaries. Includes reasoning to prevent re-adding. -->

- Web UI / dashboard — this is a library/skill, not a product with a frontend
- Real-time streaming of individual agent responses — complexity not worth it for v1
- Custom framework builder — users use the 26 built-in frameworks
- Persistent state / database — each invocation is stateless by design
- Per-framework skills (`/courtroom`, `/pre-mortem`) — one unified `/institutionalized` skill handles routing

## Context

This is a brownfield project on the `lite` branch. The `lite` branch stripped out standalone POC directories (courtroom-poc, peer-review-poc, etc.) and consolidated everything into the unified monorepo structure. The codebase is functional but inconsistent — frameworks were built at different times and don't all follow the same patterns. Some frameworks use `FrameworkRunner` from core, others call providers directly. Error handling is mostly "throw and let CLI catch." Tests exist but E2E tests all require API keys and unit tests are thin.

The repo has been idle since mid-February 2026. Dependencies are outdated (`@anthropic-ai/sdk` at `^0.32.1`, current is 0.50+). TypeScript isn't a direct devDependency (typecheck script is broken). The `openai` npm package is declared but the OpenAI provider uses raw `fetch` instead.

The skill vision: a single `/institutionalized` entry point that asks the user what kind of decision they're facing, recommends the right framework, then runs it — streaming key findings inline and saving the full report to a file. Defaults to using Claude Code's own model (no API key needed), with an option to use external APIs for power users who want model control.

## Constraints

- **Runtime**: Bun — all tooling, testing, and execution uses Bun
- **Package Manager**: Bun (never npm/yarn/pnpm)
- **Language**: TypeScript with strict mode
- **Skill Platform**: Claude Code skill system (SKILL.md format)
- **Backward Compatibility**: Existing `run()` contract per framework must be preserved — CLI and MCP depend on it

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Single `/institutionalized` skill vs per-framework skills | Simpler onboarding, guided discovery of the right framework | — Pending |
| Default to Claude Code model, optional API override | Zero-friction for most users, power users can still choose models | — Pending |
| Polish all 26 frameworks, not a curated subset | Pride in craft — no half-baked frameworks in the library | — Pending |
| Inline findings + file report for skill output | Best of both worlds — quick answer in chat, full details on disk | — Pending |

---
*Last updated: 2026-03-16 after initialization*
