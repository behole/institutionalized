# Six Thinking Hats Framework

Multi-perspective analysis using Edward de Bono's six thinking modes.

## Overview

The Six Thinking Hats framework ensures comprehensive analysis by examining decisions from six distinct perspectives:

1. **White Hat** - Facts and data (objective information)
2. **Red Hat** - Emotions and intuition (gut feelings)
3. **Black Hat** - Caution and risks (critical judgment)
4. **Yellow Hat** - Benefits and optimism (positive aspects)
5. **Green Hat** - Creativity and alternatives (new ideas)
6. **Blue Hat** - Process and overview (meta-perspective)

## Usage

### CLI

```bash
# Analyze a decision
bun cli.ts six-hats decision.md

# Save full analysis
bun cli.ts six-hats decision.md --output analysis.json
```

### Programmatic

```typescript
import { run } from "./frameworks/six-hats";

const input = {
  topic: "Should we pivot to a B2B model?",
  context: [
    "Current B2C revenue: $50K/month",
    "B2B inquiries increasing",
    "Longer sales cycles in B2B",
    "Higher ACV potential"
  ]
};

const result = await run(input);

// Access each perspective
console.log("Risks:", result.perspectives.black_hat.concerns);
console.log("Benefits:", result.perspectives.yellow_hat.advantages);
console.log("Recommendation:", result.synthesis.recommendation);
```

## Output

```typescript
{
  topic: string;
  perspectives: {
    white_hat: { facts: string[]; data_quality: string };
    red_hat: { emotions: string[]; intuitions: string[] };
    black_hat: { risks: string[]; concerns: string[]; pitfalls: string[] };
    yellow_hat: { benefits: string[]; advantages: string[]; opportunities: string[] };
    green_hat: { alternatives: string[]; creative_ideas: string[]; possibilities: string[] };
    blue_hat: { process_notes: string[]; overview: string; next_steps: string[] };
  };
  synthesis: {
    balanced_view: string;
    recommendation: string;
    priority_actions: string[];
  };
}
```

## Best For

- Complex decisions with multiple stakeholders
- Breaking out of single-perspective thinking
- Team alignment on contentious issues
- Strategic planning sessions
- Innovation and brainstorming

## Tips

- Use in sequence (white → red → black → yellow → green → blue)
- Spend equal time on each hat
- Suspend judgment when wearing other hats
- The blue hat should guide the process

## Cost

Typical cost: $0.10-0.20 (6 parallel perspectives)
