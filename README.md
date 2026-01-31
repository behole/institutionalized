# Institutional Reasoning

**LLM decision-making frameworks based on centuries-old human systems.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![Bun](https://img.shields.io/badge/Bun-1.0-black)](https://bun.sh/)

---

## The Problem

People use LLMs for important decisions (code reviews, publishing, hiring, strategy) but get unreliable single-perspective answers.

## The Insight

LLMs already learned institutional decision-making patterns from training data (courts, peer review, military planning). We just need to activate them with the right structure and terminology.

## The Solution

Production-ready tools that wrap LLM reasoning in proven institutional frameworks:

- **Courtroom** - Adversarial evaluation for binary decisions
- **Peer Review** - Academic-style validation with author rebuttal
- **Red/Blue Team** - Military stress-testing for security and architecture
- **Pre-mortem** - Identify failure modes before committing
- **Studio Critique** - Creative work evaluation with peer feedback

Plus 20+ more frameworks (coming soon).

---

## Quick Start

```bash
# Install
bun install institutional-reasoning

# Run a courtroom evaluation
institutional-reasoning courtroom should-i-publish.json

# Run peer review
institutional-reasoning peer-review technical-spec.md --reviewers 3

# Run pre-mortem
institutional-reasoning pre-mortem launch-plan.md --pessimists 5
```

---

## Why This Works

### 1. Leverage Pre-training
LLMs consumed vast amounts of legal arguments, academic reviews, military doctrine. Legal terminology like "exhibit" and "burden of proof" activates learned behaviors about scrutiny and evidence.

### 2. Adversarial = Better
Single-perspective LLM answers are unreliable. Adversarial systems (prosecutor vs. defense, red vs. blue) surface real questions and prevent groupthink.

### 3. Centuries of Refinement
These aren't arbitrary structures—they're systems refined over centuries to handle imperfect information, human bias, and high-stakes decisions.

### 4. Ask LLMs to Argue, Not Rate
LLMs are bad at rating things 1-10 (no calibrated internal scale) but good at constructing arguments. These frameworks force explicit reasoning through language.

---

## Frameworks

### ⚖️ Courtroom (Available)
**For:** Binary decisions under uncertainty
**Example:** Should I merge this PR? Publish this essay? Deploy this feature?

**Roles:**
- Prosecutor builds case for "guilty" (take action)
- Defense mounts rebuttal
- Jury (5 agents) deliberates independently
- Judge synthesizes and renders verdict

**Output:** Guilty / Not Guilty / Dismissed + rationale + actions

```bash
institutional-reasoning courtroom case.json
```

### 📝 Peer Review (In Progress)
**For:** Validation with author response
**Example:** Technical documentation, research proposals, specs

**Roles:**
- 2-4 Reviewers (independent evaluations)
- Author (responds to critiques)
- Editor (synthesizes and decides)

**Output:** Accept / Revise / Reject + required changes

```bash
institutional-reasoning peer-review paper.md --reviewers 3
```

### 🔴🔵 Red Team / Blue Team (Coming Soon)
**For:** Adversarial stress-testing
**Example:** Security review, architecture decisions, finding edge cases

**Roles:**
- Blue Team proposes design/system
- Red Team actively tries to break it
- Observer documents vulnerabilities

**Output:** Vulnerabilities found + severity + mitigations

### ⏪ Pre-mortem (Coming Soon)
**For:** Identify failure modes before commitment
**Example:** Launch decisions, strategic planning, high-stakes commitments

**Roles:**
- Multiple pessimists imagine failure scenarios
- Facilitator synthesizes and ranks risks

**Output:** Ranked failure scenarios + mitigation strategies

### 🎨 Studio Critique (Coming Soon)
**For:** Creative work evaluation
**Example:** Essays, designs, UX, creative projects

**Roles:**
- Peers observe in silence first
- Structured feedback (strengths, weaknesses, questions)
- Creator responds

**Output:** What works / What doesn't / Questions to address

---

## Real-World Results

Based on [Falconer's LLM-as-a-Courtroom](https://falconer.com/notes/llm-as-a-courtroom/) (3 months production):

- **65%** of PRs filtered before review
- **95%** of flagged items filtered before reaching evaluation
- **63%** of evaluations resulted in "no action needed"
- **83%** accuracy when escalating to humans

---

## Architecture

### Shared Core
All frameworks share:
- Multi-agent orchestration (parallel and sequential)
- Programmatic validation (exhibits must be exact quotes, reasoning must be substantial)
- Observability (full audit trails, cost tracking, replay capability)
- Multi-provider support (Anthropic, OpenAI, Ollama)

### Framework Structure
Each framework is:
- **Opinionated** - Not "build your own" but "use courtroom" or "use peer review"
- **Validated** - Programmatic checks prevent hallucination
- **Observable** - Full transcript + cost tracking
- **Configurable** - Model selection, jury size, thresholds

---

## Comparison

### vs. LangChain / AutoGen / CrewAI
They provide generic multi-agent primitives. We provide **opinionated frameworks** based on proven human systems.

### vs. LLM-as-a-Judge Papers
Academic research. We build **production tools** with observability, cost tracking, real-world validation.

### vs. Custom Prompts
Prompts are brittle and not reproducible. These are **engineered systems** with validation, audit trails, and configurable parameters.

---

## Use Cases

### For Developers
- Code review decisions
- Architecture validation
- Security audits
- Technical documentation review

### For Writers
- Essay publishing decisions
- Draft evaluation
- Creative work feedback
- Content strategy

### For Product Teams
- Feature prioritization
- Launch go/no-go decisions
- Strategic planning
- Risk assessment

### For AI Researchers
- Reproducible evaluation frameworks
- Ablation studies
- Benchmark datasets
- Multi-agent research

---

## Installation

```bash
bun install institutional-reasoning
```

Set your API key:
```bash
export ANTHROPIC_API_KEY="your-key"
```

---

## Configuration

```toml
# config.toml
[models]
prosecutor = "claude-3-7-sonnet-20250219"
defense = "claude-3-7-sonnet-20250219"
jury = "claude-3-5-sonnet-20241022"
judge = "claude-3-7-sonnet-20250219"

[parameters]
jury_size = 5
jury_threshold = 3
jury_temperature = 0.9
judge_temperature = 0.2

[validation]
require_exact_quotes = true
min_harm_words = 10
```

---

## Examples

### Courtroom: Should I Publish?
```json
{
  "question": "Should I publish this essay now or wait for more edits?",
  "context": [
    "essays/burnside-v4.md",
    "reviews/critic-panel-feedback.md"
  ]
}
```

```bash
institutional-reasoning courtroom publish-decision.json --verbose
```

### Peer Review: Technical Spec
```bash
institutional-reasoning peer-review api-spec.md \
  --reviewers 3 \
  --output review-results.json
```

### Pre-mortem: Launch Plan
```bash
institutional-reasoning pre-mortem launch-plan.md \
  --pessimists 7 \
  --output risks.json
```

---

## Roadmap

### ✅ Phase 1: MVP (Current)
- [x] Courtroom framework
- [ ] Peer Review framework
- [ ] Red/Blue Team framework
- [ ] Pre-mortem framework
- [ ] Studio Critique framework

### 🚧 Phase 2: Production Hardening
- [ ] Unified CLI for all frameworks
- [ ] Shared core infrastructure
- [ ] Multi-provider support (Anthropic, OpenAI, Ollama)
- [ ] Cost optimization and streaming
- [ ] Comprehensive test suite

### 📋 Phase 3: Expansion
- [ ] 15+ additional frameworks (see [catalog](./frameworks-catalog.md))
- [ ] Web UI for non-technical users
- [ ] IDE integrations (VSCode, JetBrains)
- [ ] CI/CD integrations (GitHub Actions, GitLab)

### 🎯 Phase 4: Community
- [ ] Benchmark suite for accuracy measurement
- [ ] Framework developer guide
- [ ] Community-contributed frameworks
- [ ] Research partnerships

---

## Contributing

We welcome contributions! See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

### Adding a New Framework

1. Study the human decision-making system
2. Define agent roles and data structures
3. Implement agents (one file per role)
4. Add validation logic
5. Write orchestrator
6. Add tests and examples
7. Document with README
8. Submit PR

---

## Research

This project builds on:

- [LLM-as-a-Courtroom (Falconer)](https://falconer.com/notes/llm-as-a-courtroom/)
- [AgentCourt: Simulating Court with Adversarial Agents](https://arxiv.org/abs/2408.08089)
- [Improving Factuality through Multiagent Debate](https://arxiv.org/abs/2305.14325)
- [Constitutional AI (Anthropic)](https://www.anthropic.com/news/claude-new-constitution)

---

## License

MIT License - see [LICENSE](./LICENSE)

---

## Citation

If you use Institutional Reasoning in your research, please cite:

```bibtex
@software{institutional_reasoning,
  title = {Institutional Reasoning: LLM Decision Frameworks Based on Human Systems},
  author = {[Your Name]},
  year = {2026},
  url = {https://github.com/[username]/institutional-reasoning}
}
```

---

## Acknowledgments

Inspired by [Falconer's](https://falconer.com/) production deployment of LLM-as-a-Courtroom and centuries of institutional knowledge encoded in legal systems, academic processes, military doctrine, and creative practices.

---

**Built with:** TypeScript, Bun, Anthropic Claude

**Status:** MVP in development, not yet production-ready

**Feedback:** [Open an issue](https://github.com/[username]/institutional-reasoning/issues) or start a [discussion](https://github.com/[username]/institutional-reasoning/discussions)
