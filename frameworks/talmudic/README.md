# Talmudic Dialectic Framework

Multi-interpretation reasoning from Jewish textual tradition.

## Overview

The Talmudic framework embraces multiple valid interpretations:

- **Multiple Interpretations** - Different readings of the same text
- **Counterpoints** - Respectful engagement between views
- **Practical Resolutions** - Actionable guidance despite ambiguity
- **Preservation of Dissent** - Minority opinions recorded

## Usage

### CLI

```bash
# Analyze ambiguous text
bun cli.ts talmudic text.json

# More interpreters for broader perspective
bun cli.ts talmudic text.json --interpreter-count 4
```

### Programmatic

```typescript
import { run } from "./frameworks/talmudic";

const input = {
  text: "API docs: All requests must include authentication",
  context: "But GET endpoints accept requests without auth",
  specificQuestion: "Does this apply to read-only operations?"
};

const result = await run(input);

console.log("Interpretations:", result.interpretations.length);
console.log("Resolutions:", result.resolutions.length);
result.resolutions.forEach(r => {
  console.log(`${r.question}: ${r.practicalRuling}`);
});
```

## Output

```typescript
{
  problem: {
    text: string;
    specificQuestion?: string;
  };
  interpretations: {
    interpreter: string;
    interpretation: string;
    textualSupport: string[];
    implications: string[];
  }[];
  counterpoints: {
    respondsTo: string;
    counterPoint: string;
    textualEvidence: string[];
  }[];
  resolutions: {
    question: string;
    practicalRuling: string;
    reasoning: string;
    minorityOpinion?: string;
    whenToApply: string;
  }[];
}
```

## Best For

- Ambiguous requirements
- Contradictory constraints
- Interpretation tasks
- Legal/contractual analysis
- Embracing complexity

## Cost

Typical cost: $0.10-0.20 (depends on interpreter count)
