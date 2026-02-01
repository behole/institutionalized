# Parliamentary Debate Framework

Adversarial policy discussion with formal structure.

## Overview

The Parliamentary framework structures policy debates:

- **Government** - Proposes and defends the motion
- **Opposition** - Challenges and counters
- **Backbenchers** - Additional perspectives
- **Formal Vote** - Recorded decision

## Usage

### CLI

```bash
# Debate a policy
bun cli.ts parliamentary motion.md

# More backbenchers for richer debate
bun cli.ts parliamentary motion.md --backbenchers 5

# Save debate record
bun cli.ts parliamentary motion.md --output debate.json
```

### Programmatic

```typescript
import { run } from "./frameworks/parliamentary";

const input = {
  motion: "Adopt open-source first policy for internal tools",
  context: ["Current: Mix of tools", "Cost savings potential: $200K/year"]
};

const result = await run(input);

console.log("Outcome:", result.vote.outcome);
console.log("Ayes:", result.vote.ayes);
console.log("Noes:", result.vote.noes);
```

## Output

```typescript
{
  motion: string;
  government: {
    case: string;
    arguments: string[];
  };
  opposition: {
    rebuttal: string;
    counterArguments: string[];
  };
  backbenchers: {
    perspective: string;
    leaning: "government" | "opposition" | "neutral";
  }[];
  vote: {
    ayes: number;
    noes: number;
    abstentions: number;
    outcome: "passed" | "rejected" | "tied";
  };
  debateRecord: string[];
}
```

## Best For

- Policy decisions
- Strategic direction debates
- Feature go/no-go decisions
- Team alignment
- Formal decision-making

## Cost

Typical cost: $0.10-0.20 (depends on backbencher count)
