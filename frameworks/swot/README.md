# SWOT Analysis Framework

Strategic situational assessment.

## Overview

The SWOT framework analyzes strategic positions across four dimensions:

- **Strengths** - Internal positive factors
- **Weaknesses** - Internal negative factors  
- **Opportunities** - External positive factors
- **Threats** - External negative factors

Plus strategy synthesis (SO, WO, ST, WT strategies).

## Usage

### CLI

```bash
# Analyze strategic position
bun cli.ts swot strategy.md

# Save analysis
bun cli.ts swot strategy.md --output swot.json
```

### Programmatic

```typescript
import { run } from "./frameworks/swot";

const input = {
  subject: "Expand to European market",
  context: ["Current: US-only", "$10M ARR", "GDPR required"]
};

const result = await run(input);

console.log("Strengths:", result.swot.strengths.length);
console.log("Decision:", result.recommendation.decision);
```

## Output

```typescript
{
  subject: string;
  swot: {
    strengths: string[];
    weaknesses: string[];
    opportunities: string[];
    threats: string[];
  };
  strategy: {
    so: string[]; // Strengths + Opportunities
    wo: string[]; // Weaknesses + Opportunities
    st: string[]; // Strengths + Threats
    wt: string[]; // Weaknesses + Threats
  };
  recommendation: {
    decision: "proceed" | "proceed_with_caution" | "delay" | "reconsider";
    rationale: string;
  };
}
```

## Best For

- Strategic planning
- Market analysis
- Competitive positioning
- Business decisions
- Initiative evaluation

## Cost

Typical cost: $0.05-0.10
