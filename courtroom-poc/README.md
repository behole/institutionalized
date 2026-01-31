---
title: Courtroom POC
date: 2026-01-29
status: active
---

# Courtroom POC

Proof of concept for LLM-as-a-Courtroom decision framework.

## Architecture

```
Case Input
    ↓
Prosecutor (builds case with exhibits)
    ↓
Defense (rebuts with counter-arguments)
    ↓
Jury Pool (5 parallel agents deliberate)
    ↓
Judge (synthesizes and renders verdict)
    ↓
Verdict Output (with rationale and actions)
```

## Tech Stack

- **Runtime:** Bun
- **Language:** TypeScript
- **LLM Provider:** Anthropic Claude (initially), multi-provider later
- **Config:** TOML or JSON
- **Output:** Structured JSON + human-readable markdown

## File Structure

```
courtroom-poc/
├── src/
│   ├── types.ts              # TypeScript interfaces
│   ├── prosecutor.ts         # Builds case with exhibits
│   ├── defense.ts            # Mounts rebuttal
│   ├── jury.ts               # Parallel deliberation
│   ├── judge.ts              # Final synthesis
│   ├── orchestrator.ts       # Coordinates flow
│   ├── validators.ts         # Exhibit validation
│   └── cli.ts                # Command-line interface
├── examples/
│   ├── essay-publish.json    # Should I publish this essay?
│   ├── code-commit.json      # Is this PR ready?
│   └── architecture.json     # Choose design A or B?
├── config.toml               # Model selection, thresholds
├── package.json
└── README.md
```

## Core Types

```typescript
interface Case {
  question: string;           // Binary decision to make
  context: string[];          // Files, notes, background
  evidence?: Exhibit[];       // Optional pre-built exhibits
}

interface Exhibit {
  sourceQuote: string;        // Exact quote from context
  targetQuote: string;        // What needs updating/comparing
  harm: string;               // Concrete consequence if wrong
}

interface Prosecution {
  caseStatement: string;      // Opening argument
  exhibits: Exhibit[];        // Validated evidence
  harmAnalysis: string;       // Why guilty verdict matters
}

interface Defense {
  counterArgument: string;    // Central thesis
  exhibitChallenges: {
    exhibit: number;          // Which exhibit
    challenge: string;        // Why it's weak
  }[];
  harmDispute: string;        // Why harm is overstated
  alternative: string;        // Why not guilty is right
}

interface JurorDeliberation {
  reasoning: string;          // Thought process
  vote: "guilty" | "not_guilty" | "abstain";
}

interface JuryVerdict {
  jurors: JurorDeliberation[];
  guiltyCount: number;
  notGuiltyCount: number;
  abstainCount: number;
  proceedsToJudge: boolean;   // Based on threshold
}

interface Verdict {
  decision: "guilty" | "not_guilty" | "dismissed";
  reasoning: string;          // Full analysis
  rationale: string;          // One-sentence summary
  actions?: string[];         // If guilty, what to do
  confidence: number;         // 0-1 scale
}

interface CourtroomResult {
  case: Case;
  prosecution: Prosecution;
  defense: Defense;
  jury: JuryVerdict;
  verdict: Verdict;
  metadata: {
    timestamp: string;
    duration: number;         // Milliseconds
    costUSD: number;          // Total cost
    modelUsage: {
      prosecutor: string;
      defense: string;
      jury: string;
      judge: string;
    };
  };
}
```

## Configuration

```toml
[models]
prosecutor = "claude-3-7-sonnet-20250219"
defense = "claude-3-7-sonnet-20250219"
jury = "claude-3-5-sonnet-20241022"      # Lighter model for jury
judge = "claude-3-7-sonnet-20250219"     # Heavy reasoning for judge

[parameters]
jury_size = 5
jury_threshold = 3           # Guilty votes needed to proceed
jury_temperature = 0.9       # High for variance
judge_temperature = 0.2      # Low for consistency

[validation]
require_exact_quotes = true  # Exhibits must have exact source quotes
min_harm_words = 10          # Harm statements must be substantial
```

## Usage

```bash
# Run with case file
bun run courtroom examples/essay-publish.json

# Run with inline case
bun run courtroom --question "Should I merge PR #123?" \
  --context "path/to/pr-diff.txt" \
  --context "path/to/tests.log"

# Output to file
bun run courtroom examples/code-commit.json --output verdict.json

# Verbose mode (show all agent outputs)
bun run courtroom examples/architecture.json --verbose

# Dry run (show prompts without calling LLM)
bun run courtroom examples/essay-publish.json --dry-run
```

## Example Case: Essay Publishing

```json
{
  "question": "Should I publish the Burnside essay now or wait for more edits?",
  "context": [
    "01_Projects/bhole/content/drafts/burnside/burnside-never-asked-permission-v4.md",
    "01_Projects/bhole/reviews/burnside-v4-review-2026-01-25.md",
    "01_Projects/bhole/brand/voice-guide.md"
  ]
}
```

**Expected flow:**
- **Prosecutor:** Argues it's ready (critic reviews positive, structure tight, momentum)
- **Defense:** Argues wait (some AI-ified language remains, could be stronger)
- **Jury:** 3-2 split (quality vs. perfect is enemy of good)
- **Judge:** Guilty verdict - publish now, with specific line edits noted

## Validation Rules

### Exhibit Validation
1. `sourceQuote` must exist verbatim in context files
2. `harm` must be specific (not "might confuse" but "users will X when Y")
3. Each exhibit must support the prosecution's case statement

### Defense Validation
1. Counter-argument must address prosecutor's core claim
2. Each exhibit challenge must reference specific exhibit number
3. Alternative explanation must be coherent

### Jury Validation
1. Reasoning must be substantive (min 50 words)
2. Vote must be one of three options
3. Cannot vote without reasoning

### Judge Validation
1. Must reference both prosecution and defense
2. Must acknowledge jury split if applicable
3. If guilty: must provide specific actions
4. Confidence score must match reasoning strength

## Success Criteria

### Accuracy
- Matches your judgment on 8/10 test cases
- When it disagrees, reasoning is sound (not hallucinated)

### Performance
- Total time < 60 seconds for complex case
- Cost < $0.25 per decision

### Observability
- Full audit trail of all agent outputs
- Can replay and debug any verdict
- Clear indication when validation fails

## Next Steps

1. Implement core types and prosecutor
2. Add defense and validation
3. Parallel jury execution
4. Judge synthesis
5. CLI interface
6. Test on 3 real decisions
7. Document learnings
8. Iterate based on failures
