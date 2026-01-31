# MCP Server Setup Guide

## Quick Start

### 1. Install Dependencies

```bash
# From project root
bun install
```

### 2. Configure Claude Code

Add this server to your Claude Code MCP settings:

**Location**: `~/.config/claude-code/mcp_settings.json`

```json
{
  "mcpServers": {
    "institutional-reasoning": {
      "command": "bun",
      "args": [
        "run",
        "/absolute/path/to/institutionalized/mcp-server/index.ts"
      ],
      "env": {
        "ANTHROPIC_API_KEY": "your-anthropic-api-key-here"
      }
    }
  }
}
```

**Important**: Replace `/absolute/path/to/institutionalized` with the actual absolute path!

### 3. Restart Claude Code

After updating MCP settings, restart Claude Code to load the server.

### 4. Verify Installation

In Claude Code, you should see 20 new tools available:
- `courtroom`
- `peer-review`
- `red-blue`
- `pre-mortem`
- `studio`
- `devils-advocate`
- `aar`
- `six-hats`
- `phd-defense`
- `architecture-review`
- `grant-panel`
- `intelligence-analysis`
- `delphi`
- `design-critique`
- `consensus-circle`
- `differential-diagnosis`
- `socratic`
- `swot`
- `tumor-board`
- `parliamentary`

## Usage Examples

### Binary Decision (Courtroom)

```
User: "Should I merge this PR that refactors our authentication system?"

Claude Code: I'll use the courtroom framework to evaluate this decision...
[Invokes courtroom tool with charge="Should we merge the auth refactor PR?"]
```

### Risk Analysis (Pre-mortem)

```
User: "We're about to launch a new feature. What could go wrong?"

Claude Code: Let me run a pre-mortem analysis...
[Invokes pre-mortem tool to identify failure modes]
```

### Multi-Perspective Analysis (Six Hats)

```
User: "Analyze this architecture decision from multiple angles: [decision details]"

Claude Code: I'll apply the Six Thinking Hats method...
[Invokes six-hats tool]
```

### Security Testing (Red-Blue Team)

```
User: "Stress-test this API design for vulnerabilities"

Claude Code: I'll run red-blue team analysis...
[Invokes red-blue tool]
```

## Advanced Configuration

### Using Compiled Binary

Build a standalone executable:

```bash
cd mcp-server
bun run build
```

Then configure Claude Code to use the binary:

```json
{
  "mcpServers": {
    "institutional-reasoning": {
      "command": "/absolute/path/to/institutionalized/mcp-server/institutional-reasoning-mcp",
      "env": {
        "ANTHROPIC_API_KEY": "your-key"
      }
    }
  }
}
```

### Multiple LLM Providers

Set multiple API keys for provider flexibility:

```json
{
  "mcpServers": {
    "institutional-reasoning": {
      "command": "bun",
      "args": ["run", "/path/to/mcp-server/index.ts"],
      "env": {
        "ANTHROPIC_API_KEY": "sk-ant-...",
        "OPENAI_API_KEY": "sk-...",
        "OPENROUTER_API_KEY": "sk-or-..."
      }
    }
  }
}
```

### Verbose Output

Add `verbose: true` to any framework call for detailed logs:

```json
{
  "charge": "Should we migrate to microservices?",
  "verbose": true
}
```

## Troubleshooting

### Server not appearing in Claude Code

1. Check MCP settings path: `~/.config/claude-code/mcp_settings.json`
2. Verify absolute paths (no `~` or relative paths)
3. Restart Claude Code completely
4. Check Claude Code logs for errors

### API Key Errors

Ensure `ANTHROPIC_API_KEY` is set in the `env` block. Get key from: https://console.anthropic.com/

### Framework Execution Errors

- Use `verbose: true` to see detailed execution
- Check that framework inputs match the schema
- Verify all dependencies installed (`bun install` from root)

### Import Errors

If you see "Cannot find module" errors:

```bash
# From project root
bun install

# Verify workspaces
bun pm ls
```

## Development

Test the MCP server using the MCP Inspector:

```bash
npx @modelcontextprotocol/inspector bun run mcp-server/index.ts
```

This opens a web interface to test tool calls directly.

## Framework Documentation

For detailed documentation on each framework's inputs and outputs, see:
- Project root `README.md`
- Framework-specific READMEs in `frameworks/*/`
- `frameworks-catalog.md` for complete framework descriptions
