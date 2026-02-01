# Socratic Method Framework

Assumption testing through systematic questioning.

## Overview

The Socratic Method framework challenges claims through iterative questioning:

1. **Claim** - The statement or proposal being examined
2. **Questions** - Deep, probing questions surface assumptions
3. **Responses** - Each answer reveals more context
4. **Refined Understanding** - Clearer picture of the actual issue

## Usage

### CLI

```bash
# Challenge a claim
bun cli.ts socratic claim.md

# Deep analysis
bun cli.ts socratic claim.md --depth deep
```

### Programmatic

```typescript
import { run } from "./frameworks/socratic";

const input = {
  claim: "We need to rewrite in Rust for performance",
  context: ["Current: Python", "Team: 8 Python devs"]
};

const result = await run(input);

console.log("Assumptions exposed:", result.exposedAssumptions);
console.log("Core issue:", result.refinedUnderstanding.coreIssue);
```

## Output

```typescript
{
  claim: string;
  dialogue: {
    question: string;
    response: string;
    insight: string;
  }[];
  exposedAssumptions: string[];
  refinedUnderstanding: {
    coreIssue: string;
    revisedClaim: string;
  };
}
```

## Best For

- Requirements clarification
- Exposing hidden assumptions
- Decision validation
- Problem reframing
- Critical thinking

## Cost

Typical cost: $0.05-0.15 (depends on depth)
