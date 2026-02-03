---
title: Institutional Reasoning - Architecture
date: 2026-01-29
---

# Architecture

Shared infrastructure for all institutional decision frameworks.

## Philosophy

Each human decision-making system (courtroom, peer review, red team, etc.) becomes a **framework** - a structured way to orchestrate multiple LLM agents according to proven institutional patterns.

## Shared Core

All frameworks share:
- **Multi-agent orchestration** (parallel and sequential)
- **Validation** (programmatic checks on agent outputs)
- **Observability** (audit trails, cost tracking)
- **Configuration** (model selection, parameters)
- **CLI interface** (consistent UX)

## Framework Structure

Each framework is a directory:

```
institutional-reasoning/
├── core/                    # Shared infrastructure
│   ├── orchestrator.ts      # Agent coordination primitives
│   ├── validators.ts        # Common validation patterns
│   ├── models.ts           # Multi-provider LLM interface
│   └── cli-base.ts         # Shared CLI logic
├── frameworks/
│   ├── courtroom/
│   │   ├── types.ts
│   │   ├── prosecutor.ts
│   │   ├── defense.ts
│   │   ├── jury.ts
│   │   ├── judge.ts
│   │   └── index.ts        # Framework entry point
│   ├── peer-review/
│   │   ├── types.ts
│   │   ├── reviewer.ts
│   │   ├── author.ts
│   │   ├── editor.ts
│   │   └── index.ts
│   ├── red-blue-team/
│   ├── pre-mortem/
│   └── studio-critique/
├── cli.ts                   # Unified CLI for all frameworks
└── examples/
    ├── courtroom/
    ├── peer-review/
    └── ...
```

## Agent Orchestration Patterns

### Parallel Execution
```typescript
const agents = Array.from({ length: N }, (_, i) => runAgent(i, ...));
const results = await Promise.all(agents);
```

Used for: Jury members, multiple reviewers, multiple pessimists (pre-mortem)

### Sequential Pipeline
```typescript
const step1 = await runAgent1(...);
const step2 = await runAgent2(step1, ...);
const step3 = await runAgent3(step2, ...);
```

Used for: Prosecutor → Defense → Judge; Paper → Reviews → Rebuttal → Editor

### Iterative Refinement
```typescript
let result = await runAgent(...);
for (let round = 0; round < maxRounds; round++) {
  const feedback = await evaluate(result);
  if (converged(feedback)) break;
  result = await refine(result, feedback);
}
```

Used for: Delphi method, multi-round debate

## Validation Patterns

### Quote Verification
```typescript
function validateQuote(quote: string, source: string): void {
  if (!source.includes(quote)) {
    throw new Error(`Quote not found in source`);
  }
}
```

### Substantive Response
```typescript
function validateSubstantive(text: string, minWords: number): void {
  const wordCount = text.split(/\s+/).length;
  if (wordCount < minWords) {
    throw new Error(`Response too brief (${wordCount}/${minWords} words)`);
  }
}
```

### Structured Output
```typescript
function validateStructure<T>(data: unknown, schema: Schema<T>): T {
  // JSON schema validation or Zod
  return schema.parse(data);
}
```

## Model Selection Strategy

### Role-Based Models
- **Heavyweight reasoning:** Judge, Editor, Synthesis roles
  - Model: Claude 3.7 Sonnet (or Opus when available)
  - Temperature: Low (0.2-0.3)
  - Max tokens: High (4K-8K)

- **Parallel diversity:** Jury, Reviewers, Pessimists
  - Model: Claude 3.5 Sonnet (faster, cheaper)
  - Temperature: High (0.7-0.9)
  - Max tokens: Medium (2K-4K)

- **Evidence builders:** Prosecutor, Challenger, Critic
  - Model: Claude 3.7 Sonnet
  - Temperature: Medium (0.5-0.7)
  - Max tokens: Medium (2K-4K)

### Cost Optimization
- Use lighter models for parallel agents (cost scales linearly)
- Use heavier models only for final synthesis
- Stream responses when possible
- Cache system prompts

## CLI Design

### Unified Interface
```bash
# Generic pattern
institutional-reasoning <framework> <input> [options]

# Examples
institutional-reasoning courtroom case.json --verbose
institutional-reasoning peer-review paper.md --reviewers 3
institutional-reasoning red-team architecture.md --rounds 5
institutional-reasoning pre-mortem plan.md --pessimists 10
```

### Common Flags
- `--verbose` - Full transcript
- `--output FILE` - Save structured results
- `--config FILE` - Custom configuration
- `--dry-run` - Show prompts without calling LLMs
- `--no-validate` - Skip validation (faster, less safe)

### Exit Codes
- `0` - Positive decision (accept, guilty, pass)
- `1` - Negative decision (reject, not guilty, fail)
- `2` - Error occurred
- `3` - Indeterminate (dismissed, abstain)

