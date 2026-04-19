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
# Option 1: Install from npm (recommended)
npm install -g institutional-reasoning
institutional-reasoning courtroom case.json --verbose

# Option 2: Run from source
bun install
bun cli.ts courtroom examples/courtroom/merge-pr.json --verbose

# Try it out
institutional-reasoning --list              # List all 26 frameworks
institutional-reasoning --interactive      # Interactive mode
institutional-reasoning courtroom case.json --dry-run
institutional-reasoning six-hats decision.md

# Or use as MCP server in Claude Code
# See mcp-server/SETUP.md
```

**Note: Requires [Bun](https://bun.sh) runtime.** Install with `curl -fsSL https://bun.sh/install | bash`

## 📚 CLI Reference

```bash
# Run a specific framework
institutional-reasoning <framework> <input-file> [options]

# List all available frameworks with descriptions
institutional-reasoning --list

# Interactive mode (select framework from menu)
institutional-reasoning --interactive

# Show version
institutional-reasoning --version

# Show help
institutional-reasoning --help
```

**Framework Auto-Detection**: If you pass a file like `courtroom/case.json`, the CLI will automatically use the `courtroom` framework.

**Common Options:**

- `--verbose, -v` - Show detailed execution logs
- `--output FILE` - Save results to JSON file
- `--dry-run` - Show prompts without calling LLMs
- `--config FILE` - Load custom configuration

## 📦 26 Frameworks Implemented

### Tier 1 - MVP (5 frameworks)

| Framework           | Use Case                           | Agents                                    |
| ------------------- | ---------------------------------- | ----------------------------------------- |
| **Courtroom**       | Binary decisions under uncertainty | Prosecutor, Defense, Jury (5), Judge      |
| **Peer Review**     | Validation with author response    | Reviewers (3), Author, Editor             |
| **Red-Blue Team**   | Security stress-testing            | Blue (defender), Red (attacker), Observer |
| **Pre-mortem**      | Identify failure modes             | Pessimists (5), Facilitator               |
| **Studio Critique** | Creative work feedback             | Peers (3), Creator, Instructor            |

### Tier 2 - High Demand (5 frameworks)

| Framework               | Use Case                   | Pattern                              |
| ----------------------- | -------------------------- | ------------------------------------ |
| **Devil's Advocate**    | Challenge assumptions      | Opposition → Rebuttal → Arbiter      |
| **AAR**                 | Learn from execution       | Blameless post-mortem analysis       |
| **Six Thinking Hats**   | Multi-perspective analysis | 6 hats examine from different angles |
| **PhD Defense**         | Rigorous validation        | Committee (5) probes deeply          |
| **Architecture Review** | System design validation   | 5 specialist domains review          |

### Tier 3 - Specialized (5 frameworks)

| Framework                 | Use Case                     | Key Feature                             |
| ------------------------- | ---------------------------- | --------------------------------------- |
| **Grant Panel**           | Prioritize under constraints | Comparative scoring + budget allocation |
| **Intelligence Analysis** | Diagnostic reasoning         | Competing hypotheses (CIA method)       |
| **Delphi**                | Expert consensus             | Anonymous iterative rounds              |
| **Design Critique**       | Design feedback              | Peers + stakeholders + facilitator      |
| **Consensus Circle**      | Unity without voting         | Quaker-style blocking concerns          |

### Tier 4 - Advanced (5 frameworks)

| Framework                  | Use Case                   | Specialty                                |
| -------------------------- | -------------------------- | ---------------------------------------- |
| **Differential Diagnosis** | Systematic troubleshooting | Medical diagnostic reasoning             |
| **Socratic**               | Test assumptions           | Probing questions expose gaps            |
| **SWOT**                   | Strategic assessment       | Internal + External + Strategy synthesis |
| **Tumor Board**            | Multi-specialty decisions  | Specialists from 5 domains               |
| **Parliamentary**          | Policy discussion          | Formal debate structure + vote           |

### Tier 5 - Complete Catalog (6 frameworks)

| Framework                  | Use Case                   | Origin                     |
| -------------------------- | -------------------------- | -------------------------- |
| **War Gaming**             | Strategic scenario testing | Military planning          |
| **Writers' Workshop**      | Manuscript feedback        | Clarion/Clarion West       |
| **Regulatory Impact**      | Policy analysis            | Government assessment      |
| **Hegelian Dialectic**     | Resolve contradictions     | Philosophy                 |
| **Talmudic Dialectic**     | Multi-interpretation       | Religious textual analysis |
| **Dissertation Committee** | Academic validation        | Graduate education         |

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
import { run as courtroom } from './frameworks/courtroom';
import { run as sixHats } from './frameworks/six-hats';
import { run as warGaming } from './frameworks/war-gaming';

// Run courtroom
const verdict = await courtroom({
  question: 'Should we migrate to microservices?',
  context: ['Current monolith has scaling issues', 'Team lacks microservices experience'],
});

