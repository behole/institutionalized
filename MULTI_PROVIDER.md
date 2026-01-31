---
title: Multi-Provider Support
date: 2026-01-29
---

# Multi-Provider LLM Support

Institutional Reasoning supports multiple LLM providers out of the box.

## Supported Providers

### 1. Anthropic Claude
**Models:** Claude 3.7 Sonnet, Claude 3.5 Sonnet, Claude 3 Opus, Claude 3 Haiku

```bash
export ANTHROPIC_API_KEY="your-key"
```

**Best for:** Heavyweight reasoning (Judge, Editor roles), complex analysis

**Pricing:** $3/M input, $15/M output (Sonnet)

### 2. OpenAI
**Models:** GPT-5, GPT-5 Pro, GPT-4o, GPT-4o Mini, o1, o1-mini

```bash
export OPENAI_API_KEY="your-key"
```

**Best for:** Parallel agents (diverse perspectives), creative tasks

**Pricing:** $2.50/M input, $10/M output (GPT-4o)

### 3. OpenRouter
**Models:** Access to 100+ models from multiple providers

```bash
export OPENROUTER_API_KEY="your-key"
```

**Best for:** Cost optimization, model experimentation, open source models

**Pricing:** Varies by model

## Configuration

### Environment Variables (Auto-detect)

Set any provider API key. The system will automatically use the first available:

```bash
export ANTHROPIC_API_KEY="sk-ant-..."
# or
export OPENAI_API_KEY="sk-..."
# or
export OPENROUTER_API_KEY="sk-or-..."
```

### Config File (Explicit Control)

```toml
# config.toml
[providers]
default = "anthropic"

[providers.anthropic]
api_key_env = "ANTHROPIC_API_KEY"
models = [
  "claude-3-7-sonnet-20250219",
  "claude-3-5-sonnet-20241022"
]

[providers.openai]
api_key_env = "OPENAI_API_KEY"
models = [
  "gpt-5",
  "gpt-4o",
  "gpt-4o-mini"
]

[providers.openrouter]
api_key_env = "OPENROUTER_API_KEY"
# Can access any OpenRouter model
```

### Per-Framework Model Selection

```toml
# courtroom-config.toml
[models]
prosecutor = "claude-3-7-sonnet-20250219"      # Anthropic
defense = "openai/gpt-5"                       # OpenAI via OpenRouter
jury = "openai/gpt-4o-mini"                    # OpenAI (cheaper for parallel)
judge = "claude-3-7-sonnet-20250219"           # Anthropic (heavy reasoning)
```

## Provider Selection Strategy

### Role-Based Selection

**Heavyweight Reasoning (Judge, Editor, Synthesizer):**
- **Best:** Claude 3.7 Sonnet, GPT-5 Pro
- **Why:** Complex multi-perspective synthesis
- **Cost:** Higher, but only one call per framework run

**Parallel Diversity (Jury, Reviewers, Pessimists):**
- **Best:** GPT-4o Mini, Claude 3.5 Sonnet
- **Why:** Cost scales with number of agents (5x for jury)
- **Cost:** Lower per call, but many calls

**Evidence Building (Prosecutor, Challenger):**
- **Best:** Claude 3.7 Sonnet, GPT-5
- **Why:** Structured output, detailed reasoning
- **Cost:** Medium

### Cost Optimization

**Scenario: Courtroom with 5 jurors**

**All Claude 3.7 Sonnet:**
- Prosecutor: $0.05
- Defense: $0.05
- Jury (5x): $0.25
- Judge: $0.05
- **Total: ~$0.40**

**Optimized:**
- Prosecutor: Claude 3.7 Sonnet ($0.05)
- Defense: Claude 3.7 Sonnet ($0.05)
- Jury (5x): GPT-4o Mini ($0.02)
- Judge: Claude 3.7 Sonnet ($0.05)
- **Total: ~$0.17** (57% savings)

### Model Diversity Benefits

Using **different providers for different roles** can improve decision quality:

**Example: Courtroom**
- Prosecutor: Claude 3.7 (structured legal reasoning)
- Defense: GPT-5 (creative counterarguments)
- Jury: Mix of Claude 3.5, GPT-4o, GPT-4o Mini (diverse perspectives)
- Judge: Claude 3.7 (consistent synthesis)

Different models have different reasoning patterns. Mixing them prevents groupthink.

