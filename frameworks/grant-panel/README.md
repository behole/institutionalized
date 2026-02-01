# Grant Review Panel Framework

Comparative prioritization under resource constraints.

## Overview

The Grant Panel framework evaluates and ranks competing proposals:

- **Independent Scoring** - Each proposal evaluated against criteria
- **Comparative Analysis** - Proposals compared to each other
- **Budget Constraints** - Funding decisions within limits
- **Calibration** - Panel discussion to align scores

## Usage

### CLI

```bash
# Review and rank proposals
bun cli.ts grant-panel proposals.json

# Save funding decisions
bun cli.ts grant-panel proposals.json --output decisions.json
```

### Programmatic

```typescript
import { run } from "./frameworks/grant-panel";

const input = {
  proposals: [
    { id: "P1", title: "AI Healthcare", budget: 250000 },
    { id: "P2", title: "Climate Model", budget: 400000 }
  ],
  totalBudget: 500000,
  criteria: ["Scientific merit", "Feasibility", "Impact"]
};

const result = await run(input);

console.log("Ranking:", result.ranking.map(r => r.proposalId));
console.log("Funded:", result.fundingDecision.funded);
console.log("Allocated:", result.fundingDecision.totalAllocated);
```

## Output

```typescript
{
  reviews: {
    proposalId: string;
    scores: Record<string, number>;
    totalScore: number;
  }[];
  ranking: { proposalId: string; rank: number }[];
  fundingDecision: {
    funded: string[];
    totalAllocated: number;
    rationale: string;
  };
}
```

## Best For

- Research funding decisions
- Feature prioritization
- Resource allocation
- Portfolio optimization
- Investment decisions

## Cost

Typical cost: $0.10-0.20 (depends on proposal count)
