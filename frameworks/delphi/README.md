# Delphi Method Framework

Expert consensus building through iterative estimation.

## Overview

The Delphi method achieves consensus through structured iteration:

- **Anonymous Estimates** - Experts provide independent judgments
- **Feedback Rounds** - Share reasoning, revise estimates
- **Convergence** - Move toward group consensus
- **Outlier Documentation** - Preserve minority views

## Usage

### CLI

```bash
# Build expert consensus
bun cli.ts delphi question.json

# More rounds for better convergence
bun cli.ts delphi question.json --rounds 3
```

### Programmatic

```typescript
import { run } from "./frameworks/delphi";

const input = {
  question: "How many engineers needed in next 12 months?",
  context: ["Current: 15 engineers", "3x growth target"],
  rounds: 2
};

const result = await run(input);

console.log("Consensus:", result.consensus.finalEstimate);
console.log("Confidence:", result.consensus.confidence);
console.log("Rounds:", result.rounds.length);
```

## Output

```typescript
{
  question: string;
  rounds: {
    roundNumber: number;
    estimates: {
      expert: string;
      estimate: number;
      reasoning: string;
    }[];
  }[];
  consensus: {
    finalEstimate: number;
    confidence: string;
    outliers: string[];
  };
}
```

## Best For

- Forecasting
- Estimation tasks
- Expert consensus
- Uncertainty quantification
- Long-term planning

## Cost

Typical cost: $0.10-0.20 (depends on rounds and expert count)
