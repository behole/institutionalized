# Institutional Reasoning

**LLM decision-making frameworks based on centuries-old human institutional patterns**

Turn your LLM into a courtroom, peer review panel, red team, design studio, and 22 other battle-tested decision-making systems.

## 🎯 Why This Exists

Humans developed sophisticated multi-party reasoning systems over centuries:
- Courts use adversarial evaluation for life-or-death decisions
- Academia uses peer review to validate research
- Military uses red/blue teams to test security
- Medicine uses tumor boards for complex diagnoses

This library implements 26 of these systems as multi-agent LLM frameworks.

## 🚀 Quick Start

```bash
# Install
bun install

# Run a framework
bun cli.ts courtroom examples/courtroom/merge-pr.json --verbose
bun cli.ts six-hats examples/six-hats/decision.md
bun cli.ts pre-mortem examples/pre-mortem/launch.md
bun cli.ts war-gaming scenario.json
bun cli.ts writers-workshop manuscript.md

# Or use as MCP server in Claude Code
# See mcp-server/SETUP.md
```

## 📦 26 Frameworks Implemented

### Tier 1 - MVP (5 frameworks)
| Framework | Use Case | Agents |
|-----------|----------|--------|
| **Courtroom** | Binary decisions under uncertainty | Prosecutor, Defense, Jury (5), Judge |
| **Peer Review** | Validation with author response | Reviewers (3), Author, Editor |
| **Red-Blue Team** | Security stress-testing | Blue (defender), Red (attacker), Observer |
| **Pre-mortem** | Identify failure modes | Pessimists (5), Facilitator |
| **Studio Critique** | Creative work feedback | Peers (3), Creator, Instructor |

### Tier 2 - High Demand (5 frameworks)
| Framework | Use Case | Pattern |
|-----------|----------|---------|
| **Devil's Advocate** | Challenge assumptions | Opposition → Rebuttal → Arbiter |
| **AAR** | Learn from execution | Blameless post-mortem analysis |
| **Six Thinking Hats** | Multi-perspective analysis | 6 hats examine from different angles |
| **PhD Defense** | Rigorous validation | Committee (5) probes deeply |
| **Architecture Review** | System design validation | 5 specialist domains review |

### Tier 3 - Specialized (5 frameworks)
| Framework | Use Case | Key Feature |
|-----------|----------|-------------|
| **Grant Panel** | Prioritize under constraints | Comparative scoring + budget allocation |
| **Intelligence Analysis** | Diagnostic reasoning | Competing hypotheses (CIA method) |
| **Delphi** | Expert consensus | Anonymous iterative rounds |
| **Design Critique** | Design feedback | Peers + stakeholders + facilitator |
| **Consensus Circle** | Unity without voting | Quaker-style blocking concerns |

### Tier 4 - Advanced (5 frameworks)
| Framework | Use Case | Specialty |
|-----------|----------|-----------|
| **Differential Diagnosis** | Systematic troubleshooting | Medical diagnostic reasoning |
| **Socratic** | Test assumptions | Probing questions expose gaps |
| **SWOT** | Strategic assessment | Internal + External + Strategy synthesis |
| **Tumor Board** | Multi-specialty decisions | Specialists from 5 domains |
| **Parliamentary** | Policy discussion | Formal debate structure + vote |

### Tier 5 - Complete Catalog (6 frameworks)
| Framework | Use Case | Origin |
|-----------|----------|--------|
| **War Gaming** | Strategic scenario testing | Military planning |
| **Writers' Workshop** | Manuscript feedback | Clarion/Clarion West |
| **Regulatory Impact** | Policy analysis | Government assessment |
| **Hegelian Dialectic** | Resolve contradictions | Philosophy |
| **Talmudic Dialectic** | Multi-interpretation | Religious textual analysis |
| **Dissertation Committee** | Academic validation | Graduate education |

## 💡 Usage

### CLI

```bash
# Basic usage
bun cli.ts <framework> <input-file> [options]

# Examples
bun cli.ts courtroom case.json --verbose
bun cli.ts peer-review paper.md --reviewers 4 --output results.json
bun cli.ts red-blue system.md --rounds 5
bun cli.ts six-hats decision.md
bun cli.ts differential-diagnosis symptoms.json
bun cli.ts war-gaming scenario.json --max-turns 10
bun cli.ts writers-workshop manuscript.md --peer-count 5

# See all options
bun cli.ts --help
```

### MCP Server (Claude Code Integration)

```bash
# Setup
cd mcp-server
bun install

# Configure Claude Code - see mcp-server/SETUP.md

# Now use in Claude Code:
"Use the courtroom framework to decide: Should I merge this PR?"
"Run a pre-mortem on my launch plan"
"Apply six-hats thinking to this architecture decision"
"Simulate a war game for our market entry strategy"
```

### OpenCode Integration

Use Institutional Reasoning directly within OpenCode for AI-assisted decision-making:

```bash
# In your OpenCode project, the frameworks are available as CLI tools
# Just reference them in your prompts:

"@opencode Run a courtroom evaluation on whether we should refactor this module"
"@opencode Use six-hats to analyze our database migration strategy"
"@opencode Run a pre-mortem on the Q4 product launch plan"
```

