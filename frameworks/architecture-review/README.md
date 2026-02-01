# Architecture Review Framework

Multi-domain system design validation.

## Overview

The Architecture Review framework evaluates system designs across multiple technical domains:

- **Performance** - Scalability, latency, throughput
- **Security** - Threats, vulnerabilities, compliance
- **Reliability** - Fault tolerance, disaster recovery
- **Maintainability** - Code health, documentation
- **Cost** - Infrastructure, operational expenses

## Usage

### CLI

```bash
# Review system architecture
bun cli.ts architecture-review design.md

# Save detailed review
bun cli.ts architecture-review design.md --output review.json
```

### Programmatic

```typescript
import { run } from "./frameworks/architecture-review";

const input = {
  system: "Real-time Analytics Platform",
  description: "Processes 1M events/sec...",
  constraints: ["Budget: $50K/month", "99.99% uptime SLA"]
};

const result = await run(input);

console.log("Decision:", result.overallAssessment.decision);
console.log("Domain reviews:", result.domainReviews.length);
```

## Output

```typescript
{
  system: string;
  domainReviews: {
    domain: string;
    findings: string[];
    concerns: string[];
    recommendations: string[];
  }[];
  overallAssessment: {
    decision: "approved" | "approved_with_conditions" | "needs_revision" | "rejected";
    rationale: string;
  };
}
```

## Best For

- System design reviews
- Technical architecture decisions
- Infrastructure planning
- Platform evaluations
- Technical due diligence

## Cost

Typical cost: $0.10-0.20
