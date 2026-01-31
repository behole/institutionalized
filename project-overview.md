---
title: Institutional Reasoning - LLM Decision Frameworks
date: 2026-01-29
status: concept
type: project
tags: ai, systems, tools, decision-making
---

# Institutional Reasoning

**Tagline:** Deployable LLM decision-making tools based on centuries-old human systems

## The Core Idea

Build a library of production-ready tools that wrap LLM reasoning in proven institutional frameworks. Not toy demos—actual deployable systems for high-stakes decisions.

Each tool implements a different refined human decision-making system:
- Courtroom (legal adversarial)
- Peer Review (academic validation)
- Red Team/Blue Team (military stress-testing)
- Studio Critique (creative evaluation)
- Pre-mortem (risk assessment)
- PhD Defense (proposal validation)
- And 15+ more...

## Why This Matters

**The problem:** People use LLMs for important decisions (code reviews, strategy, hiring, publishing) but get unreliable single-perspective answers.

**The insight:** LLMs already learned these institutional patterns from training data. We just need to activate them with the right structure and terminology.

**The opportunity:** No one has systematically productized these frameworks. Falconer built courtroom for docs. That's one. There are dozens more.

## What Makes This Different

**Not research:** Don't need to prove multi-agent debate works (papers exist). Build the tools.

**Not theory:** Don't write about how courts could work for AI. Ship working courtrooms.

**Not consulting:** Don't sell services. Ship tools people can run themselves.

**Not prompts:** Don't share markdown files. Ship actual software with orchestration, validation, observability.

## Target Users

1. **Individual developers** - Better code reviews, architecture decisions, debugging
2. **Engineering teams** - Standardized decision frameworks, audit trails
3. **Content creators** - Essay reviews, publishing decisions, creative validation
4. **Product teams** - Feature prioritization, risk assessment, strategic planning
5. **AI researchers** - Reproducible evaluation frameworks, ablation studies

## The Product Vision

### MVP: 5 Core Tools

1. **Courtroom** - Binary decisions under uncertainty
2. **Peer Review** - Validation with rebuttal process
3. **Red/Blue Team** - Adversarial stress-testing
4. **Pre-mortem** - Risk identification before commitment
5. **Studio Critique** - Creative work evaluation

Each as:
- CLI tool (run locally)
- MCP server (integrate with Claude Code, etc.)
- API endpoint (for integrations)
- Web interface (for non-technical users)

### Full Vision: 20+ Frameworks

Systematically implement every proven human decision-making system:
- Academic: PhD defense, grant review, dissertation committee
- Military: AAR, intelligence analysis, competing hypotheses
- Business: Six Thinking Hats, Delphi method, devil's advocate
- Design: Architecture review, design critique, writers' workshop
- Governance: Parliamentary debate, consensus circles, impact assessment
- Medical: Tumor board, differential diagnosis
- Philosophical: Talmudic dialectic, Socratic method, Hegelian synthesis

## Technical Architecture

### Modular Design

```
institutional-reasoning/
├── core/
│   ├── orchestrator.ts      # Multi-agent coordination
│   ├── validators.ts         # Evidence/exhibit validation
│   ├── models.ts            # Multi-provider support
│   └── observability.ts     # Logging, tracing, replay
├── frameworks/
│   ├── courtroom/
│   │   ├── prosecutor.ts
│   │   ├── defense.ts
│   │   ├── jury.ts
│   │   └── judge.ts
│   ├── peer-review/
│   ├── red-blue-team/
│   └── ...
├── interfaces/
│   ├── cli/                 # Bun-based CLI
│   ├── mcp/                 # MCP server
│   ├── api/                 # REST/GraphQL API
│   └── web/                 # Web UI (optional)
└── examples/
    ├── code-review/
    ├── essay-evaluation/
    └── architecture-decision/
```

### Key Technical Principles

1. **Multi-provider** - Support Anthropic, OpenAI, Google, open models
2. **Configurable** - Jury size, thresholds, model assignments, all tunable
3. **Observable** - Full audit trail, replay capability, debug modes
4. **Fast** - Parallel execution where possible, streaming results
5. **Cost-aware** - Track tokens/costs, optimize model selection
6. **Validated** - Programmatic checks (quotes exist in source, harm is specific)
7. **Composable** - Combine frameworks (courtroom + pre-mortem)

## Differentiators

### vs. LangChain/AutoGen/CrewAI
They provide generic multi-agent primitives. We provide **opinionated frameworks** based on proven human systems. Not "build your own," but "use courtroom/peer-review/red-team."

### vs. LLM-as-a-Judge papers
Academic research. We build production tools with observability, cost tracking, configurability.

### vs. Falconer
They built one framework (courtroom) for one use case (doc updates). We're building the full library for general use.

### vs. Custom prompt engineering
Prompts are brittle, not reproducible, no observability. These are engineered systems with validation, audit trails, configurable parameters.

