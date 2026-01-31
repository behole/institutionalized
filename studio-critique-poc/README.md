---
title: Studio Critique POC
date: 2026-01-29
status: active
---

# Studio Critique POC

Art/design education framework for creative work evaluation.

## Concept

Based on art school "crit" sessions: work is presented, creator stays silent while peers discuss, then instructor synthesizes, finally creator responds. This structure prevents defensiveness and encourages honest feedback.

## Architecture

```
Work
    ↓
Creator Presentation (brief context)
    ↓
Peers (simultaneous responses)
    ├─ What works
    ├─ What doesn't
    └─ Questions
    ↓
Instructor (synthesis)
    └─ Overall assessment
    └─ Specific guidance
    ↓
Creator Response (optional)
    └─ Clarifications
    └─ Next steps
```

## Core Types

```typescript
interface Work {
  content: string;            // The work itself (essay, design, code)
  context?: string;           // Creator's brief statement
  medium?: string;            // "writing" | "design" | "code" | "other"
  stage?: string;             // "draft" | "revision" | "final"
}

interface PeerCritique {
  peer: string;               // "Peer 1", etc.
  whatWorks: string[];        // Specific strengths
  whatDoesnt: string[];       // Specific issues
  questions: string[];        // Clarifying questions
  overallImpression: string;  // Gut reaction
}

interface InstructorAssessment {
  synthesis: string;          // Integration of peer feedback
  technicalNotes: string;     // Craft/execution observations
  conceptualNotes: string;    // Idea/content observations
  strengthsToKeep: string[];  // What's working, don't change
  areasToRevise: string[];    // What needs work
  nextSteps: string;          // Concrete guidance
  readyToShip: boolean;       // Is this done?
}

interface CreatorResponse {
  clarifications: string[];   // Responses to questions
  intendedVsReceived: string; // Where perception differed from intent
  revisionPlan: string;       // What creator will change
}
```

## Usage

```bash
# Basic critique
bun run studio-critique examples/essay.json

# More peers for diverse perspectives
bun run studio-critique examples/design.json --peers 5

# Skip creator response (faster)
bun run studio-critique examples/code.json --no-response
```

## Example: Essay Critique

```json
{
  "content": "path/to/essay.md",
  "context": "This is an essay about skateboarding culture. I'm trying to capture the tension between mainstream acceptance and underground authenticity.",
  "medium": "writing",
  "stage": "draft"
}
```

**Expected flow:**
- **Peer 1:** "The opening paragraph is strong - clear voice. But I got lost in the middle section, too many tangents."
- **Peer 2:** "The authenticity theme comes through. But the ending feels rushed. And I wanted more concrete examples."
- **Peer 3:** "The writing itself is good. But I'm not sure what the main argument is. What's your thesis?"
- **Instructor:** Synthesizes - "Strong voice, unclear structure. The tangents are actually thematically connected but need signposting. Revise: add thesis statement, reorganize middle section, expand ending."
- **Creator:** "The thesis is implicit - I'll make it explicit. The tangents connect via skateboarding's rejection of linearity, but I see that's not clear."

## Configuration

```toml
[models]
peers = "claude-3-5-sonnet-20241022"         # Diverse perspectives
instructor = "claude-3-7-sonnet-20250219"     # Synthesis + guidance
creator = "claude-3-5-sonnet-20241022"        # Responsive

[parameters]
num_peers = 3
enable_creator_response = true
peer_temperature = 0.7      # Varied reactions
instructor_temperature = 0.5 # Balanced assessment
```

## Success Criteria

- Peers give specific feedback (not vague praise/criticism)
- Instructor synthesizes patterns (doesn't just list feedback)
- Guidance is actionable (concrete next steps)
- Creator response shows understanding (not defensiveness)
- Feedback addresses both craft and concept
