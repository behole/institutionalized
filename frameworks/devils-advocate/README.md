# Devil's Advocate Framework

Formal challenge to proposals to test assumptions and surface risks.

## Overview

The Devil's Advocate framework provides structured opposition to test the strength of a proposal:

1. **Proposal** - The plan or decision being evaluated
2. **Challenge** - Systematic counter-arguments and risk identification
3. **Arbiter Assessment** - Balanced evaluation of viability

## Usage

### CLI

```bash
# Challenge a proposal
bun cli.ts devils-advocate proposal.md

# Save analysis
bun cli.ts devils-advocate proposal.md --output challenge.json
```

### Programmatic

```typescript
import { run } from "./frameworks/devils-advocate";

const input = {
  proposal: "Rewrite our backend in Rust",
  context: ["Current: Python/Django", "Team: 8 Python devs", "No Rust experience"]
};

const result = await run(input);

console.log("Viability:", result.arbiterAssessment.viability);
console.log("Counter-arguments:", result.challenge.counterArguments);
```

## Output

```typescript
{
  proposal: string;
  challenge: {
    opposition: string;
    counterArguments: string[];
    risks: string[];
    assumptionsChallenged: string[];
  };
  arbiterAssessment: {
    viability: "viable" | "needs_revision" | "flawed";
    rationale: string;
    refinedProposal: string;
  };
}
```

## Best For

- Challenging optimistic plans
- Testing conviction
- Avoiding groupthink
- Risk identification
- Decision validation

## Cost

Typical cost: $0.05-0.10
