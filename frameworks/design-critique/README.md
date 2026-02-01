# Design Critique Framework

Structured design feedback for work-in-progress.

## Overview

The Design Critique framework provides actionable design feedback:

- **Category-Based Feedback** - Usability, aesthetics, accessibility, etc.
- **Impact Assessment** - Severity of issues
- **Actionable Suggestions** - Specific improvements
- **Priority Ranking** - What to fix first

## Usage

### CLI

```bash
# Critique a design
bun cli.ts design-critique design.md

# Save feedback
bun cli.ts design-critique design.md --output feedback.json
```

### Programmatic

```typescript
import { run } from "./frameworks/design-critique";

const input = {
  design: "Mobile Banking App Dashboard",
  description: "Redesign with card-based layout...",
  goals: ["Increase daily active users", "Improve accessibility"]
};

const result = await run(input);

console.log("Feedback items:", result.feedback.length);
console.log("Strengths:", result.summary.strengths.length);
console.log("Priority actions:", result.summary.priorityActions);
```

## Output

```typescript
{
  design: string;
  feedback: {
    category: string;
    observation: string;
    impact: string;
    suggestion: string;
  }[];
  summary: {
    strengths: string[];
    concerns: string[];
    priorityActions: string[];
  };
}
```

## Best For

- UI/UX review
- Visual design feedback
- Product design validation
- Design iteration
- Team design reviews

## Cost

Typical cost: $0.05-0.10
