# Courtroom Framework

Adversarial evaluation for binary decisions using prosecution, defense, jury, and judge roles.

## Overview

The Courtroom framework simulates a legal trial to evaluate binary decisions:

1. **Prosecution** - Builds a case for the affirmative position
2. **Defense** - Mounts counter-arguments and challenges evidence
3. **Jury** - Multiple jurors deliberate and vote independently
4. **Judge** - Renders final verdict based on jury findings

## Usage

### CLI

```bash
# Basic evaluation
bun cli.ts courtroom case.json

# Specify jury size
bun cli.ts courtroom case.json --jury-size 7

# Save results
bun cli.ts courtroom case.json --output verdict.json --verbose
```

### Programmatic

```typescript
import { run } from "./frameworks/courtroom";

const case_input = {
  question: "Should we merge this PR?",
  context: [
    "Adds new authentication feature",
    "2000 lines of code changed",
    "No tests included",
    "Security review pending"
  ]
};

const result = await run(case_input);

console.log(`Verdict: ${result.verdict.decision}`);
console.log(`Jury votes: ${result.jury.guiltyCount} guilty, ${result.jury.notGuiltyCount} not guilty`);
```

## Input Format

```typescript
{
  question: string;        // The binary decision to evaluate
  context: string[];       // Background information and evidence
  evidence?: {             // Optional structured evidence
    sourceQuote: string;
    targetQuote: string;
    harm: string;
  }[];
}
```

## Output

```typescript
{
  case: Case;
  prosecution: {
    caseStatement: string;
    exhibits: Exhibit[];
    harmAnalysis: string;
  };
  defense: {
    counterArgument: string;
    exhibitChallenges: { exhibit: number; challenge: string }[];
    harmDispute: string;
    alternative: string;
  };
  jury: {
    jurors: { reasoning: string; vote: "guilty" | "not_guilty" | "abstain" }[];
    guiltyCount: number;
    notGuiltyCount: number;
    abstainCount: number;
    proceedsToJudge: boolean;
  };
  verdict: {
    decision: "guilty" | "not_guilty" | "dismissed";
    reasoning: string;
    rationale: string;
    actions?: string[];
    confidence: number;
  };
}
```

## Verdicts

- **guilty** - The affirmative position prevails (e.g., "merge the PR")
- **not_guilty** - The negative position prevails (e.g., "don't merge")
- **dismissed** - Jury didn't reach threshold, case dismissed

## Configuration

```typescript
{
  models: {
    prosecutor: "claude-3-7-sonnet-20250219",
    defense: "claude-3-7-sonnet-20250219",
    jury: "claude-3-7-sonnet-20250219",
    judge: "claude-3-7-sonnet-20250219"
  },
  parameters: {
    jurySize: 5,           // Number of jurors (3-12)
    juryThreshold: 3,      // Votes needed to proceed to judge
    juryTemperature: 0.9,  // Higher for diverse perspectives
    judgeTemperature: 0.2  // Lower for consistent rulings
  }
}
```

## Best For

- Binary go/no-go decisions
- PR/code review decisions
- Feature launch decisions
- Policy approval decisions
- Any yes/no question with consequences

## Cost

Typical cost per evaluation: $0.05-0.15 (varies by jury size and input length)
