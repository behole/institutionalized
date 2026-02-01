# Red-Blue Team Framework

Military-style adversarial security testing and architecture stress-testing.

## Overview

The Red-Blue Team framework simulates adversarial attacks against a system:

- **Red Team** - Attacks the system, finds vulnerabilities
- **Blue Team** - Defends, patches, and responds
- **Multiple rounds** - Iterative attack/defense cycles
- **Observer** - Documents findings and severity

## Usage

### CLI

```bash
# Security review
bun cli.ts red-blue architecture.md

# More rounds for thorough testing
bun cli.ts red-blue architecture.md --rounds 5

# Save vulnerability report
bun cli.ts red-blue architecture.md --output security-report.json
```

### Programmatic

```typescript
import { run } from "./frameworks/red-blue";

const system = {
  system: "Payment API",
  description: "REST API handling credit card transactions..."
};

const result = await run(system);

console.log(`Found ${result.vulnerabilities.length} vulnerabilities`);
console.log("Critical:", result.vulnerabilities.filter(v => v.severity === "critical"));
```

## Output

```typescript
{
  system: string;
  redTeam: {
    attacks: {
      attack: string;
      target: string;
      expectedImpact: string;
    }[];
  };
  blueTeam: {
    defenses: {
      defense: string;
      effectiveness: string;
    }[];
  };
  vulnerabilities: {
    description: string;
    severity: "critical" | "high" | "medium" | "low";
    attackVector: string;
    mitigation: string;
  }[];
}
```

## Best For

- Security audits
- Architecture stress-testing
- Finding edge cases
- Penetration testing planning
- Resilience assessment

## Cost

Typical cost: $0.10-0.25 (depends on rounds and system complexity)
