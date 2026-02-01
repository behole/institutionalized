# War Gaming Framework

Military scenario testing for strategic planning.

## Overview

The War Gaming framework simulates competitive scenarios to test strategies:

- **Force Deployment** - Define opposing forces with strategies and resources
- **Turn-Based Simulation** - Multiple rounds of strategic moves
- **Control Assessment** - Neutral evaluation of game state
- **Strategic Insights** - Actionable lessons from simulation

## Usage

### CLI

```bash
# Simulate strategic scenario
bun cli.ts war-gaming scenario.json

# More turns for complex scenarios
bun cli.ts war-gaming scenario.json --max-turns 10

# Save simulation results
bun cli.ts war-gaming scenario.json --output results.json
```

### Programmatic

```typescript
import { run } from "./frameworks/war-gaming";

const scenario = {
  description: "Market entry against established competitor",
  context: [
    "Competitor has 70% market share",
    "Our product has superior AI features",
    "Limited marketing budget"
  ],
  objectives: ["Gain 10% market share", "Achieve profitability"]
};

const result = await run(scenario);

console.log("Forces:", result.forces.map(f => f.force.name));
console.log("Turns:", result.turns.length);
console.log("Insights:", result.insights.length);
```

## Output

```typescript
{
  scenario: {
    description: string;
    context: string[];
    objectives?: string[];
  };
  forces: {
    force: {
      name: string;
      strategy: string;
      resources: string[];
      constraints: string[];
    };
    initialPosition: string;
    openingMoves: string[];
  }[];
  turns: {
    turnNumber: number;
    forceActions: {
      forceName: string;
      action: string;
      rationale: string;
    }[];
    controlAssessment: string;
    emergingThreats: string[];
  }[];
  outcome: {
    winner?: string;
    draw: boolean;
    keyDecisions: string[];
  };
  insights: {
    insight: string;
    evidence: string[];
    applicability: string;
  }[];
}
```

## Best For

- Strategic planning
- Competitive analysis
- Scenario modeling
- Market entry planning
- Risk assessment

## Cost

Typical cost: $0.15-0.30 (depends on turns and forces)
