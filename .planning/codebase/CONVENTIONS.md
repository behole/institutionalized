# Coding Conventions

**Analysis Date:** 2026-03-16

## Naming Patterns

**Files:**
- Framework agent files use lowercase role nouns: `prosecutor.ts`, `defense.ts`, `jury.ts`, `judge.ts`
- Framework orchestrators: `orchestrator.ts` within each framework directory
- Entry points: `index.ts` (public API re-exports), types: `types.ts`
- Test files: `[name].test.ts` (unit) or `[name].e2e.test.ts` (end-to-end)
- Kebab-case for directories and multi-word framework names: `peer-review/`, `red-blue/`, `pre-mortem/`

**Functions:**
- camelCase for exported functions: `executeParallel`, `runCourtroom`, `validateSubstantive`
- Verb-first for action functions: `prosecute()`, `defend()`, `deliberate()`, `renderVerdict()`
- `run()` is the standardized public entry point across all framework `index.ts` files
- Internal helpers use descriptive verbs: `validateExhibits()`, `validateDefense()`, `validateJurorDeliberation()`

**Variables:**
- camelCase for all variables and parameters
- Descriptive names for accumulator/tracking: `guiltyCount`, `notGuiltyCount`, `abstainCount`
- Timing variables: `startTime`, `duration` (always milliseconds from `Date.now()`)

**Types:**
- PascalCase for all interfaces and types: `CourtroomResult`, `JurorDeliberation`, `LLMProvider`
- Interfaces preferred over type aliases for object shapes
- `type` aliases used for union types: `type Vote = "guilty" | "not_guilty" | "abstain"`
- `type Decision = "..."` pattern for constrained string unions
- Config interfaces named `[Framework]Config`: `CourtroomConfig`, `BaseFrameworkConfig`
- Result interfaces named `[Framework]Result`: `CourtroomResult`
- Default configs exported as `DEFAULT_CONFIG` constant from `types.ts`

**Constants:**
- SCREAMING_SNAKE_CASE for module-level constants: `DEFAULT_CONFIG`, `FRAMEWORKS`

## Code Style

**Formatting:**
- No formatter config file found (no `.prettierrc`, `.eslintrc`, or `biome.json`)
- Consistent 2-space indentation throughout
- Double quotes for strings in TypeScript
- Trailing commas in multi-line objects and function parameters
- Single blank line between top-level declarations

**Linting:**
- No linting config detected; `bun tsc --noEmit` (`typecheck` script) serves as the static analysis gate
- TypeScript strict mode enabled (`"strict": true` in `tsconfig.json`)
- `skipLibCheck: true`, `forceConsistentCasingInFileNames: true`

## Import Organization

**Order (observed pattern):**
1. External package imports (`import Anthropic from "@anthropic-ai/sdk"`)
2. Core type imports using `import type` keyword (`import type { LLMProvider } from "../types"`)
3. Local module imports (`import { prosecute } from "./prosecutor"`)

**Path Aliases (from `tsconfig.json`):**
- `@core/*` → `./core/*` — used in test files: `import { parseJSON } from "@core/orchestrator"`
- `@frameworks/*` → `./frameworks/*`

**Import Style:**
- `import type` used consistently for type-only imports
- Named imports preferred; default imports only for SDK packages (`import Anthropic from "@anthropic-ai/sdk"`)

## Error Handling

**Patterns:**
- Validation functions `throw new Error(message)` directly — no custom error classes
- Error messages include contextual data: field names, expected vs actual values, truncated quotes
- Agent output validation happens inline after each LLM call, before returning
- `if (!result) throw new Error(...)` guards after async operations that may return `undefined`
- Provider `call()` methods throw on unexpected response types: `throw new Error("Expected text response from Anthropic")`
- JSON parse failures throw with the raw text for debugging: `throw new Error(\`Did not return valid JSON: \${text}\`)`
- Config/key errors throw with the exact env var name: `throw new Error(\`Missing API key: Set \${envVar} environment variable\`)`

**No try/catch at call sites** — errors propagate upward; callers are responsible for handling.

## Logging

**Framework:** `console.log` directly — no logging library

**Patterns:**
- Framework orchestrators emit structured progress lines to stdout during execution
- Emoji + phase label pattern: `console.log("⚖️  Phase 1: Prosecution")`
- Result summaries use emoji prefix: `console.log("✅ VERDICT: ...")`
- E2E tests use `console.log("\n✅ [Framework] E2E Test Result:")` to summarize outcomes
- No debug/info/warn/error log levels — flat console.log only

## Comments

**When to Comment:**
- JSDoc `/** */` blocks on all exported functions and classes
- Inline `// Step N:` comments in orchestrator sequences to label phases
- `// Used for:` annotation on generic orchestration primitives explaining real use cases
- URL comments for external references: `// https://www.anthropic.com/pricing`
- Short `// [action]` inline comments explaining non-obvious logic

**File-Level:**
- Single-line comment at top of each file describing its purpose: `// Validation patterns for agent outputs`

## Function Design

**Size:** Agent/role functions (prosecutor, defense, jury) are self-contained and typically 80–160 lines including the full prompt template

**Parameters:** Config objects passed explicitly rather than relying on module-level state; exception in older courtroom agents which use a module-level `const anthropic = new Anthropic(...)` instance

**Return Values:**
- Always typed via the return type annotation
- Async functions return `Promise<ConcreteType>` — never `Promise<any>`
- Void functions used for validators that only throw on failure (no return value)

**Default Parameters:**
- Optional parameters have defaults in the function signature: `temperature: number = 0.7`, `maxTokens: number = 2048`

## Module Design

**Exports:**
- Each framework exposes a single `run(input, flags?)` function as the public API from `index.ts`
- `index.ts` re-exports `runCourtroom` and `* from "./types"` for programmatic use
- Core module re-exports everything: `export * from "./types"` etc. in `core/index.ts`

**Barrel Files:**
- `core/index.ts` is a full barrel: re-exports types, providers, orchestrator, validators, observability, config
- Framework `index.ts` files are thin wrappers: normalize input → merge config → call orchestrator → return result
- Framework `types.ts` always exports the `DEFAULT_CONFIG` constant alongside interfaces

## LLM Prompt Conventions

**Prompt Structure:**
- Markdown headings (`## THE QUESTION`, `## CONTEXT MATERIALS`, `## YOUR TASK`)
- Explicit output format section at the end with JSON schema inline
- Mandatory instruction: `IMPORTANT: Return ONLY valid JSON, no markdown formatting, no code blocks.`
- Role declaration at opening: `You are a prosecutor in a courtroom evaluation system.`

**JSON Extraction:**
- All agent outputs parsed via regex: `const jsonMatch = text.match(/\{[\s\S]*\}/)`
- Core `parseJSON<T>()` in `core/orchestrator.ts` handles both markdown code blocks and raw JSON
- Older framework agents (courtroom) do inline regex; new code should use `parseJSON<T>()` from core

---

*Convention analysis: 2026-03-16*
