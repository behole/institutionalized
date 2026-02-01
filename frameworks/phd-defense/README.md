# PhD Defense Framework

Rigorous proposal validation with committee questioning.

## Overview

The PhD Defense framework subjects proposals to rigorous academic-style examination:

1. **Committee Formation** - Specialists in relevant domains
2. **Questioning** - Deep, challenging questions from multiple angles
3. **Defense** - Responses to each challenge
4. **Verdict** - Pass, pass with revisions, or fail

## Usage

### CLI

```bash
# Defend a proposal
bun cli.ts phd-defense proposal.md

# Larger committee for thorough review
bun cli.ts phd-defense proposal.md --committee-size 5
```

### Programmatic

```typescript
import { run } from "./frameworks/phd-defense";

const proposal = {
  title: "Novel Consensus Algorithm",
  abstract: "This research proposes...",
  methodology: "We combine...",
  contributions: ["New algorithm", "Theoretical proof", "Implementation"]
};

const result = await run(proposal);

console.log("Verdict:", result.verdict.decision);
console.log("Questions:", result.questions.length);
```

## Output

```typescript
{
  proposal: {
    title: string;
    abstract: string;
    methodology: string;
    contributions: string[];
  };
  committee: { name: string; specialty: string }[];
  questions: {
    question: string;
    committeeMember: string;
    category: string;
  }[];
  defense: {
    responses: { question: string; response: string }[];
  };
  verdict: {
    decision: "pass" | "pass_with_revisions" | "fail";
    rationale: string;
    requiredChanges?: string[];
  };
}
```

## Best For

- Technical proposals
- Research validation
- Architecture decisions
- Strategic initiatives
- Complex technical designs

## Cost

Typical cost: $0.10-0.20 (depends on committee size)
