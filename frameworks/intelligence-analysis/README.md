# Intelligence Analysis Framework

Competing hypotheses (CIA method) for diagnostic reasoning.

## Overview

The Intelligence Analysis framework uses the CIA's Analysis of Competing Hypotheses (ACH):

- **Multiple Hypotheses** - Generate alternative explanations
- **Evidence Evaluation** - Match evidence to hypotheses
- **Diagnostic Value** - Identify discriminating evidence
- **Probability Ranking** - Most likely explanation

## Usage

### CLI

```bash
# Analyze competing explanations
bun cli.ts intelligence-analysis question.json

# Save analysis
bun cli.ts intelligence-analysis question.json --output analysis.json
```

### Programmatic

```typescript
import { run } from "./frameworks/intelligence-analysis";

const input = {
  question: "Why did API latency spike?",
  evidence: [
    "Started at 14:00 UTC",
    "Database CPU normal",
    "Cache hit rate dropped",
    "New marketing campaign launched"
  ]
};

const result = await run(input);

console.log("Hypotheses:", result.hypotheses.length);
console.log("Most likely:", result.analysis.mostLikely);
console.log("Key uncertainties:", result.analysis.keyUncertainties);
```

## Output

```typescript
{
  question: string;
  hypotheses: {
    hypothesis: string;
    supportingEvidence: string[];
    contradictingEvidence: string[];
    probability: number;
  }[];
  analysis: {
    mostLikely: string;
    keyUncertainties: string[];
    recommendedTests: string[];
  };
}
```

## Best For

- Root cause analysis
- Mystery solving
- Diagnostic troubleshooting
- Debugging complex issues
- Situation assessment

## Cost

Typical cost: $0.05-0.10