**Setup:**
1. Ensure you have an API key set (`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, or `OPENROUTER_API_KEY`)
2. The CLI is automatically available in OpenCode's environment
3. Reference any of the 26 frameworks directly in your prompts

**Example workflow:**
```
User: "@opencode Should we use TypeScript for this new service?"

OpenCode: "I'll run a courtroom evaluation to analyze this decision..."
[Runs courtroom framework with prosecution/defense/jury]
"Based on the evaluation: The jury voted 4-1 in favor. Key factors..."
```

See individual framework READMEs in `frameworks/<name>/README.md` for specific usage patterns and input formats.

### Programmatic

```typescript
import { run as courtroom } from "./frameworks/courtroom";
import { run as sixHats } from "./frameworks/six-hats";
import { run as warGaming } from "./frameworks/war-gaming";

// Run courtroom
const verdict = await courtroom({
  question: "Should we migrate to microservices?",
  context: [
    "Current monolith has scaling issues",
    "Team lacks microservices experience"
  ]
});

// Run six hats
const analysis = await sixHats({
  question: "Should we build vs. buy this feature?",
  context: "B2B SaaS with 50 customers"
});

// Run war gaming
const simulation = await warGaming({
  description: "Market entry against established competitor",
  context: ["Competitor has 70% market share", "Our product superior"]
});
```

## 🏗️ Architecture

### Monorepo Structure
```
institutionalized/
├── cli.ts                    # Unified CLI
├── core/                     # Shared infrastructure
│   ├── orchestrator.ts       # Parallel/sequential/iterative execution
│   ├── providers.ts          # Multi-provider LLM support
│   ├── observability.ts      # Audit trails & cost tracking
│   └── validators.ts         # Common validation patterns
├── frameworks/               # 26 framework implementations
│   ├── courtroom/
│   ├── peer-review/
│   ├── red-blue/
│   ├── war-gaming/
│   ├── writers-workshop/
│   └── ... (21 more)
├── mcp-server/              # MCP integration
├── test/                    # E2E tests for all frameworks
├── benchmark/               # Performance benchmarks
├── website/                 # Landing page
└── examples/                # Working examples
```

### Framework Pattern
Every framework follows this structure:
```
frameworks/<name>/
├── types.ts        # TypeScript interfaces
├── index.ts        # run() function + orchestration
├── package.json    # Workspace package
└── README.md       # Framework documentation
```

### Core Features
- ✅ Multi-provider LLM support (Anthropic, OpenAI, OpenRouter)
- ✅ Full audit trails with replay capability
- ✅ Cost tracking per framework run
- ✅ Parallel agent execution
- ✅ JSON extraction from LLM responses
- ✅ Configurable models per role
- ✅ Validation & error handling
- ✅ 100% TypeScript with full type safety
- ✅ 20 E2E test suites covering all frameworks
- ✅ Individual READMEs for every framework

## 📊 Framework Selection Guide

**Binary decisions**: Courtroom, Devil's Advocate  
**Validation**: Peer Review, PhD Defense, Studio Critique, Dissertation Committee  
**Risk assessment**: Pre-mortem, Red/Blue Team, War Gaming  
**Diagnosis/troubleshooting**: Differential Diagnosis, Intelligence Analysis  
**Consensus building**: Delphi, Consensus Circle, Tumor Board  
**Creative feedback**: Studio Critique, Design Critique, Writers' Workshop  
**Strategic planning**: Six Hats, SWOT, Parliamentary, War Gaming  
**Learning from execution**: AAR, Socratic  
**Policy analysis**: Regulatory Impact, Parliamentary  
**Philosophical reasoning**: Hegelian Dialectic, Talmudic Dialectic, Socratic  

## 🔧 Configuration

### API Keys

Set environment variables or pass via config:
```bash
export ANTHROPIC_API_KEY=sk-ant-...
export OPENAI_API_KEY=sk-...
export OPENROUTER_API_KEY=sk-or-...
```

### Per-Framework Config

```typescript
const result = await run(input, {
  provider: "anthropic",
  config: {
    models: {
      prosecutor: "claude-3-7-sonnet-20250219",
      defense: "claude-3-7-sonnet-20250219",
      judge: "claude-3-7-sonnet-20250219"
    },
    parameters: {
      temperature: 0.7,
      jurySize: 5
    }
  },
  verbose: true
});
```

## 📈 Roadmap

- [x] 26 frameworks implemented (100% of catalog)
- [x] Unified CLI
- [x] MCP server integration
- [x] Core infrastructure (orchestration, observability)
- [x] Working examples
- [x] Test suite (20 E2E test suites)
- [x] Comprehensive documentation (26 READMEs)
- [x] CI/CD pipeline
- [x] Performance benchmarks
- [x] Website/landing page
- [ ] npm package publication
- [ ] Tutorial videos
- [ ] OSS release

## 🤝 Contributing

See `CONTRIBUTING.md` for guidelines on:
- Adding new frameworks
- Improving existing frameworks
- Writing tests
- Documentation contributions

## 📄 License

MIT

## 🙏 Acknowledgments

Inspired by centuries of human institutional wisdom:
- Legal systems (courtroom)
- Academic publishing (peer review, PhD defense, dissertation committee)
- Military doctrine (red/blue, AAR, war gaming)
- Medical practice (differential diagnosis, tumor boards)
- Religious tradition (consensus circle, Socratic dialogue, Talmudic dialectic)
- Business strategy (SWOT, Delphi, pre-mortem)
- Democratic governance (parliamentary, regulatory impact)
- Philosophy (Hegelian dialectic)
- Creative arts (studio critique, writers' workshop)

## 📚 Further Reading

- `ARCHITECTURE.md` - Technical deep dive
- `frameworks-catalog.md` - All 26 cataloged frameworks with detailed descriptions
- `mcp-server/SETUP.md` - MCP integration guide
- `PROGRESS.md` - Implementation progress and milestones
- `STATUS.md` - Current project status
- `benchmark/run-benchmarks.ts` - Performance benchmarking
- `website/index.html` - Landing page

---

**Built with Bun + TypeScript**  
**26 frameworks • 1 unified interface • Infinite possibilities**