## Usage Examples

### CLI with Provider Selection

```bash
# Use default provider from env
institutional-reasoning courtroom case.json

# Force specific provider
institutional-reasoning courtroom case.json \
  --provider anthropic

# Per-role provider override
institutional-reasoning courtroom case.json \
  --prosecutor-model "claude-3-7-sonnet-20250219" \
  --jury-model "openai/gpt-4o-mini" \
  --judge-model "claude-3-7-sonnet-20250219"
```

### Programmatic Usage

```typescript
import { createProvider } from "./core/providers";
import { runCourtroom } from "./frameworks/courtroom";

// Single provider
const provider = createProvider({
  name: "anthropic",
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

// Mixed providers
const prosecutors = createProvider({
  name: "anthropic",
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

const juryProvider = createProvider({
  name: "openai",
  apiKey: process.env.OPENAI_API_KEY!,
});

const result = await runCourtroom(caseInput, {
  models: {
    prosecutor: "claude-3-7-sonnet-20250219",
    defense: "claude-3-7-sonnet-20250219",
    jury: "gpt-4o-mini",
    judge: "claude-3-7-sonnet-20250219",
  },
  providers: {
    anthropic: prosecutorProvider,
    openai: juryProvider,
  },
});
```

## Provider Interface

All providers implement the same interface:

```typescript
interface LLMProvider {
  name: string;

  call(params: {
    model: string;
    messages: Message[];
    temperature?: number;
    maxTokens?: number;
    systemPrompt?: string;
  }): Promise<LLMResponse>;

  calculateCost(
    usage: { inputTokens: number; outputTokens: number },
    model: string
  ): number;
}
```

## Adding Custom Providers

To add a new provider:

1. Create `core/providers/your-provider.ts`
2. Implement `LLMProvider` interface
3. Add to `core/providers/index.ts`
4. Update pricing table in `calculateCost()`

Example:

```typescript
// core/providers/my-provider.ts
import type { LLMProvider, LLMCallParams, LLMResponse } from "../types";

export class MyProvider implements LLMProvider {
  name = "my-provider";

  async call(params: LLMCallParams): Promise<LLMResponse> {
    // Your API call here
  }

  calculateCost(usage, model): number {
    // Your pricing calculation
  }
}
```

## Cost Tracking

Every framework run tracks costs automatically:

```json
{
  "metadata": {
    "costUSD": 0.17,
    "modelUsage": {
      "prosecutor": "claude-3-7-sonnet-20250219",
      "defense": "claude-3-7-sonnet-20250219",
      "jury": "gpt-4o-mini",
      "judge": "claude-3-7-sonnet-20250219"
    },
    "tokenUsage": {
      "prosecutor": { "input": 1200, "output": 800 },
      "defense": { "input": 1500, "output": 600 },
      "jury": { "input": 5000, "output": 2000 },
      "judge": { "input": 3000, "output": 1000 }
    }
  }
}
```

## Best Practices

### 1. **Start with One Provider**
Get familiar with the system using a single provider before mixing.

### 2. **Optimize After Validation**
First validate accuracy, then optimize costs with cheaper models for parallel roles.

### 3. **Mix for Diversity**
Once stable, try different providers for different roles to get diverse perspectives.

### 4. **Track Costs**
Always review cost breakdowns. Parallel agents (jury, reviewers) dominate costs.

### 5. **Model Fallbacks**
Have backup models configured in case primary model is unavailable.

## Troubleshooting

### "No API key found"
Set at least one provider's API key:
```bash
export ANTHROPIC_API_KEY="your-key"
```

### "Model not found"
Check provider supports the model. Use provider prefixes:
```toml
model = "openai/gpt-4o"  # Via OpenRouter
model = "anthropic/claude-3.5-sonnet"  # Via OpenRouter
model = "gpt-4o"  # Direct OpenAI
```

### High costs
- Use cheaper models for parallel roles (jury, reviewers)
- Reduce max_tokens
- Cache system prompts (coming soon)
- Use smaller jury sizes for testing

## Roadmap

- [ ] Gemini/Google AI support
- [ ] Ollama support (local models)
- [ ] Model caching for repeated prompts
- [ ] Automatic cost budgets and alerts
- [ ] A/B testing framework for model comparison
- [ ] Provider failover (auto-retry with backup provider)
