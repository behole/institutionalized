# Hegelian Dialectic Framework

Thesis-antithesis-synthesis for resolving contradictions.

## Overview

The Hegelian framework achieves higher-order understanding through dialectic:

1. **Thesis** - Initial position with supporting arguments
2. **Antithesis** - Genuine opposition with counter-arguments
3. **Synthesis** - Integration that transcends both

## Usage

### CLI

```bash
# Resolve contradictory positions
bun cli.ts hegelian problem.json

# Save dialectical analysis
bun cli.ts hegelian problem.json --output synthesis.json
```

### Programmatic

```typescript
import { run } from "./frameworks/hegelian";

const input = {
  context: "Build vs buy decision",
  thesis: "Build in-house for control and customization",
  constraints: ["Limited budget", "6-month deadline"]
};

const result = await run(input);

console.log("Thesis:", result.thesis.position);
console.log("Antithesis:", result.antithesis.position);
console.log("Synthesis:", result.synthesis.integratedPosition);
console.log("New insights:", result.synthesis.transcendsBoth);
```

## Output

```typescript
{
  problem: {
    context: string;
    thesis: string;
  };
  thesis: {
    position: string;
    rationale: string;
    supportingArguments: string[];
    underlyingAssumptions: string[];
  };
  antithesis: {
    position: string;
    rationale: string;
    counterArguments: string[];
    contradictionsIdentified: string[];
  };
  synthesis: {
    integratedPosition: string;
    howItResolves: string;
    preservesFromThesis: string[];
    preservesFromAntithesis: string[];
    transcendsBoth: string[];
  };
}
```

## Best For

- Resolving contradictions
- Finding third-way solutions
- Integrative thinking
- Breaking false dichotomies
- Complex trade-off decisions

## Cost

Typical cost: $0.10-0.15
