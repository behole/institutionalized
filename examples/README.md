# Examples

This directory contains working examples for each institutional reasoning framework.

## Running Examples

Each example can be run via the CLI:

```bash
# From project root
bun cli.ts <framework> examples/<framework>/<example-file> --verbose
```

## Courtroom Examples

**should-publish-essay.json** - Personal decision: publish now vs. wait?
```bash
bun cli.ts courtroom examples/courtroom/should-publish-essay.json --verbose
```

**merge-pr.json** - Code review decision: merge refactor PR?
```bash
bun cli.ts courtroom examples/courtroom/merge-pr.json --verbose
```

## Peer Review Examples

**api-spec.md** - Technical documentation review
```bash
bun cli.ts peer-review examples/peer-review/api-spec.md --reviewers 3 --verbose
```

Expected feedback:
- Strengths: Clear structure, good error codes
- Weaknesses: Missing examples for errors, no websocket spec, pagination could be clearer
- Suggestions: Add rate limit headers spec, clarify soft-delete behavior

## Red/Blue Team Examples

**authentication-system.md** - Security review of auth design
```bash
bun cli.ts red-blue examples/red-blue/authentication-system.md --rounds 2 --verbose
```

Expected vulnerabilities:
- Session fixation attacks
- JWT key rotation strategy missing
- Redis as single point of failure
- No account lockout after failed attempts
- Trust assumptions about internal network

## Pre-mortem Examples

**product-launch.md** - Launch risk assessment
```bash
bun cli.ts pre-mortem examples/pre-mortem/product-launch.md --pessimists 5 --verbose
```

Expected failure scenarios:
- Infrastructure can't handle launch traffic spike
- LLM API costs spiral out of control
- Competitor launches similar product first
- Beta users churn after paywall introduced
- Security vulnerability discovered day of launch

## Studio Critique Examples

**essay-draft.md** - Creative writing feedback
```bash
bun cli.ts studio examples/studio/essay-draft.md --peers 4 --verbose
```

Expected feedback:
- Strengths: Clear thesis, good use of Knuth quote context
- Weaknesses: Examples could be more concrete, conclusion feels abrupt
- Suggestions: Add a real-world case study, expand on "good architecture naturally enables performance"

## Creating Your Own Examples

Each framework expects specific input structure. See framework READMEs for details:

- `frameworks/courtroom/` - Requires `question` and `context`
- `frameworks/peer-review/` - Requires markdown or `work` field
- `frameworks/red-blue/` - Requires `system` description
- `frameworks/pre-mortem/` - Requires `description` of plan
- `frameworks/studio/` - Requires creative `work` to critique

## Example Output

All frameworks return structured JSON results. Use `--output results.json` to save:

```bash
bun cli.ts courtroom examples/courtroom/should-publish-essay.json --output results.json
```

Result includes:
- Full agent transcripts
- Decision/verdict
- Reasoning and rationale
- Metadata (cost, duration, models used)
