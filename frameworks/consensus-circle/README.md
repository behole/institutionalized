# Consensus Circle Framework

Quaker-style consensus building without voting.

## Overview

The Consensus Circle framework builds genuine agreement:

- **Equal Voice** - All participants contribute
- **Iterative Rounds** - Multiple passes to converge
- **Concerns Integration** - Address blocking issues
- **Emergent Decision** - Agreement emerges naturally

## Usage

### CLI

```bash
# Build consensus
bun cli.ts consensus-circle topic.md

# Save consensus record
bun cli.ts consensus-circle topic.md --output consensus.json
```

### Programmatic

```typescript
import { run } from "./frameworks/consensus-circle";

const input = {
  topic: "Adopt 4-day work week?",
  context: ["Current: 5-day week", "Team: 25 people"],
  participants: ["Engineering", "Support", "HR", "Finance"]
};

const result = await run(input);

console.log("Consensus reached:", result.consensus.reached);
console.log("Rounds:", result.rounds.length);
if (result.consensus.reached) {
  console.log("Decision:", result.consensus.emergedDecision);
}
```

## Output

```typescript
{
  topic: string;
  rounds: {
    roundNumber: number;
    contributions: {
      participant: string;
      perspective: string;
    }[];
    synthesizedUnderstanding: string;
  }[];
  consensus: {
    reached: boolean;
    emergedDecision: string;
    blockingConcerns?: string[];
  };
}
```

## Best For

- High-stakes decisions
- Ethical questions
- When buy-in is critical
- Community decisions
- Stakeholder alignment

## Cost

Typical cost: $0.10-0.20 (depends on rounds)
