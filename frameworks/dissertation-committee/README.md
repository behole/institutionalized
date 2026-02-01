# Dissertation Committee Framework

Multi-stage academic work validation.

## Overview

The Dissertation Committee framework provides rigorous academic review:

- **Committee Formation** - Advisor, specialists, methodologist
- **Stage Reviews** - Evaluation at proposal/chapters/draft/final stages
- **Consensus Building** - Committee agreement on verdict
- **Development Plan** - Clear path forward

## Usage

### CLI

```bash
# Committee review of academic work
bun cli.ts dissertation-committee work.md

# Save review feedback
bun cli.ts dissertation-committee work.md --output review.json
```

### Programmatic

```typescript
import { run } from "./frameworks/dissertation-committee";

const work = {
  title: "Neural Architecture Search for Dynamic Networks",
  abstract: "This dissertation develops novel methods...",
  field: "Computer Science",
  stage: "proposal",
  contributions: ["New algorithm", "Theoretical proof", "Implementation"]
};

const result = await run(work);

console.log("Verdict:", result.consensus.overallVerdict);
console.log("Unanimous:", result.consensus.unanimous);
console.log("Action items:", result.developmentPlan.immediateActions);
```

## Output

```typescript
{
  work: {
    title: string;
    abstract: string;
    field: string;
    stage: "proposal" | "chapters" | "draft" | "final";
  };
  committee: {
    name: string;
    specialty: string;
    role: string;
  }[];
  stageReviews: {
    reviewer: string;
    assessment: {
      strengths: string[];
      weaknesses: string[];
      questions: string[];
    };
    verdict: "approve" | "revise" | "reject";
  }[];
  consensus: {
    overallVerdict: "approve" | "revise" | "reject";
    unanimous: boolean;
    conditions?: string[];
  };
  developmentPlan: {
    immediateActions: string[];
    timeline: string;
    milestones: string[];
  };
}
```

## Best For

- Dissertation/thesis review
- Research proposal validation
- Long-term project milestones
- Academic work evaluation
- Multi-stage validation

## Cost

Typical cost: $0.15-0.25 (multi-reviewer assessment)
