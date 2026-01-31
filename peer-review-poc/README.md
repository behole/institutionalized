---
title: Peer Review POC
date: 2026-01-29
status: active
---

# Peer Review POC

Academic peer review system with author rebuttal and editor synthesis.

## Architecture

```
Submission
    ↓
Reviewers (2-4 independent reviews)
    ↓
Author Rebuttal (responds to critiques)
    ↓
Reviewers Response (optional: respond to rebuttal)
    ↓
Editor Decision (synthesizes all perspectives)
    ↓
Decision: Accept / Revise / Reject
```

## Key Differences from Courtroom

- **Iterative:** Author can respond to reviews (not just adversarial)
- **Multiple reviewers:** Each with different focus (methodology, theory, writing)
- **Three-way outcome:** Accept / Revise / Reject (not binary)
- **Collaborative:** Goal is to improve work, not win/lose

## Core Types

```typescript
interface Submission {
  work: string;              // The paper/doc/code to review
  context?: string[];        // Supporting materials
  reviewType?: string;       // "academic" | "technical" | "creative"
}

interface Review {
  reviewer: string;          // "Reviewer 1", "Reviewer 2", etc.
  summary: string;           // Overall assessment
  strengths: string[];       // What works well
  weaknesses: string[];      // What needs improvement
  questions: string[];       // Clarifying questions for author
  recommendation: "accept" | "revise" | "reject";
  confidence: number;        // 1-5 scale
}

interface Rebuttal {
  generalResponse: string;   // Overall response
  pointByPoint: {
    reviewer: string;
    weakness: string;
    response: string;
  }[];
}

interface EditorDecision {
  decision: "accept" | "revise" | "reject";
  reasoning: string;         // Synthesis of reviews + rebuttal
  requiredChanges?: string[]; // If revise, what must change
  optionalSuggestions?: string[]; // Nice-to-haves
  rationale: string;         // One-sentence summary
}
```

## Usage

```bash
# Run with submission file
bun run peer-review examples/technical-doc.json

# Specify number of reviewers
bun run peer-review examples/paper.json --reviewers 3

# Skip author rebuttal (faster)
bun run peer-review examples/code.json --no-rebuttal
```

## Example Case: Technical Documentation

```json
{
  "work": "path/to/technical-spec.md",
  "reviewType": "technical",
  "context": [
    "path/to/api-docs.md",
    "path/to/implementation.ts"
  ]
}
```

**Expected flow:**
- **Reviewer 1 (Technical Accuracy):** Checks for correctness, missing edge cases
- **Reviewer 2 (Clarity):** Evaluates readability, examples, structure
- **Reviewer 3 (Completeness):** Identifies missing sections, gaps
- **Author:** Responds to weaknesses, answers questions
- **Editor:** Synthesizes → "Revise: Add error handling section, clarify example 3"

## Configuration

```toml
[models]
reviewers = "claude-3-5-sonnet-20241022"
author = "claude-3-7-sonnet-20250219"     # Heavier model for rebuttal
editor = "claude-3-7-sonnet-20250219"     # Heavy reasoning for synthesis

[parameters]
num_reviewers = 3
enable_rebuttal = true
reviewer_temperature = 0.7   # Moderate diversity
editor_temperature = 0.3     # Consistency in decisions
```

## Success Criteria

- Reviews identify real issues (not generic critiques)
- Author rebuttal addresses concerns substantively
- Editor synthesizes fairly (doesn't just pick one reviewer)
- Decision provides actionable feedback
