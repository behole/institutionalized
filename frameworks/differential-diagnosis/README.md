# Differential Diagnosis Framework

Systematic diagnostic reasoning for troubleshooting.

## Overview

The Differential Diagnosis framework systematically identifies the most likely cause of symptoms:

1. **Symptom Analysis** - Catalog all observed issues
2. **Hypothesis Generation** - List possible causes
3. **Evidence Evaluation** - Match symptoms to hypotheses
4. **Likelihood Ranking** - Score by probability
5. **Treatment Plan** - Recommended fixes

## Usage

### CLI

```bash
# Diagnose system issues
bun cli.ts differential-diagnosis symptoms.json

# Save diagnosis
bun cli.ts differential-diagnosis symptoms.json --output diagnosis.json
```

### Programmatic

```typescript
import { run } from "./frameworks/differential-diagnosis";

const input = {
  symptoms: [
    "API latency increased 10x",
    "Memory usage climbing",
    "Database connections stable",
    "Started after yesterday's deploy"
  ],
  context: "Production web app"
};

const result = await run(input);

console.log("Most likely:", result.mostLikely.condition);
console.log("Confidence:", result.mostLikely.likelihood);
console.log("Tests:", result.recommendedTests);
```

## Output

```typescript
{
  symptoms: string[];
  differentialDiagnoses: {
    condition: string;
    likelihood: number;
    supportingEvidence: string[];
    contradictingEvidence: string[];
  }[];
  mostLikely: {
    condition: string;
    likelihood: number;
  };
  recommendedTests: string[];
  treatmentPlan: string[];
}
```

## Best For

- Debugging complex issues
- Root cause analysis
- System troubleshooting
- Performance problems
- Mystery bugs

## Cost

Typical cost: $0.05-0.10
