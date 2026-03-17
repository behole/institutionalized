---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: planning
stopped_at: Phase 2 context gathered
last_updated: "2026-03-17T01:38:14.310Z"
last_activity: 2026-03-16 — Roadmap created, all 29 requirements mapped across 6 phases
progress:
  total_phases: 6
  completed_phases: 1
  total_plans: 5
  completed_plans: 5
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-16)

**Core value:** Every framework must produce genuinely better reasoning than a single LLM call — the institutional structure is the point.
**Current focus:** Phase 1 — Core Hardening

## Current Position

Phase: 1 of 6 (Core Hardening)
Plan: 0 of TBD in current phase
Status: Ready to plan
Last activity: 2026-03-16 — Roadmap created, all 29 requirements mapped across 6 phases

Progress: [░░░░░░░░░░] 0%

## Performance Metrics

**Velocity:**
- Total plans completed: 0
- Average duration: —
- Total execution time: 0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| - | - | - | - |

**Recent Trend:**
- Last 5 plans: —
- Trend: —

*Updated after each plan completion*
| Phase 01-core-hardening P01 | 137 | 2 tasks | 5 files |
| Phase 01-core-hardening P02 | 8 | 2 tasks | 5 files |
| Phase 01-core-hardening P03 | 4 | 2 tasks | 7 files |
| Phase 01-core-hardening P04 | 12 | 2 tasks | 55 files |
| Phase 01-core-hardening P05 | 5 | 2 tasks | 4 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Roadmap]: Fix Anthropic system message bug BEFORE upgrading @anthropic-ai/sdk — blast radius is all 26 frameworks simultaneously
- [Roadmap]: Capture courtroom output fixtures before refactoring — most tech-debt-laden framework
- [Roadmap]: Phase 6 (Skill) can run in parallel with Phase 5 (npm) once Phase 3 (Registry) is complete
- [Phase 01-core-hardening]: ErrorCode uses const object pattern (not enum keyword) for ES module compatibility
- [Phase 01-core-hardening]: ProviderError.cause required (non-optional) to enforce upstream cause preservation
- [Phase 01-core-hardening]: Fix Anthropic system prompt bug FIRST (5d84ffa), then upgrade SDK (73510e5) — two bisectable commits
- [Phase 01-core-hardening]: Remove openai SDK package — OpenAI provider uses raw fetch, SDK not needed
- [Phase 01-core-hardening]: withRetry baseDelayMs overridable for test-speed (no fake timers needed)
- [Phase 01-core-hardening]: Bun toSatisfy() incompatible with rejects chain — use try/catch + toBeInstanceOf instead
- [Phase 01-core-hardening]: executeParallel uses Promise.allSettled + AggregateError (all-complete) replacing Promise.all fail-fast
- [Phase 01-core-hardening]: RunFlags interface maps flags.verbose to flags.debug — debug is the typed public API name for verbose logging
- [Phase 01-core-hardening]: CLI-specific flags accessed via (flags as Record<string, unknown>) cast to maintain typed run() signature while preserving CLI contract
- [Phase 01-core-hardening]: DEFAULT_MODELS uses 'as const' assertion — all values are string literals, enabling exhaustive type-safe model references
- [Phase 01-core-hardening]: Keep OpenAIChatResponse and OpenRouterChatResponse as co-located interfaces (not shared) to avoid cross-file coupling for simple DTOs
- [Phase 01-core-hardening]: Rename local formCommittee to formDefaultCommittee — import from ./committee is the intended runtime function, local was shadowing it

### Pending Todos

None yet.

### Blockers/Concerns

- [Phase 4]: Bun mock injection patterns need verification against current Bun 1.x docs before writing MockLLMProvider
- [Phase 5]: Verify current stable versions of tsup, publint, @arethetypeswrong/cli before pinning in build script
- [Phase 6]: Confirm ANTHROPIC_API_KEY passthrough mechanism in Claude Code skill subprocess invocation before writing skill instructions

## Session Continuity

Last session: 2026-03-17T01:38:14.301Z
Stopped at: Phase 2 context gathered
Resume file: .planning/phases/02-framework-standardization/02-CONTEXT.md
