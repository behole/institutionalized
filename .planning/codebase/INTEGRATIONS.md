# External Integrations

**Analysis Date:** 2026-03-16

## APIs & External Services

**LLM Providers (all optional; at least one required at runtime):**

- Anthropic Claude API - Primary LLM provider for all framework reasoning agents
  - SDK/Client: `@anthropic-ai/sdk` ^0.32.1
  - Implementation: `core/providers/anthropic.ts` (uses official SDK `Anthropic` client)
  - Auth: `ANTHROPIC_API_KEY` environment variable
  - Supported models: `claude-3-7-sonnet-20250219`, `claude-3-5-sonnet-20241022`, `claude-3-opus-20240229`, `claude-3-haiku-20240307`

- OpenAI API - Alternative LLM provider
  - SDK/Client: Raw `fetch` to `https://api.openai.com/v1/chat/completions` (not the `openai` npm SDK despite it being listed as a dependency)
  - Implementation: `core/providers/openai.ts`
  - Auth: `OPENAI_API_KEY` environment variable
  - Supported models: `gpt-5`, `gpt-5-pro`, `gpt-4o`, `gpt-4o-mini`, `gpt-4-turbo`, `o1`, `o1-mini`
  - baseURL is configurable - can point to any OpenAI-compatible endpoint

- OpenRouter API - Multi-model proxy provider
  - SDK/Client: Raw `fetch` to `https://openrouter.ai/api/v1/chat/completions`
  - Implementation: `core/providers/openrouter.ts`
  - Auth: `OPENROUTER_API_KEY` environment variable
  - Headers: `HTTP-Referer: https://github.com/institutional-reasoning`, `X-Title: Institutional Reasoning`
  - Supports models from Anthropic, OpenAI, Google, Meta via single API

**Provider Selection Logic (`core/providers/index.ts`):**
- `getProviderFromEnv()` checks preferred provider first, then falls back: Anthropic → OpenAI → OpenRouter
- All providers implement the `LLMProvider` interface from `core/types.ts`

## Data Storage

**Databases:**
- None. No database dependencies.

**File Storage:**
- Local filesystem only
- Audit logs written via `Bun.write(filepath, ...)` in `core/observability.ts` (`AuditTrail.save()`)
- CLI output optionally saved to JSON file via `--output FILE` flag (`cli.ts`)
- Input files loaded via `Bun.file(filepath)` in `cli.ts`

**Caching:**
- None. No caching layer.

## Authentication & Identity

**Auth Provider:**
- None (no user authentication)
- Service authentication is API-key-based for each LLM provider (see above)
- Keys read via `process.env[envVar] || Bun.env[envVar]` pattern in `core/config.ts`

## Monitoring & Observability

**Error Tracking:**
- None (no Sentry, Datadog, etc.)

**Logs:**
- Custom in-process audit trail via `AuditTrail` class in `core/observability.ts`
- Records per-step: agent name, model, prompt, response, duration, token counts, cost, timestamp
- Produces `AuditLog` JSON with `totalCost`, `totalDuration`, `outcome`
- `formatCostReport()` generates human-readable cost/token summary
- Console output via `console.error()` in MCP server for operational logs

**Cost Tracking:**
- Built-in per-provider cost calculation in each provider's `calculateCost()` method
- Per-million-token pricing tables hardcoded in `core/providers/anthropic.ts`, `openai.ts`, `openrouter.ts`

## MCP Integration

**Protocol:** Model Context Protocol (MCP) via `@modelcontextprotocol/sdk` ^1.0.4

**Server:** `mcp-server/index.ts`
- Transport: `StdioServerTransport` (stdio-based, for use with Claude Code)
- Exposes all 26 frameworks as MCP tools
- Each tool has typed `inputSchema` matching the framework's input contract
- Dynamically imports framework modules on tool invocation

**Client Configuration:** `mcp-server/claude-code-config.json`
- Intended for placement at `~/.config/claude-code/mcp_settings.json`
- Launches server via `bun run /path/to/mcp-server/index.ts`
- Passes `ANTHROPIC_API_KEY` from environment

**Binary Build:** Compiled via `bun build index.ts --compile --outfile institutional-reasoning-mcp`

## CI/CD & Deployment

**Hosting:**
- No deployment target (library/tool, not a hosted service)
- GitHub repository

**CI Pipeline:**
- GitHub Actions (`.github/workflows/test.yml`, `.github/workflows/release.yml`)
- Unit tests: run on every PR and push to main (no API key required)
- E2E tests: run only on main branch pushes; require `ANTHROPIC_API_KEY` GitHub secret
- Release: triggered by version tags (`v*`); builds MCP binary, creates GitHub release with artifacts

**Dependency Updates:**
- Dependabot configured (`.github/dependabot.yml`) - weekly schedule, groups Anthropic/OpenAI/dev deps

## Environment Configuration

**Required env vars (at least one LLM provider key):**
- `ANTHROPIC_API_KEY` - Anthropic Claude API key
- `OPENAI_API_KEY` - OpenAI API key
- `OPENROUTER_API_KEY` - OpenRouter API key

**Secrets location:**
- Runtime: shell environment (no `.env` file)
- CI: GitHub Actions secrets (`ANTHROPIC_API_KEY` used for E2E tests)
- MCP config: `mcp-server/claude-code-config.json` references `${ANTHROPIC_API_KEY}` as a placeholder

## Webhooks & Callbacks

**Incoming:**
- None

**Outgoing:**
- None (all external calls are request/response to LLM provider APIs)

---

*Integration audit: 2026-03-16*
