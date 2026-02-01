# Pre-Mortem Framework

Identify failure modes before committing to a plan.

## Overview

The Pre-Mortem framework imagines a project has already failed and works backward to identify what went wrong. This "prospective hindsight" reveals risks that traditional planning might miss.

## Usage

### CLI

```bash
# Analyze a plan before execution
bun cli.ts pre-mortem plan.md

# More pessimists for thorough analysis
bun cli.ts pre-mortem plan.md --pessimists 7

# Save failure scenarios
bun cli.ts pre-mortem plan.md --output risks.json
```

### Programmatic

```typescript
import { run } from "./frameworks/pre-mortem";

const plan = {
  project: "Launch new mobile app",
  timeline: "3 months",
  team_size: 5,
  budget: "$200K"
};

const result = await run(plan);

console.log(`Identified ${result.failure_scenarios.length} failure modes`);
console.log("Top risks:", result.ranked_scenarios.slice(0, 3));
console.log("Mitigations:", result.mitigation_strategies);
```

## Output

```typescript
{
  plan: {
    project: string;
    context: string[];
  };
  failure_scenarios: {
    scenario: string;
    likelihood: "high" | "medium" | "low";
    impact: "critical" | "high" | "medium" | "low";
    early_warnings: string[];
  }[];
  ranked_scenarios: FailureScenario[]; // Sorted by risk score
  mitigation_strategies: {
    scenario: string;
    preventions: string[];
    contingencies: string[];
  }[];
  go_no_go: {
    recommendation: "proceed" | "proceed_with_caution" | "delay" | "cancel";
    rationale: string;
    critical_assumptions: string[];
  };
}
```

## Process

1. **Imagine failure** - "It's 6 months from now and the project failed"
2. **Generate scenarios** - Multiple pessimists identify failure modes
3. **Rank by risk** - Likelihood × Impact scoring
4. **Develop mitigations** - Prevention and contingency plans
5. **Make decision** - Proceed, delay, or cancel with eyes open

## Best For

- High-stakes project launches
- Strategic initiatives
- Major investments
- Go/no-go decisions
- Risk assessment

## When to Use

- Before committing significant resources
- When stakes are high
- When failure would be costly
- For complex, uncertain projects

## Cost

Typical cost: $0.05-0.15 (depends on pessimist count and plan complexity)
