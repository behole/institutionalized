---
name: institutional-reasoning
description: Run institutional decision frameworks (courtroom, peer review, red-blue, pre-mortem, and 22 more) — structured multi-agent LLM deliberation with audit trails, cost tracking, and normalized decisions. Use when the user asks for adversarial review, structured critique, risk analysis, or a deliberative decision process on a question, document, or proposal.
metadata:
  short-description: Multi-agent decision frameworks via CLI
---

# Institutional Reasoning

Runs 26 decision frameworks as real multi-agent orchestrations (not single-call
simulations). Each framework spawns role-specialized LLM agents, produces an
auditable result with per-agent cost attribution, and returns a normalized
decision (`approve` / `reject` / `delay` / `unclear`).

## Requirements

- Bun runtime (`bun --version` ≥ 1.0). The CLI runs from source.
- An API key for one of: `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `OPENROUTER_API_KEY`.

## Workflow

### 1. Pick a framework

| User intent                                         | Framework             |
| --------------------------------------------------- | --------------------- |
| Binary go/no-go decision under uncertainty          | `courtroom`           |
| Evaluate a document/proposal with structured review | `peer-review`         |
| Stress-test a system/design for weaknesses          | `red-blue`            |
| Enumerate failure modes of a plan before committing | `pre-mortem`          |
| Multi-perspective analysis of a decision            | `six-hats`            |
| Architecture/design validation by specialists       | `architecture-review` |
| Academic/thesis-level defense                       | `phd-defense`         |
| Security review with adversarial rounds             | `red-blue`            |
| Post-incident review                                | `aar`                 |
| Creative work critique                              | `studio`              |

Full catalog: run `bun <repo>/cli.ts --list`.

### 2. Write the input

Frameworks take JSON input files. Canonical input shapes (from `frameworks/<name>/types.ts`):

- **courtroom**: `{ "question": "...", "context": ["fact 1", "fact 2", ...] }`
- **peer-review**: `{ "work": "# markdown document", "reviewType": "technical|academic|creative" }`
- **red-blue**: `{ "system": "system description", "context": ["..."], "constraints": ["..."] }`
- **pre-mortem**: `{ "description": "the plan", "context": ["..."], "timeline": "...", "stakeholders": ["..."] }`

Plain text files also work — they are wrapped as `{ content: text }` automatically.

### 3. Run

```bash
# From this repo's root (CLI runs from source via Bun):
cd <repo-root>
bun cli.ts <framework> <input-file> --provider anthropic --verbose

# Examples:
bun cli.ts courtroom merge-decision.json --verbose
bun cli.ts pre-mortem launch-plan.md
bun cli.ts peer-review proposal.md --provider openrouter --model openai/gpt-4o-mini
```

Key flags:

- `--verbose` — stream per-agent progress, cost, and timing
- `--provider anthropic|openai|openrouter` and `--model <id>` — override default routing
- `--max-cost 0.50` — hard cost ceiling; the run aborts when reached
- `--output-json` — print machine-readable result (includes audit trail)
- `--output <file>` — write result JSON to file

### 4. Interpret the result

Every result carries `metadata.decision` (normalized) and `metadata.costUSD`.
The CLI exit code encodes the decision: `0` = approve/accept, `1` = reject/fail,
`3` = delay/indeterminate.

## When NOT to use

- The user wants a quick opinion — just answer directly; a framework run costs
  5–15× a single call and takes 10–60s.
- No API key is configured — ask for one; don't fabricate output.
- The question is not a decision/review/analysis — frameworks need a clear
  artifact or decision to work on.
