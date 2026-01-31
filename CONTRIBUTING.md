# Contributing to Institutional Reasoning

Thanks for your interest in contributing! This project aims to implement decision-making frameworks based on centuries-old human institutions.

## Ways to Contribute

### 1. Implement New Frameworks

See `frameworks-catalog.md` for the full list of 26 cataloged frameworks. 6+ frameworks remain unimplemented:

**Tier 3-4**:
- War Gaming
- Writers' Workshop
- Regulatory Impact Assessment
- Hegelian Dialectic
- Talmudic Dialectic
- Dissertation Committee

**How to add a framework**:

1. Create framework directory:
```bash
mkdir -p frameworks/your-framework
```

2. Create required files following the pattern:

**types.ts** - TypeScript interfaces:
```typescript
export interface YourFrameworkInput {
  // Input parameters
}

export interface YourFrameworkConfig {
  models: { ... };
  parameters: { ... };
}

export interface YourFrameworkResult {
  // Output structure
}

export const DEFAULT_CONFIG: YourFrameworkConfig = { ... };
```

**index.ts** - Main orchestration:
```typescript
import { createProvider } from "@core/providers";
import { getAPIKey } from "@core/config";
import { parseJSON, executeParallel } from "@core/orchestrator";
import type { LLMProvider } from "@core/types";

export async function run(
  input: YourFrameworkInput | { content: string },
  flags: Record<string, any> = {}
): Promise<YourFrameworkResult> {
  // 1. Parse input
  // 2. Setup provider
  // 3. Run agents (parallel/sequential)
  // 4. Synthesize results
  // 5. Return structured output
}

export * from "./types";
```

**package.json**:
```json
{
  "name": "@institutional-reasoning/your-framework",
  "version": "0.1.0",
  "description": "Your framework description",
  "type": "module",
  "main": "./index.ts",
  "dependencies": {
    "@institutional-reasoning/core": "workspace:*"
  }
}
```

3. Add to CLI in `cli.ts`:
```typescript
const FRAMEWORKS = {
  // ...existing frameworks
  "your-framework": "Brief description",
}
```

4. Add to MCP server in `mcp-server/index.ts` (follow existing pattern)

5. Create example in `examples/your-framework/`

6. Test:
```bash
bun cli.ts your-framework examples/your-framework/example.json --verbose
```

### 2. Improve Existing Frameworks

- Add better prompts
- Improve error handling
- Add validation
- Optimize performance
- Enhance output formats

### 3. Add Tests

We need comprehensive testing! See `test/` (to be created).

### 4. Documentation

- Framework-specific READMEs
- Usage examples
- Architecture documentation
- Video walkthroughs

### 5. Core Infrastructure

Improvements to shared code:
- Better observability
- Additional providers
- Enhanced orchestration patterns
- Performance optimizations

## Development Setup

```bash
# Clone repo
git clone https://github.com/[username]/institutional-reasoning
cd institutional-reasoning

# Install dependencies
bun install

# Run examples
bun cli.ts courtroom examples/courtroom/merge-pr.json --verbose

# Test MCP server
cd mcp-server
bun run dev
```

## Framework Design Principles

1. **Faithful to Original**: Research the real-world institution and model its actual patterns
2. **Multi-Agent**: Use multiple LLM agents with distinct roles/perspectives
3. **Structured Output**: Return well-defined TypeScript interfaces, not freeform text
4. **Observable**: Full audit trails with cost tracking
5. **Configurable**: Allow customization of models, parameters, agent counts
6. **Composable**: Use shared core patterns (executeParallel, parseJSON, etc.)

## Code Style

- TypeScript with strict types
- Use Bun runtime
- Follow existing patterns in frameworks/
- Add JSDoc comments for exported functions
- Use meaningful variable names
- Keep files focused (types, agents, orchestration)

## Research Sources

When implementing a framework, cite sources:
- Academic papers on the institution
- Practitioner handbooks
- Example transcripts/protocols
- Modern adaptations

Add references to framework README or types.ts header.

## Pull Request Process

1. Fork the repo
2. Create feature branch: `git checkout -b add-war-gaming-framework`
3. Implement following patterns above
4. Test thoroughly with examples
5. Update documentation
6. Submit PR with:
   - Clear description of framework
   - Example usage
   - Any research sources
   - Screenshots/output samples

## Questions?

- Open an issue for discussion
- Tag with `new-framework`, `enhancement`, or `documentation`
- Include examples of what you're trying to achieve

## Code of Conduct

Be respectful, collaborative, and constructive. We're building tools to help humans make better decisions.

## License

By contributing, you agree your contributions will be licensed under MIT.