## Monetization Paths

### Open Core Model
- **Free tier:** CLI + MCP server, self-hosted, OSS
- **Pro tier:** Hosted API, web UI, team features, SSO
- **Enterprise:** On-prem deployment, custom frameworks, SLAs

### Per-Framework Pricing
- Core 5 frameworks: free/OSS
- Additional frameworks: paid add-ons
- Custom framework development: consulting

### API/Usage-Based
- Free tier: 100 decisions/month
- Pay-as-you-go: $X per decision
- Enterprise: Volume discounts

### Don't Monetize (if pure research/impact)
- Everything OSS
- Grant funding for development
- Academic/industry partnerships

## Success Metrics

### Technical
- Frameworks implemented: 5 → 20+
- Accuracy on benchmark tasks: >80% match to human expert panels
- Latency: P95 < 30 seconds for complex evaluations
- Cost: <$0.50 per decision on average

### Adoption
- GitHub stars: 1K → 10K
- Active installations: 100 → 10,000
- Integration partnerships: 5+ (IDEs, code review tools, etc.)
- Academic citations: Papers using our frameworks for evaluation

### Business (if pursuing)
- MRR: $10K → $100K
- Enterprise customers: 5+
- Community contributors: 50+

## Phases

### Phase 1: Proof of Concept (2-4 weeks)
- Build Courtroom framework end-to-end
- CLI + basic MCP server
- Test on real decisions (code review, essay publishing)
- Document what works / doesn't work
- Open source, gather feedback

### Phase 2: Core 5 Frameworks (2-3 months)
- Implement Peer Review, Red/Blue, Pre-mortem, Studio Critique
- Shared orchestration layer
- Multi-provider support (Anthropic, OpenAI, open models)
- Web UI for non-technical users
- Documentation + examples

### Phase 3: Production Hardening (1-2 months)
- Observability: logging, tracing, replay
- Cost optimization: smart model selection
- Validation: programmatic checks on evidence
- Performance: parallel execution, streaming
- Security: input sanitization, rate limiting

### Phase 4: Scale & Expand (ongoing)
- Implement 15+ additional frameworks
- Integration partnerships (GitHub, GitLab, Notion, etc.)
- Community: contributors, custom frameworks
- Research: benchmark against human expert panels
- Business model validation (if pursuing)

## Open Questions

1. **OSS vs. commercial?** Pure open source for impact, or open-core for sustainability?

2. **Which 5 frameworks for MVP?** Courtroom is #1. What are #2-5 based on demand/impact?

3. **Integration strategy?** Focus on dev tools (IDEs, code review) or broader (Notion, docs, Slack)?

4. **Academic partnership?** Team up with HCI/AI researchers for rigorous evaluation?

5. **Name?** "Institutional Reasoning" is descriptive but bland. Something catchier?

6. **Target first?** Developers (code review), writers (essay evaluation), or product teams (prioritization)?

## Why Now

1. **Models are good enough** - Claude 3.5+, GPT-4o can handle complex multi-turn reasoning
2. **Courtroom proof point** - Falconer showed 83% accuracy in production
3. **Multi-agent explosion** - Tools emerging but no opinionated frameworks
4. **Decision fatigue** - People drowning in decisions, need structured help
5. **AI trust gap** - Single-perspective LLM answers aren't reliable enough for high-stakes
6. **Gap in market** - Generic multi-agent tools exist, specific frameworks don't

## The Vision

A world where every high-stakes decision has access to centuries of institutional wisdom, mediated through AI.

Not "ask ChatGPT," but "run this through peer review" or "subject this to adversarial testing" or "pre-mortem this plan."

Structured, reproducible, observable decision-making that combines AI capability with human institutional knowledge.

## Next Steps

1. Validate demand - talk to 10 potential users (developers, writers, product people)
2. Build Courtroom MVP - end-to-end working system
3. Test on real decisions - gather accuracy data
4. Decide: OSS project or startup?
5. If startup: incorporation, funding strategy
6. If OSS: community building, academic partnerships

## Related Work

- [Falconer's LLM-as-a-Courtroom](https://falconer.com/notes/llm-as-a-courtroom/)
- [AgentCourt paper](https://arxiv.org/abs/2408.08089)
- [Multiagent Debate paper](https://arxiv.org/abs/2305.14325)
- Constitutional AI (Anthropic)
- AutoGen (Microsoft Research)
- CrewAI
- LangGraph

## Resources

- **Research:** [../03_Resources/llm-refined-human-systems-theme.md](../03_Resources/llm-refined-human-systems-theme.md)
- **Courtroom notes:** [../03_Resources/llm-as-courtroom-jan-2026.md](../03_Resources/llm-as-courtroom-jan-2026.md)
- **Framework catalog:** [frameworks-catalog.md](frameworks-catalog.md) (to be created)
