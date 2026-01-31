# Peer Review Framework

Academic-style validation with independent reviewers, author rebuttal, and editorial synthesis.

## Overview

The Peer Review framework simulates the academic peer review process:

1. **Independent Reviews** (parallel) - Multiple reviewers evaluate independently
2. **Author Rebuttal** (optional) - Author responds to critiques
3. **Editorial Decision** - Editor synthesizes reviews and rebuttal

## Usage

### CLI

```bash
# Basic review with 3 reviewers
bun cli.ts peer-review paper.md

# Specify number of reviewers
bun cli.ts peer-review paper.md --reviewers 4

# Skip rebuttal phase
bun cli.ts peer-review paper.md --no-rebuttal

# Save results to file
bun cli.ts peer-review paper.md --output results.json --verbose
```

### Programmatic

```typescript
import { runPeerReview, getDefaultConfig } from "./frameworks/peer-review";
import { createProvider } from "./core/providers";

const submission = {
  work: "Your paper content...",
  context: ["Additional context..."],
  reviewType: "academic" // or "technical", "creative", "general"
};

const config = getDefaultConfig();
const provider = createProvider({
  name: "anthropic",
  apiKey: process.env.ANTHROPIC_API_KEY
});

const result = await runPeerReview(submission, config, provider);

console.log(`Decision: ${result.decision.decision}`);
console.log(`Rationale: ${result.decision.rationale}`);
```

## Configuration

```typescript
const config: PeerReviewConfig = {
  models: {
    reviewers: "claude-3-5-sonnet-20241022",  // Faster, cheaper for parallel
    author: "claude-3-7-sonnet-20250219",      // Quality for rebuttal
    editor: "claude-3-7-sonnet-20250219"       // Quality for synthesis
  },
  parameters: {
    numReviewers: 3,          // 2-5 recommended
    enableRebuttal: true,     // Allow author response
    reviewerTemperature: 0.7, // Higher for diversity
    editorTemperature: 0.3    // Lower for consistency
  }
};
```

## Review Types

Each review type focuses reviewers on different aspects:

### Academic
- Methodology and rigor
- Theoretical contribution
- Literature review and citations
- Clarity and writing quality

### Technical
- Technical accuracy
- Clarity and completeness
- Code quality and examples
- API design and usability

### Creative
- Originality and concept
- Execution and craft
- Audience and impact
- Coherence and structure

### General (default)
- Overall quality
- Clarity and organization
- Completeness
- Impact and value

## Output

The framework returns a structured result:

```typescript
{
  submission: Submission;
  reviews: Review[];        // Independent reviews
  rebuttal?: Rebuttal;     // Author's response
  decision: EditorDecision; // Final decision
  metadata: {
    timestamp: string;
    config: PeerReviewConfig;
  };
}
```

### Decisions

- **accept** - Minor issues only, ready to publish
- **revise** - Good foundation, needs specific improvements (includes required changes)
- **reject** - Fundamental issues that can't be fixed with revision

## Examples

See `examples/peer-review/` for:
- Technical documentation review
- Research paper review
- Creative writing review
- Code architecture review

## How It Works

### Phase 1: Independent Reviews

Reviewers work in parallel with different focus areas to ensure comprehensive coverage. Each reviewer:
- Evaluates based on their assigned focus
- Identifies strengths and weaknesses
- Asks clarifying questions
- Provides a recommendation with confidence level

### Phase 2: Author Rebuttal (Optional)

If enabled, the author:
- Sees all reviews
- Provides point-by-point responses to weaknesses
- Clarifies misunderstandings
- Explains design decisions

### Phase 3: Editorial Decision

The editor:
- Synthesizes all reviews
- Considers the author's rebuttal
- Makes final decision (accept/revise/reject)
- Lists required changes (if revise)
- Provides clear rationale

## Tips

- **Use 3-4 reviewers** for most cases (balances coverage and cost)
- **Enable rebuttal** for complex or ambiguous work
- **Set reviewType** to focus reviewers appropriately
- **Review with context** - provide supporting materials for better evaluation
- **Iterate** - use "revise" decisions to improve and re-submit

## Cost

Typical costs (with Claude):
- 3 reviewers, no rebuttal: ~$0.10-0.20
- 3 reviewers, with rebuttal: ~$0.15-0.30
- 5 reviewers, with rebuttal: ~$0.25-0.50

Costs scale linearly with number of reviewers and submission length.
