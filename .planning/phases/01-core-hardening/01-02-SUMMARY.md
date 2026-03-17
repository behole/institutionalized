---
phase: 01-core-hardening
plan: 02
subsystem: api
tags: [anthropic, llm-provider, typescript, testing, bun-test]

# Dependency graph
requires: []
provides:
  - Fixed AnthropicProvider that sends system prompts via top-level system parameter
  - Provider unit tests with mock client verifying correct API call shape
  - @anthropic-ai/sdk upgraded to ^0.79.0
  - openai package removed from dependencies
affects:
  - All 26 frameworks that use AnthropicProvider
  - Any future provider implementations (establishes test pattern)

# Tech tracking
tech-stack:
  added: ["@anthropic-ai/sdk@0.79.0"]
  patterns:
    - "Mock SDK client in tests using bun mock.module() to capture call arguments"
    - "System prompt as top-level param: client.messages.create({ system: systemPrompt, messages: [...] })"

key-files:
  created:
    - test/core/providers.test.ts
  modified:
    - core/providers/anthropic.ts
    - package.json
    - bun.lock
    - .gitignore

key-decisions:
  - "Fix bug first (commit 5d84ffa), then upgrade SDK (commit 73510e5) — two bisectable commits"
  - "Remove openai SDK package — OpenAI provider uses raw fetch, SDK is unused weight"
  - "stop_reason null coercion: response.stop_reason ?? undefined to match LLMResponse metadata type"

patterns-established:
  - "Provider tests: mock the SDK client at module level, capture call arguments, verify shape"
  - "Anthropic system prompt pattern: pass as top-level system param, filter system roles from messages array"

requirements-completed: [PROV-01, PROV-05]

# Metrics
duration: 8min
completed: 2026-03-17
---

# Phase 1 Plan 02: Anthropic Provider Fix and SDK Upgrade Summary

**Anthropic provider corrected to send system prompts via top-level system parameter (not mangled to user role), SDK upgraded from 0.32.1 to 0.79.0, openai package removed**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-17T00:17:50Z
- **Completed:** 2026-03-17T00:25:45Z
- **Tasks:** 2
- **Files modified:** 4 (+ 1 created)

## Accomplishments

- Fixed PROV-01: system prompts now sent as top-level `system` parameter to Anthropic API, fixing all 26 frameworks
- Wrote 4 provider unit tests with mock Anthropic client verifying correct call shape and LLMResponse mapping
- Upgraded @anthropic-ai/sdk from ^0.32.1 to ^0.79.0 (landed at 0.79.0)
- Removed unused openai SDK package, tightening dependency surface

## Task Commits

Each task was committed atomically:

1. **RED: Failing tests** - `9c55589` (test) — providers.test.ts + .gitignore fix
2. **GREEN: Fix system message bug (PROV-01)** - `5d84ffa` (feat)
3. **SDK upgrade + type fix (PROV-05)** - `73510e5` (feat)

_Note: TDD task produced test commit then implementation commit_

## Files Created/Modified

- `test/core/providers.test.ts` - Provider unit tests mocking Anthropic SDK, 4 tests verifying system prompt placement and LLMResponse shape
- `core/providers/anthropic.ts` - Bug fix: system param top-level, filter system roles, stop_reason null coercion, updated pricing table with Claude 4.x models
- `package.json` - @anthropic-ai/sdk bumped to ^0.79.0, openai removed
- `bun.lock` - Updated lockfile
- `.gitignore` - Removed *.test.ts exclusion rule (auto-fix)

## Decisions Made

- Two separate commits for bug fix vs SDK upgrade — bisectability in case SDK upgrade introduces regressions
- `stop_reason ?? undefined` coercion: new SDK types `stop_reason` as `StopReason | null` but `LLMResponse.metadata.stopReason` is `string | undefined`; null coercion avoids type widening
- Pricing table updated with Claude 4.x entries (claude-opus-4-5, claude-sonnet-4-5) and claude-3-5-haiku-20241022

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed *.test.ts from .gitignore**
- **Found during:** Task 1 (RED commit attempt)
- **Issue:** .gitignore contained `*.test.ts` preventing test files from being staged. This meant provider tests (and all existing test files) were not tracked in git, making TDD commits impossible.
- **Fix:** Removed `*.test.js` and `*.test.ts` lines from .gitignore; kept `coverage/` exclusion
- **Files modified:** .gitignore
- **Verification:** `git add test/core/providers.test.ts` succeeded after fix
- **Committed in:** 9c55589 (RED test commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 — bug in project configuration)
**Impact on plan:** Essential fix; test files must be tracked for TDD workflow. No scope creep.

## Issues Encountered

- Typecheck revealed pre-existing errors in openai.ts, openrouter.ts, frameworks/delphi, and frameworks/dissertation-committee. These are out-of-scope for this plan (pre-existing issues unrelated to current changes). Logged to deferred-items for Phase 1 later plans.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- AnthropicProvider is now correct and tested — safe to use across all frameworks
- Provider test pattern established (mock SDK at module level) for OpenAI and OpenRouter tests in future plans
- Pre-existing type errors in other providers and frameworks are known and documented

## Self-Check: PASSED

All files and commits verified present.

---
*Phase: 01-core-hardening*
*Completed: 2026-03-17*
