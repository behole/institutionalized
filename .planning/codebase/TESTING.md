# Testing Patterns

**Analysis Date:** 2026-03-16

## Test Framework

**Runner:**
- Bun's built-in test runner (no separate jest/vitest dependency)
- Config: none — Bun discovers `*.test.ts` and `*.e2e.test.ts` files automatically
- TypeScript types: `@types/bun` and `bun-types` in devDependencies

**Assertion Library:**
- Bun's built-in `expect` — Jest-compatible API

**Run Commands:**
```bash
bun test                        # Run all tests
bun test test/core              # Unit tests only (fast, no LLM calls)
bun test test/frameworks        # E2E tests only (requires ANTHROPIC_API_KEY)
bun test --watch                # Watch mode
bun test --coverage             # Coverage report
bun test --verbose              # Verbose output
bun tsc --noEmit                # Type check (run as: bun run typecheck)
```

## Test File Organization

**Location:**
- Separate `test/` directory at project root — not co-located with source files

**Naming:**
- Unit tests: `[module].test.ts` (e.g., `validators.test.ts`, `orchestrator.test.ts`)
- E2E tests: `[framework-name].e2e.test.ts` (e.g., `courtroom.e2e.test.ts`, `pre-mortem.e2e.test.ts`)

**Structure:**
```
test/
├── core/                         # Unit tests — no LLM calls, deterministic
│   ├── orchestrator.test.ts
│   └── validators.test.ts
└── frameworks/                   # E2E tests — live LLM calls, 30–120s each
    ├── courtroom.e2e.test.ts
    ├── peer-review.e2e.test.ts
    ├── pre-mortem.e2e.test.ts
    └── [24 more framework e2e tests...]
```

## Test Structure

**Suite Organization:**
```typescript
import { describe, test, expect, beforeAll } from "bun:test";

describe("Module or Framework Name", () => {
  // E2E tests add API key guard here
  beforeAll(() => {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY must be set for E2E tests");
    }
  });

  test("should [expected behavior]", async () => {
    // arrange → act → assert
  }, timeoutMs); // timeout required for E2E tests
});
```

**Patterns:**
- `describe` blocks named after the module class or "Framework Name E2E"
- Test names always start with "should ..." describing observable behavior
- `beforeAll` used in E2E suites to guard on env var presence — throws to fail the suite
- Timeout passed as second argument to `test()`: `}, 60000)` — required for all E2E tests

## Mocking

**Framework:** None — Bun's built-in mock utilities are not used in this codebase

**Unit Test Approach:**
- No mocking of dependencies; unit tests call real functions directly
- Timing assertions use `Bun.sleep()` to simulate async work and verify parallelism:
```typescript
test("should execute tasks in parallel", async () => {
  const startTime = Date.now();
  const tasks = [
    async () => { await Bun.sleep(100); return "task1"; },
    async () => { await Bun.sleep(100); return "task2"; },
  ];
  const results = await executeParallel(tasks);
  const duration = Date.now() - startTime;
  expect(duration).toBeLessThan(200); // parallel, not 200ms
});
```

**E2E Test Approach:**
- No mocking — tests call live LLM APIs with real `ANTHROPIC_API_KEY`
- Framework functions imported directly from source: `import { run } from "../../frameworks/courtroom"`

**What to Mock:**
- Nothing currently mocked; Bun.sleep used instead of timers for concurrency tests

**What NOT to Mock:**
- LLM API calls in E2E tests — the point is real integration verification

## Fixtures and Factories

**Test Data:**
- Inline objects defined directly in each test case — no shared fixtures files
```typescript
const input = {
  question: "Should we use TypeScript for this project?",
  context: [
    "Team already knows JavaScript",
    "TypeScript adds compile-time safety",
    "Project is small and short-term",
  ],
};
```

**E2E Config Override Pattern:**
```typescript
const result = await run(input, {
  config: {
    parameters: {
      jurySize: 3, // Smaller jury for faster testing
    },
  },
});
```

**Location:**
- No shared fixture files; all test data is inline per test

## Coverage

**Requirements:** No enforced minimum coverage threshold

**View Coverage:**
```bash
bun test --coverage
```

**Current Coverage (per test/README.md):**
- Core library: `core/orchestrator.ts`, `core/validators.ts`
- Frameworks: all 26 frameworks have E2E test files in `test/frameworks/`
- Not covered: `core/providers/`, `core/observability.ts`, `core/config.ts`, `cli.ts`, `mcp-server/index.ts`

## Test Types

**Unit Tests (`test/core/`):**
- Scope: pure functions in core library — no I/O, no LLM calls
- Approach: call function directly, assert return value or thrown error
- Speed: < 1 second total
- Examples: `validateQuote`, `validateSubstantive`, `executeParallel`, `parseJSON`

**E2E Tests (`test/frameworks/`):**
- Scope: full framework execution against live LLM API
- Approach: call `run(input, config)`, verify output shape and key field values
- Speed: 30–120 seconds per test; timeouts set per test explicitly
- Assertion style: verify structure (types, array lengths, enum values) not exact LLM content

## Common Patterns

**Async Testing (E2E):**
```typescript
test("should render verdict for simple case", async () => {
  const result = await run(input, { config: { parameters: { jurySize: 3 } } });
  expect(result).toBeDefined();
  expect(result.verdict.decision).toMatch(/guilty|not_guilty|dismissed/);
}, 60000); // Always pass timeout as second arg
```

**Error Testing (Unit):**
```typescript
test("should fail when quote is not found in source", () => {
  expect(() => validateQuote(quote, source)).toThrow("Quote not found in source");
});

test("should handle task failures gracefully", async () => {
  await expect(executeParallel(tasks)).rejects.toThrow("task failed");
});
```

**Enum/Union Value Assertion:**
```typescript
// Use toMatch with regex for string union types
expect(result.verdict.decision).toMatch(/guilty|not_guilty|dismissed/);
expect(scenario.likelihood).toMatch(/low|medium|high/);

// Use toContain for array membership
expect(["accept", "minor_revision", "major_revision", "reject"]).toContain(review.recommendation);
```

**Array Structure Assertion:**
```typescript
expect(Array.isArray(result.jury.jurors)).toBe(true);
expect(result.jury.jurors.length).toBe(3);
result.jury.jurors.forEach((juror) => {
  expect(juror.vote).toMatch(/guilty|not_guilty|abstain/);
  expect(juror.reasoning).toBeDefined();
});
```

**Diversity / Non-Determinism Testing:**
```typescript
// Test that LLM outputs are diverse, not just check exact values
const uniqueScenarios = new Set(scenarios);
expect(uniqueScenarios.size).toBeGreaterThan(2);
expect(new Set(likelihoods).size).toBeGreaterThan(1);
```

**Structural Consistency Across Runs:**
```typescript
const result1 = await run(input, config);
const result2 = await run(input, config);
expect(Object.keys(result1).sort()).toEqual(Object.keys(result2).sort());
```

**E2E Console Output:**
```typescript
// Each E2E test logs a summary for manual inspection
console.log("\n✅ Courtroom E2E Test Result:");
console.log(`   Question: ${result.case.question}`);
console.log(`   Verdict: ${result.verdict.decision}`);
```

## CI Integration

Tests run on pull requests and main branch commits via `.github/workflows/test.yml`.
E2E tests only run when `ANTHROPIC_API_KEY` is available in CI secrets; skipped on forks.
Unit tests (`bun test test/core`) always run; E2E tests (`bun test test/frameworks`) are environment-gated.

---

*Testing analysis: 2026-03-16*
