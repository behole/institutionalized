# Test Suite

Comprehensive test suite for Institutional Reasoning frameworks.

## Structure

```
test/
├── core/              # Unit tests for core library
│   ├── orchestrator.test.ts
│   └── validators.test.ts
├── frameworks/        # E2E tests for frameworks
│   ├── courtroom.e2e.test.ts
│   ├── six-hats.e2e.test.ts
│   └── pre-mortem.e2e.test.ts
└── e2e/              # Full end-to-end integration tests
```

## Running Tests

### All Tests
```bash
# Run all tests (unit + e2e)
bun test

# Run with coverage
bun test --coverage
```

### Unit Tests Only
```bash
# Fast tests that don't call LLMs
bun test test/core
```

### E2E Tests Only
```bash
# Requires ANTHROPIC_API_KEY
export ANTHROPIC_API_KEY=sk-ant-...
bun test test/frameworks

# Run specific framework
bun test test/frameworks/courtroom.e2e.test.ts
```

### Watch Mode
```bash
bun test --watch
```

## Test Types

### Unit Tests (`test/core/`)
- **No LLM calls** - Fast, deterministic
- Test core library functions in isolation
- Examples: orchestrator, validators, parsers
- Run time: < 1 second

### E2E Tests (`test/frameworks/`)
- **Actual LLM calls** - Slow, non-deterministic
- Test full framework execution end-to-end
- Verify structure, behavior, and output quality
- Run time: 30-120 seconds per test
- **Requires API key**

## Writing Tests

### Unit Test Example
```typescript
import { describe, test, expect } from "bun:test";
import { parseJSON } from "@core/orchestrator";

describe("parseJSON", () => {
  test("should extract JSON from markdown", () => {
    const input = '```json\n{"key": "value"}\n```';
    const result = parseJSON(input);
    expect(result).toEqual({ key: "value" });
  });
});
```

### E2E Test Example
```typescript
import { describe, test, expect, beforeAll } from "bun:test";
import { run } from "../../frameworks/courtroom";

describe("Courtroom E2E", () => {
  beforeAll(() => {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error("API key required");
    }
  });

  test("should render verdict", async () => {
    const result = await run({
      charge: "Should we use TypeScript?",
      evidence: ["Type safety", "Learning curve"]
    });

    expect(result.verdict.decision).toMatch(/guilty|not_guilty/);
  }, 60000); // 60s timeout
});
```

## Environment Variables

```bash
# Required for E2E tests
export ANTHROPIC_API_KEY=sk-ant-...

# Optional for provider testing
export OPENAI_API_KEY=sk-...
export OPENROUTER_API_KEY=sk-or-...
```

## Test Coverage

Current coverage:
- **Core Library**: orchestrator.ts, validators.ts
- **Frameworks**: courtroom, six-hats, pre-mortem

To add:
- [ ] Core: providers.ts, observability.ts, config.ts
- [ ] Frameworks: remaining 17 frameworks
- [ ] CLI: cli.ts argument parsing
- [ ] MCP Server: mcp-server/index.ts

## CI/CD Integration

Tests run automatically on:
- Pull requests
- Main branch commits
- Release tags

E2E tests run only when:
- API keys are available (in CI secrets)
- On main branch or release branches
- Skipped on forks for security

## Debugging Failed Tests

### Unit Test Failures
```bash
# Run specific test
bun test test/core/orchestrator.test.ts

# Verbose output
bun test --verbose

# Watch for changes
bun test test/core/orchestrator.test.ts --watch
```

### E2E Test Failures
```bash
# Enable verbose logging in framework
const result = await run(input, { verbose: true });

# Check API key
echo $ANTHROPIC_API_KEY

# Increase timeout for slow LLM calls
test("should work", async () => {
  // test code
}, 120000); // 120 seconds
```

## Best Practices

1. **Unit tests should be fast** - No LLM calls, no network requests
2. **E2E tests should be thorough** - Test real behavior with real LLMs
3. **Use timeouts** - E2E tests need 30-120s for LLM calls
4. **Test structure, not content** - LLM outputs vary, test shapes not exact text
5. **Use beforeAll for setup** - Check API keys, initialize providers
6. **Clean test data** - Don't pollute real data sources

## Maintenance

- Add tests for new frameworks
- Update tests when framework APIs change
- Keep E2E tests focused on critical paths
- Archive or skip slow tests if needed
