# Regulatory Impact Assessment Framework

Comprehensive policy analysis across multiple dimensions.

## Overview

The Regulatory Impact framework evaluates policies holistically:

- **Economic Analysis** - Costs, benefits, market effects
- **Social Impact** - Affected groups, equity, privacy
- **Environmental Impact** - Sustainability, carbon footprint
- **Stakeholder Feedback** - Multiple perspectives
- **Risk Assessment** - Identified risks and mitigations

## Usage

### CLI

```bash
# Assess policy impact
bun cli.ts regulatory-impact policy.md

# Save comprehensive analysis
bun cli.ts regulatory-impact policy.md --output analysis.json
```

### Programmatic

```typescript
import { run } from "./frameworks/regulatory-impact";

const policy = {
  title: "Mandatory Data Privacy Certification",
  description: "Require AI companies to obtain third-party privacy certification...",
  objectives: ["Protect user privacy", "Increase transparency"],
  stakeholders: ["AI companies", "Privacy advocates", "Consumers"]
};

const result = await run(policy);

console.log("Recommendation:", result.recommendation.decision);
console.log("Risks:", result.risks.risks.length);
console.log("Economic costs:", result.economic.costs.implementation);
```

## Output

```typescript
{
  policy: Policy;
  economic: {
    costs: { implementation: string; ongoing: string; compliance: string };
    benefits: { direct: string; indirect: string; longTerm: string };
    marketEffects: string[];
  };
  social: {
    affectedGroups: string[];
    equityConcerns: string[];
    privacyImplications: string[];
  };
  environmental: {
    directEffects: string[];
    sustainabilityConsiderations: string[];
    carbonFootprint: string;
  };
  stakeholderFeedback: {
    stakeholder: string;
    concerns: string[];
    support: string[];
  }[];
  risks: {
    risks: {
      description: string;
      likelihood: "low" | "medium" | "high";
      impact: "low" | "medium" | "high";
      mitigation: string;
    }[];
  };
  recommendation: {
    decision: "proceed" | "revise" | "reject";
    rationale: string;
    conditions?: string[];
  };
}
```

## Best For

- Policy analysis
- Compliance decisions
- Impact prediction
- Cost-benefit analysis
- Regulatory review

## Cost

Typical cost: $0.15-0.30 (multi-dimensional analysis)
