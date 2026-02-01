# After-Action Review (AAR) Framework

Blameless learning from execution - understand what happened and why.

## Overview

The AAR framework facilitates learning from past events without blame:

1. **What Happened** - Objective timeline of events
2. **What Was Expected** - Planned vs actual outcomes
3. **Gaps** - Where reality diverged from plan
4. **Learnings** - Insights and patterns
5. **Action Items** - Concrete improvements with owners

## Usage

### CLI

```bash
# Post-incident review
bun cli.ts aar incident.md

# Save learnings
bun cli.ts aar incident.md --output lessons.json
```

### Programmatic

```typescript
import { run } from "./frameworks/aar";

const input = {
  event: "Database outage on March 15",
  whatHappened: "Timeline of the incident...",
  whatWasExpected: "Normal operations, auto-scaling...",
  participants: ["Sarah (DBA)", "Mike (SRE)"]
};

const result = await run(input);

console.log("Gaps:", result.gaps);
console.log("Action items:", result.actionItems);
```

## Output

```typescript
{
  event: string;
  whatHappened: string;
  whatWasExpected: string;
  gaps: string[];
  learnings: string[];
  actionItems: {
    description: string;
    owner: string;
    priority: "high" | "medium" | "low";
  }[];
}
```

## Best For

- Post-mortems
- Incident analysis
- Project retrospectives
- Process improvement
- Blameless learning

## Cost

Typical cost: $0.05-0.10