// Run six hats
const analysis = await sixHats({
  question: 'Should we build vs. buy this feature?',
  context: 'B2B SaaS with 50 customers',
});

// Run war gaming
const simulation = await warGaming({
  description: 'Market entry against established competitor',
  context: ['Competitor has 70% market share', 'Our product superior'],
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

## 🎯 Framework Selector

| Framework              | Category       | Purpose                          | Agents                                                                   | Complexity | Best For                    |
| ---------------------- | -------------- | -------------------------------- | ------------------------------------------------------------------------ | ---------- | --------------------------- |
| courtroom              | Decision       | Adversarial binary decisions     | Prosecutor, Defense, Jury×5, Judge                                       | Medium     | High-stakes yes/no          |
| devils-advocate        | Challenge      | Challenge assumptions            | Opposition, Proponent, Arbiter                                           | Simple     | Testing proposals           |
| six-hats               | Analysis       | Multi-perspective analysis       | White, Red, Black, Yellow, Green, Blue Hats                              | Medium     | Strategic thinking          |
| swot                   | Strategy       | Strategic situational assessment | Strengths, Weaknesses, Opportunities, Threats, Synthesizer               | Medium     | Strategic planning          |
| hegelian               | Philosophy     | Resolve contradictions           | Thesis, Antithesis, Synthesis, Moderator                                 | Advanced   | Philosophical reasoning     |
| talmudic               | Analysis       | Multi-interpretation analysis    | Interpreter×4, Moderator                                                 | Advanced   | Textual analysis            |
| peer-review            | Review         | Academic validation              | Reviewers×3, Author, Editor                                              | Medium     | Validating documents        |
| phd-defense            | Validation     | Rigorous proposal validation     | Candidate, Committee×4, Chair                                            | Advanced   | Complex technical proposals |
| dissertation-committee | Academic       | Multi-stage academic validation  | Advisor, Committee×4                                                     | Advanced   | Thesis validation           |
| architecture-review    | Design         | System design validation         | Performance, Security, Scalability, Cost, Maintainability Experts, Chair | Advanced   | System architecture review  |
| design-critique        | Design         | Structured design feedback       | Peers×2, Stakeholders×2, Facilitator                                     | Medium     | Design review               |
| grant-panel            | Prioritization | Comparative prioritization       | Panel×4, Chair                                                           | Advanced   | Budget allocation           |
| pre-mortem             | Risk           | Identify failure modes           | Pessimists×5, Facilitator                                                | Medium     | Launch decisions            |
| aar                    | Retrospective  | Blameless learning               | Facilitator, Participants×3, Observer                                    | Medium     | Post-mortems                |
| intelligence-analysis  | Intelligence   | Diagnostic reasoning             | Analysts×4, Chief Analyst                                                | Advanced   | Diagnostic reasoning        |
| red-blue               | Security       | Adversarial stress-testing       | Blue (Defender), Red (Attacker), Observer                                | Advanced   | Security testing            |
| war-gaming             | Strategy       | Strategic scenario testing       | Blue Team, Red Team, Control, Observer                                   | Advanced   | Strategic planning          |
| differential-diagnosis | Diagnosis      | Systematic troubleshooting       | Chief Diagnostician, Specialists×4                                       | Advanced   | Root cause analysis         |
| socratic               | Philosophy     | Assumption testing               | Socrates, Students×2, Observer                                           | Simple     | Critical thinking           |
| tumor-board            | Medical        | Multi-specialist decisions       | Oncologist, Radiologist, Surgeon, Pathologist, Nurse, Chair              | Advanced   | Complex diagnoses           |
| parliamentary          | Debate         | Adversarial policy discussion    | Government, Opposition, Speaker, Clerk, Observer                         | Advanced   | Policy decisions            |
| regulatory-impact      | Compliance     | Policy impact assessment         | Legal, Economic, Social, Industry Experts, Chair                         | Advanced   | Policy analysis             |
| delphi                 | Consensus      | Expert consensus building        | Experts×5, Facilitator                                                   | Medium     | Expert consensus            |
| consensus-circle       | Consensus      | Unity without voting             | Participants×5, Facilitator                                              | Medium     | Group decision making       |
| studio                 | Creative       | Creative work evaluation         | Peers×3, Creator, Instructor                                             | Medium     | Creative work review        |
| writers-workshop       | Creative       | Manuscript feedback              | Writer, Critiquers×3, Moderator                                          | Medium     | Manuscript review           |

### 📖 Categories Explained

**Decision Frameworks**: For making binary or structured choices. Use when you need a clear yes/no or must choose between options.

**Review Frameworks**: For evaluating and validating work products. Use when you need feedback on documents, code, or creative output.

**Risk Frameworks**: For identifying and mitigating potential problems. Use when planning or before committing to a course of action.

**Security Frameworks**: For testing defenses and finding vulnerabilities. Use when you need to stress-test systems or architectures.

**Validation Frameworks**: For assessing proposals, designs, or systems. Use when you need expert evaluation of complex work.

**Consensus Frameworks**: For building agreement among groups. Use when you need buy-in from multiple stakeholders.

**Challenge Frameworks**: For questioning assumptions and finding weaknesses. Use when you want to pressure-test your thinking.

**Creative Frameworks**: For evaluating creative work. Use when you need feedback on designs, writing, or artistic output.

**Medical Frameworks**: For multi-specialist decision making. Use when you need input from multiple domains or perspectives.

**Analysis Frameworks**: For structured analytical thinking. Use when you need to break down complex problems systematically.

**Strategy Frameworks**: For strategic planning and assessment. Use when you need to plan market entry, competitive positioning, or long-term direction.

---

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

---

## 🎯 Which Framework Should I Use?

Answer a few questions to find your match:

### "I need to make a decision" → courtroom, six-hats, swot, hegelian

- **Need adversarial debate?** → **courtroom** - High-stakes yes/no decisions with prosecutor vs. defense
- **Need multiple perspectives?** → **six-hats** - Six cognitive perspectives (facts, emotions, risks, optimism, creativity, control)
- **Need strategic assessment?** → **swot** - Strengths, Weaknesses, Opportunities, Threats analysis
- **Need dialectical synthesis?** → **hegelian** - Thesis vs. antithesis leading to synthesis

### "I need to review something" → peer-review, phd-defense, dissertation-committee, design-critique

- **Academic paper?** → **peer-review** - Reviewers provide feedback, author responds, editor decides
- **Thesis/dissertation?** → **phd-defense** or **dissertation-committee** - Committee probes deeply
- **Design work?** → **design-critique** - Structured feedback from peers and stakeholders

### "I need to find risks" → pre-mortem, aar, intelligence-analysis

- **Before launching?** → **pre-mortem** - Proactively identify failure modes
- **After something happened?** → **aar** - Blameless post-mortem analysis
- **Diagnostic reasoning?** → **intelligence-analysis** - Competing hypotheses (CIA method)

### "I need to validate a system or design" → architecture-review, red-blue, war-gaming

- **System design?** → **architecture-review** - Multiple technical experts review your design
- **Security testing?** → **red-blue** - Adversarial stress-testing of defenses
- **Strategic scenarios?** → **war-gaming** - Military-style scenario testing

### "I need consensus" → consensus-circle, delphi, parliamentary

- **Without voting?** → **consensus-circle** - Quaker-style consensus through discussion
- **Anonymous expert input?** → **delphi** - Multi-round anonymous expert feedback
- **Adversarial policy debate?** → **parliamentary** - Formal debate with voting

### "I need to challenge assumptions" → devils-advocate, socratic

- **Formal challenge?** → **devils-advocate** - Opposition systematically challenges your proposal
- **Questioning approach?** → **socratic** - Probing questions expose gaps in reasoning

### "I need creative feedback" → studio, writers-workshop

- **Design or art?** → **studio** - Peer critique for creative work
- **Manuscript or novel?** → **writers-workshop** - Clarion-style manuscript feedback

### "I need medical-style diagnosis" → tumor-board, differential-diagnosis

- **Complex multi-specialist decision?** → **tumor-board** - Bring multiple specialties together
- **Root cause analysis?** → **differential-diagnosis** - Systematically narrow down causes

### "I need policy analysis" → regulatory-impact, parliamentary

- **Policy impact assessment?** → **regulatory-impact** - Assess compliance and economic impact
- **Adversarial policy discussion?** → **parliamentary** - Formal debate on policy options

---

## 🔧 Configuration

### API Keys

Set environment variables:

```bash
export ANTHROPIC_API_KEY=sk-ant-...
export OPENAI_API_KEY=sk-...
export OPENROUTER_API_KEY=sk-or-...
```

The system auto-detects available providers. See `ARCHITECTURE.md` for detailed multi-provider configuration.

### Per-Framework Config

```typescript
const result = await run(input, {
  provider: 'anthropic',
  config: {
    models: {
      prosecutor: 'claude-3-7-sonnet-20250219',
      defense: 'claude-3-7-sonnet-20250219',
      judge: 'claude-3-7-sonnet-20250219',
    },
    parameters: {
      temperature: 0.7,
      jurySize: 5,
    },
  },
  verbose: true,
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

- `ARCHITECTURE.md` - Technical deep dive and multi-provider configuration
- `frameworks-catalog.md` - All 26 cataloged frameworks with detailed descriptions
- `mcp-server/SETUP.md` - MCP integration guide
- `STATUS.md` - Current project status
- `benchmark/run-benchmarks.ts` - Performance benchmarking
- `website/index.html` - Landing page

---

**Built with Bun + TypeScript**  
**26 frameworks • 1 unified interface • Infinite possibilities**
