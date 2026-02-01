# Tumor Board / MDT Framework

Multi-specialist consensus for complex decisions.

## Overview

The Tumor Board framework brings multiple specialists together:

- **Specialist Perspectives** - Domain experts contribute
- **Integrated Assessment** - Holistic view of situation
- **Treatment Plan** - Coordinated recommendations
- **Risk Evaluation** - Comprehensive risk assessment

## Usage

### CLI

```bash
# Multi-specialist review
bun cli.ts tumor-board case.md

# Save recommendations
bun cli.ts tumor-board case.md --output recommendations.json
```

### Programmatic

```typescript
import { run } from "./frameworks/tumor-board";

const input = {
  case: "Legacy System Migration",
  description: "Migrate critical financial system...",
  specialists: [
    { role: "infrastructure", name: "Infra Lead" },
    { role: "security", name: "Security Architect" },
    { role: "data", name: "Data Engineer" }
  ]
};

const result = await run(input);

console.log("Specialists:", result.specialistOpinions.length);
console.log("Consensus:", result.consensus.recommendation);
console.log("Treatment steps:", result.treatmentPlan.length);
```

## Output

```typescript
{
  case: string;
  specialistOpinions: {
    specialist: string;
    assessment: string;
    concerns: string[];
    recommendations: string[];
  }[];
  consensus: {
    recommendation: string;
    agreedPoints: string[];
    divergentViews: string[];
  };
  treatmentPlan: string[];
  risks: string[];
}
```

## Best For

- Complex technical decisions
- Multi-factor optimization
- High-stakes migrations
- Architecture decisions
- Risk management

## Cost

Typical cost: $0.10-0.20 (depends on specialist count)
