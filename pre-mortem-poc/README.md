---
title: Pre-mortem POC
date: 2026-01-29
status: active
---

# Pre-mortem POC

Business risk management framework for identifying failure modes before commitment.

## Concept

Instead of asking "What could go wrong?" (pessimistic), ask **"It's 6 months from now and this failed catastrophically. What happened?"** This reframes thinking and unlocks deeper failure mode analysis.

## Architecture

```
Decision/Plan
    ↓
Multiple Pessimists (parallel)
    └─ Each imagines specific failure scenario
    └─ Works backward to root cause
    └─ Rates likelihood and impact
    ↓
Facilitator (synthesis)
    └─ Ranks failure scenarios
    └─ Identifies patterns
    └─ Proposes mitigations
    ↓
Report: Ranked failures + Mitigation strategies
```

## Core Types

```typescript
interface Decision {
  proposal: string;           // What you're considering
  context?: string[];         // Background, constraints, goals
  timeline?: string;          // When this would happen
  stakeholders?: string[];    // Who's affected
}

interface FailureScenario {
  pessimist: string;          // "Pessimist 1", etc.
  futureDate: string;         // "March 2026"
  failureDescription: string; // What went wrong
  rootCause: string;          // Why it failed
  earlyWarningSign: string;   // What signal appeared first
  likelihood: number;         // 1-5 (1=unlikely, 5=very likely)
  impact: number;             // 1-5 (1=minor, 5=catastrophic)
  preventable: boolean;       // Could this have been avoided?
}

interface MitigationStrategy {
  addressedScenarios: string[]; // Which failures this prevents
  action: string;                // What to do
  timing: string;                // When to do it
  cost: string;                  // Resource requirement
  effectiveness: number;         // 1-5 confidence this works
}

interface PreMortemReport {
  summary: string;              // Executive summary
  rankedScenarios: {
    scenario: FailureScenario;
    riskScore: number;          // likelihood * impact
    priority: "critical" | "high" | "medium" | "low";
  }[];
  patterns: string[];           // Common themes across scenarios
  mitigations: MitigationStrategy[];
  recommendation: "proceed" | "proceed-with-caution" | "reconsider" | "abort";
  reasoning: string;            // Why this recommendation
}
```

## Usage

```bash
# Basic pre-mortem
bun run pre-mortem examples/product-launch.json

# More pessimists for thorough analysis
bun run pre-mortem examples/migration.json --pessimists 5

# Focus on specific timeline
bun run pre-mortem examples/decision.json --timeline "6 months"
```

## Example: Product Launch

```json
{
  "proposal": "Launch new mobile app to production on February 1st",
  "context": [
    "App is in beta with 500 users",
    "Marketing campaign already scheduled",
    "Engineering team is 4 people",
    "No on-call rotation established yet"
  ],
  "timeline": "Launch Feb 1, evaluate Mar 1",
  "stakeholders": ["Users", "Marketing", "Engineering", "Support"]
}
```

**Expected flow:**
- **Pessimist 1:** "It's March 1st. The app crashed under load. We never load-tested beyond 500 users."
- **Pessimist 2:** "It's March 1st. Users are furious about a critical bug. We shipped without a rollback plan."
- **Pessimist 3:** "It's March 1st. The team is burned out. We had no on-call rotation and everyone got paged constantly."
- **Facilitator:** Ranks scenarios, identifies pattern (lack of production readiness), proposes mitigations (load testing, rollback plan, on-call setup)

## Configuration

```toml
[models]
pessimists = "claude-3-5-sonnet-20241022"    # Can use lighter model
facilitator = "claude-3-7-sonnet-20250219"    # Needs synthesis

[parameters]
num_pessimists = 3
future_months = 6
pessimist_temperature = 0.9    # High creativity for failure scenarios
facilitator_temperature = 0.3   # Objective synthesis
```

## Success Criteria

- Failure scenarios are specific and plausible (not generic)
- Root causes are identifiable and actionable
- Mitigations address real risks (not security theater)
- Recommendation matches risk level
- Patterns emerge across multiple pessimists