## Observability

### Audit Trail
```typescript
interface AuditLog {
  framework: string;
  timestamp: string;
  input: unknown;
  steps: {
    agent: string;
    model: string;
    prompt: string;
    response: string;
    duration: number;
    tokens: { input: number; output: number };
    cost: number;
  }[];
  result: unknown;
  metadata: {
    totalDuration: number;
    totalCost: number;
    outcome: string;
  };
}
```

### Cost Tracking
- Track tokens per agent call
- Calculate costs using current pricing
- Report total cost at end
- Warn if cost exceeds threshold

### Replay
- Save full audit log to JSON
- Can replay any decision for debugging
- Can modify prompts and re-run
- Compare before/after changes

## Testing Strategy

### Unit Tests
- Individual agent prompts produce valid JSON
- Validation catches malformed outputs
- Model interface works for all providers

### Integration Tests
- Full framework runs end-to-end
- Handles errors gracefully
- Produces expected output structure

### Accuracy Tests
- Compare framework decisions to human expert panels
- Measure: accuracy, consistency, reasoning quality
- Track: false positives, false negatives, edge cases

### Benchmark Suite
```typescript
interface Benchmark {
  framework: string;
  cases: {
    input: unknown;
    humanDecision: string;
    humanReasoning: string;
  }[];
}
```

## Multi-Provider Support

Institutional Reasoning supports multiple LLM providers with intelligent routing and cost optimization.

### Supported Providers

| Provider | Best For | Key Models |
|----------|----------|------------|
| **Anthropic** | Heavyweight reasoning (Judge, Editor) | Claude 3.7 Sonnet, Claude 3 Opus |
| **OpenAI** | Parallel agents, diverse perspectives | GPT-5, GPT-4o, GPT-4o Mini |
| **OpenRouter** | Cost optimization, model experimentation | 100+ models from multiple providers |

### Environment Setup

```bash
export ANTHROPIC_API_KEY="sk-ant-..."
export OPENAI_API_KEY="sk-..."
export OPENROUTER_API_KEY="sk-or-..."
```

The system auto-detects available providers. First available is used as default.

### Provider Interface
```typescript
interface LLMProvider {
  name: string;
  call(params: {
    model: string;
    messages: Message[];
    temperature: number;
    maxTokens: number;
  }): Promise<LLMResponse>;
  
  calculateCost(usage: { inputTokens: number; outputTokens: number }, model: string): number;
}
```

### Cost Optimization Strategy

**Scenario: Courtroom with 5 jurors**

| Approach | Cost | Savings |
|----------|------|---------|
| All Claude 3.7 Sonnet | ~$0.40 | - |
| **Optimized (jury = GPT-4o Mini)** | **~$0.17** | **57%** |

**Role-Based Selection:**
- **Heavyweight (Judge, Editor):** Claude 3.7 Sonnet, GPT-5 Pro
- **Parallel diversity (Jury, Reviewers):** GPT-4o Mini (cheaper at scale)
- **Evidence building (Prosecutor):** Claude 3.7 Sonnet

### Per-Role Provider Mixing

```typescript
const result = await runCourtroom(caseInput, {
  models: {
    prosecutor: "claude-3-7-sonnet-20250219",  // Anthropic
    defense: "gpt-5",                           // OpenAI
    jury: "gpt-4o-mini",                        // Cheaper for parallel
    judge: "claude-3-7-sonnet-20250219"
  }
});
```

Mixing providers improves decision quality through diverse reasoning patterns.

## OSS Release Plan

### Phase 1: Core + 5 Frameworks
- Courtroom ✅
- Peer Review
- Red/Blue Team
- Pre-mortem
- Studio Critique

### Phase 2: Documentation
- README with examples
- Architecture docs
- Contributing guide
- Framework developer guide

### Phase 3: Community
- MIT License
- GitHub repo
- Issue templates
- PR template
- Code of conduct

### Phase 4: Validation
- Benchmark suite
- Accuracy measurements
- User testimonials
- Case studies

## Framework Developer Guide

To add a new framework:

1. **Study the human system** - Read papers, handbooks, examples
2. **Define roles** - Who are the agents? What do they do?
3. **Map to types** - Input, intermediate structures, output
4. **Implement agents** - One file per role
5. **Add validation** - What makes output valid?
6. **Write orchestrator** - Coordinate agents sequentially/parallel
7. **Test** - Unit tests, integration test, manual run
8. **Document** - README with examples
9. **PR** - Submit for review

## Next Steps

1. Extract shared code from courtroom POC into `core/`
2. Implement peer-review using shared core
3. Prove pattern works for 2nd framework
4. Implement remaining 3 MVP frameworks
5. Create unified CLI
6. Write comprehensive README
7. OSS release
