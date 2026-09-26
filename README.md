# Institutional Reasoning

**LLM decision-making frameworks based on centuries-old human institutional patterns**

Turn your LLM into a courtroom, peer review panel, red team, design studio, and 22 other battle-tested decision-making systems.

## 🎯 Why This Exists

Humans developed sophisticated multi-party reasoning systems over centuries:

- Courts use adversarial evaluation for life-or-death decisions
- Academia uses peer review to validate research
- Military uses red/blue teams to test security
- Medicine uses tumor boards for complex diagnoses

This library implements 26 of these systems as **real multi-agent orchestrations** — not prompt templates. Each framework spawns role-specialized LLM agents through a shared engine that owns provider routing, audit trails, cost tracking, and budget guardrails.

**And it's measured, not just asserted.** The built-in eval harness (`eval/`) pits each framework against a single-call baseline on ground-truth cases. First results (gpt-4o-mini, launch-decision case): pre-mortem extracted a correct `delay` decision where a single call returned no clear decision (+1.00 lift); peer-review's structured output scored +0.10 over the baseline on blind rubric judging. Numbers live in `eval/results/`.

## 🚀 Quick Start

```bash
# Install dependencies (Bun runtime)
bun install

# Run a framework
bun cli.ts courtroom case.json --verbose

# Text input works too — no JSON required
echo "Should we sign a 12-month lease given 30% staff growth uncertainty?" > q.txt
bun cli.ts pre-mortem q.txt

# List all 26 frameworks
bun cli.ts --list
```

Key flags:

| Flag                     | Effect                                                 |
| ------------------------ | ------------------------------------------------------ |
| `--verbose`              | Stream per-agent progress, cost, timing                |
| `--provider` / `--model` | Route to anthropic / openai / openrouter, any model ID |
| `--max-cost 0.50`        | Hard cost ceiling — run aborts when reached            |
| `--output-json`          | Machine-readable result with audit trail               |
| `--output FILE`          | Write result JSON to file                              |

**Exit codes encode the decision**: `0` = approve/accept, `1` = reject, `3` = delay/indeterminate, `2` = error. Every framework returns `metadata.decision` (normalized: `approve` | `reject` | `delay` | `unclear`) and `metadata.costUSD`.

## 🏛️ 26 Frameworks

| Intent                   | Frameworks                                                       |
| ------------------------ | ---------------------------------------------------------------- |
| Binary decisions         | courtroom, devil's advocate, parliamentary                       |
| Document/proposal review | peer-review, phd-defense, dissertation-committee, grant-panel    |
| Stress-testing           | red-blue, war-gaming, architecture-review                        |
| Risk & failure analysis  | pre-mortem, regulatory-impact                                    |
| Multi-perspective        | six-hats, socratic, hegelian, talmudic, consensus-circle, delphi |
| Analysis                 | swot, intelligence-analysis, differential-diagnosis, tumor-board |
| Creative critique        | studio, writers' workshop                                        |
| Retrospection            | AAR                                                              |

Full catalog with descriptions: `frameworks-catalog.md` or `bun cli.ts --list`.

## 🔧 Using as a Library

```ts
import { run } from 'institutional-reasoning/frameworks/courtroom';

const result = await run(
  { question: 'Should we merge this PR?', context: ['tests pass', 'no migration needed'] },
  { provider: 'anthropic', model: 'claude-sonnet-4-5', maxCostUSD: 0.5 }
);
console.log(result.verdict.decision, result.metadata.costUSD);
```

Every framework is built on the engine (`core/engine/`): `defineFramework` +
`Session` primitives (`step`, `parallel`), event-driven reporting (the library
never `console.log`s — CLI subscribes a pretty reporter; `--output-json` gives
the full event stream), per-role model registry, audit trail with per-agent
cost attribution, and budget guardrails.

## 📊 Validity

The central claim — _institutional structure produces better decisions than a single call_ — is testable here:

```bash
export OPENAI_API_KEY=... # or ANTHROPIC_API_KEY
bun eval/run.ts --frameworks courtroom,pre-mortem --cases product-launch,api-migration
```

Each case runs the framework AND a single-call baseline on identical inputs, then scores both (binary ground truth, or blind order-randomized LLM rubric judge). Cases live in `eval/cases/`; results in `eval/results/`.

Current status: 4 flagship frameworks instrumented, 4 seed cases, first positive signals (see header). **n is small** — treat as promising, not proven. The harness exists; more cases and seeds are the path to credible numbers.

## 🤖 Claude Code Skill

Install as a skill so Claude Code can orchestrate frameworks on demand: see `skills/institutional-reasoning/SKILL.md`.

## 🤝 Contributing

See `CONTRIBUTING.md`. Adding framework #27 means writing prompts + a flow function — the engine handles providers, parallelism, audit, and reporting.

## 📄 License

MIT

## 📚 Further Reading

- `ARCHITECTURE.md` — engine internals and multi-provider configuration
- `frameworks-catalog.md` — all 26 frameworks, detailed
- `eval/` — the validity harness
- `STATUS.md` — project status

---

**Built with Bun + TypeScript**
**26 frameworks • 1 engine • measured, not vibes**
