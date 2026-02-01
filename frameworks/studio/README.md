# Studio Critique Framework

Creative work evaluation with peer feedback.

## Overview

The Studio Critique framework provides structured creative feedback:

- **Peer Feedback** - What works, what doesn't, questions
- **Instructor Assessment** - Expert guidance
- **Synthesis** - Themes and action items
- **Silent Creator** - Creator listens first

## Usage

### CLI

```bash
# Critique creative work
bun cli.ts studio work.md

# More peers for diverse feedback
bun cli.ts studio work.md --peer-count 5

# Save critique
bun cli.ts studio work.md --output critique.json
```

### Programmatic

```typescript
import { run } from "./frameworks/studio";

const input = {
  work: "Brand Identity Redesign",
  description: "Complete rebrand with new logo, colors, typography...",
  creatorSilent: true
};

const result = await run(input);

console.log("Peer feedback:", result.peerFeedback.length);
console.log("Key themes:", result.synthesis.keyThemes);
console.log("Action items:", result.synthesis.actionItems);
```

## Output

```typescript
{
  work: string;
  peerFeedback: {
    peer: string;
    whatWorks: string[];
    whatDoesnt: string[];
    questions: string[];
  }[];
  instructorFeedback: {
    overallAssessment: string[];
  };
  synthesis: {
    keyThemes: string[];
    actionItems: string[];
  };
}
```

## Best For

- Design critiques
- Creative work review
- Portfolio feedback
- Artistic evaluation
- Team creative sessions

## Cost

Typical cost: $0.10-0.20 (depends on peer count)
