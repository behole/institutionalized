# Institutional Reasoning MCP Server

MCP server that exposes all 20 institutional reasoning frameworks as tools for Claude Code and other MCP clients.

## Installation

```bash
cd mcp-server
bun install
```

## Usage

### Claude Code Configuration

Add to your Claude Code MCP settings (`~/.config/claude-code/mcp_settings.json`):

```json
{
  "mcpServers": {
    "institutional-reasoning": {
      "command": "bun",
      "args": [
        "run",
        "/Users/jjoosshhmbpm1/institutionalized/mcp-server/index.ts"
      ],
      "env": {
        "ANTHROPIC_API_KEY": "your-key-here"
      }
    }
  }
}
```

Or use the compiled binary:

```bash
# Build standalone executable
bun run build

# Add to MCP settings
{
  "mcpServers": {
    "institutional-reasoning": {
      "command": "/Users/jjoosshhmbpm1/institutionalized/mcp-server/institutional-reasoning-mcp",
      "env": {
        "ANTHROPIC_API_KEY": "your-key-here"
      }
    }
  }
}
```

### Running Standalone

```bash
# Development
bun run dev

# Build and run compiled version
bun run build
./institutional-reasoning-mcp
```

## Available Tools

All 20 frameworks are exposed as MCP tools:

### Tier 1 - MVP
- `courtroom` - Adversarial evaluation for binary decisions
- `peer-review` - Academic-style validation with author rebuttal
- `red-blue` - Military stress-testing for security
- `pre-mortem` - Identify failure modes before committing
- `studio` - Creative work evaluation with peer feedback

### Tier 2 - High Demand
- `devils-advocate` - Formal challenge to proposals
- `aar` - After-Action Review for learning from execution
- `six-hats` - Multi-perspective analysis
- `phd-defense` - Rigorous proposal validation
- `architecture-review` - System design validation

### Tier 3 - Specialized
- `grant-panel` - Comparative prioritization under constraints
- `intelligence-analysis` - Diagnostic reasoning via competing hypotheses
- `delphi` - Expert consensus building
- `design-critique` - Structured design feedback
- `consensus-circle` - Quaker-style consensus

### Tier 4 - Advanced
- `differential-diagnosis` - Systematic diagnostic reasoning
- `socratic` - Assumption testing through questioning
- `swot` - Strategic situational assessment
- `tumor-board` - Multi-specialist consensus
- `parliamentary` - Adversarial policy discussion

## Example Usage in Claude Code

```
User: "Use the courtroom framework to decide: Should I refactor this codebase now or wait?"

Claude Code will automatically invoke the courtroom tool with appropriate arguments.

User: "Run a pre-mortem on my product launch plan: [details]"

Claude Code will use the pre-mortem framework to identify potential failure modes.

User: "Use six-hats to analyze this technical decision: [decision]"

Claude Code will apply all six thinking hats to the decision.
```

## Framework Input Schemas

Each framework has a specific input schema. Use `verbose: true` for detailed execution logs.

Example courtroom input:
```json
{
  "charge": "Should we migrate to microservices?",
  "evidence": [
    "Current monolith has scaling issues",
    "Team lacks microservices experience",
    "Migration will take 6 months"
  ],
  "context": "Growing startup with 10 engineers",
  "verbose": true
}
```

## Architecture

The MCP server:
1. Dynamically imports framework modules
2. Validates input against schema
3. Executes framework `run()` function
4. Returns structured JSON results
5. Handles errors gracefully

All frameworks share the same core infrastructure (orchestration, validation, observability).

## Development

```bash
# Install dependencies
bun install

# Run in development mode
bun run dev

# Build standalone executable
bun run build

# Test with MCP inspector
npx @modelcontextprotocol/inspector bun run index.ts
```

## Environment Variables

- `ANTHROPIC_API_KEY` - Required for frameworks using Anthropic models
- `OPENAI_API_KEY` - Optional for frameworks using OpenAI
- `OPENROUTER_API_KEY` - Optional for OpenRouter models

## Troubleshooting

**Server not connecting**: Ensure paths in MCP settings are absolute and point to correct location.

**API key errors**: Set environment variables in MCP settings `env` block.

**Framework errors**: Use `verbose: true` to see detailed execution logs.

**Import errors**: Ensure all framework dependencies are installed (`bun install` in project root).
