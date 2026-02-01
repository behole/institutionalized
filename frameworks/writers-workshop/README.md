# Writers' Workshop Framework

Manuscript feedback in Clarion/Clarion West style.

## Overview

The Writers' Workshop framework provides structured creative feedback:

- **Peer Reviews** - Multiple readers provide feedback
- **Positive First** - What works well
- **Constructive Second** - Questions and suggestions
- **Facilitated Discussion** - Synthesis of feedback themes

## Usage

### CLI

```bash
# Workshop a manuscript
bun cli.ts writers-workshop manuscript.md

# More peers for diverse feedback
bun cli.ts writers-workshop manuscript.md --peer-count 5

# Save workshop results
bun cli.ts writers-workshop manuscript.md --output feedback.json
```

### Programmatic

```typescript
import { run } from "./frameworks/writers-workshop";

const manuscript = {
  title: "The Last Algorithm",
  content: "Chapter 1: Dr. Sarah Chen stared at the terminal...",
  genre: "Science Fiction",
  wordCount: 5000
};

const result = await run(manuscript);

console.log("Reviews:", result.peerReviews.length);
console.log("Strengths:", result.summary.overallStrengths);
console.log("Focus areas:", result.summary.recommendedFocus);
```

## Output

```typescript
{
  manuscript: {
    title: string;
    content: string;
    genre?: string;
  };
  peerReviews: {
    reviewerId: string;
    positive: {
      whatWorks: string;
      strengths: string[];
      memorableMoments: string[];
    };
    constructive: {
      questions: string[];
      suggestions: string[];
      craftConcerns: string[];
    };
  }[];
  summary: {
    overallStrengths: string[];
    commonConcerns: string[];
    recommendedFocus: string[];
    nextSteps: string[];
  };
}
```

## Best For

- Fiction writing
- Creative non-fiction
- Technical documentation
- Essay review
- Any long-form content

## Cost

Typical cost: $0.10-0.25 (depends on manuscript length and peer count)
