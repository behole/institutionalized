# Phase 3: Registry and Entry Point Cleanup - Validation

**Phase:** 03-registry-cleanup
**Created:** 2026-06-17
**Status:** Pending execution

## Requirements to Validate

| Requirement | Description                                         | Validation Method                                                                         |
| ----------- | --------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| REG-01      | Create `core/registry.ts` as single source of truth | File exists; grep confirms no duplicate FRAMEWORKS tables in cli.ts or mcp-server         |
| REG-02      | Fix MCP server framework count from 20 to 26        | MCP ListTools returns 26; all 6 missing frameworks present                                |
| REG-03      | Wire CLI and MCP to read from registry              | Both files import from `@core/registry` or `../core/registry`; no inline FRAMEWORKS const |
| PROV-04     | Fix MCP `run(args, args)` double-pass bug           | grep for `run(args, args)` returns 0; handler passes distinct input and flags objects     |

## Must-Have Truths

| #   | Truth                                                                    | How to Verify                                                                                                           |
| --- | ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| 1   | `core/registry.ts` exists and exports `FRAMEWORKS` and `FRAMEWORK_NAMES` | `ls core/registry.ts` + `grep "export const FRAMEWORKS" core/registry.ts`                                               |
| 2   | `cli.ts` imports FRAMEWORKS from registry, no inline table               | `grep "import.*FRAMEWORKS.*registry" cli.ts` matches; `grep -c "const FRAMEWORKS.*Record" cli.ts` = 0                   |
| 3   | `mcp-server/index.ts` imports FRAMEWORKS from registry, no inline table  | `grep "import.*FRAMEWORKS.*registry" mcp-server/index.ts` matches; `grep -c "const FRAMEWORKS" mcp-server/index.ts` = 0 |
| 4   | `bun cli.ts --list` shows 26 frameworks                                  | Run command, count frameworks in output                                                                                 |
| 5   | MCP ListTools returns 26 frameworks                                      | Inspect handler or run server and query                                                                                 |
| 6   | All 6 previously-missing frameworks in MCP                               | grep for hegelian, talmudic, regulatory-impact, war-gaming, writers-workshop, dissertation-committee in registry        |
| 7   | MCP `run(args, args)` bug fixed                                          | `grep "run(args, args)" mcp-server/index.ts` = 0 matches                                                                |
| 8   | `bun run typecheck` passes                                               | Exit code 0                                                                                                             |
| 9   | `bun test` passes                                                        | Exit code 0 (or only pre-existing unrelated failures)                                                                   |

## Anti-Patterns to Check

| Pattern                                        | Check                                                                  |
| ---------------------------------------------- | ---------------------------------------------------------------------- |
| Duplicate FRAMEWORKS table left behind         | grep for `const FRAMEWORKS` across repo — should only be in registry   |
| Registry missing inputSchema for any framework | Each of 26 entries must have inputSchema field                         |
| CLI auto-detection broken                      | AUTO_DETECT_PATTERNS still maps to valid framework names from registry |
| FrameworkName type broken                      | `keyof typeof FRAMEWORKS` still resolves correctly                     |
