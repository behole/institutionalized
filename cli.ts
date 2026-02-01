#!/usr/bin/env bun
/**
 * Unified CLI for Institutional Reasoning frameworks
 *
 * Usage:
 *   bun cli.ts <framework> <input-file> [options]
 *
 * Examples:
 *   bun cli.ts courtroom case.json --verbose
 *   bun cli.ts peer-review paper.md --reviewers 3
 *   bun cli.ts red-blue architecture.md --rounds 5
 */

const FRAMEWORKS = {
  // Tier 1 - MVP
  courtroom: "Adversarial evaluation for binary decisions",
  "peer-review": "Academic-style validation with author rebuttal",
  "red-blue": "Military stress-testing for security and architecture",
  "pre-mortem": "Identify failure modes before committing",
  studio: "Creative work evaluation with peer feedback",
  // Tier 2 - High Demand
  "devils-advocate": "Formal challenge to proposals",
  aar: "Blameless learning from execution",
  "six-hats": "Multi-perspective analysis",
  "phd-defense": "Rigorous proposal validation",
  "architecture-review": "System design validation",
  // Tier 3 - Specialized
  "grant-panel": "Comparative prioritization under constraints",
  "intelligence-analysis": "Diagnostic reasoning via competing hypotheses",
  delphi: "Expert consensus building",
  "design-critique": "Structured design feedback",
  "consensus-circle": "Quaker-style consensus without voting",
  // Tier 4 - Advanced
  "differential-diagnosis": "Systematic diagnostic reasoning",
  socratic: "Assumption testing through questioning",
  swot: "Strategic situational assessment",
  "tumor-board": "Multi-specialist consensus for complex decisions",
  parliamentary: "Adversarial policy discussion",
  // Remaining Frameworks (Tier 5)
  "war-gaming": "Military scenario testing for strategic planning",
  "writers-workshop": "Manuscript feedback in Clarion style",
  "regulatory-impact": "Comprehensive policy impact assessment",
  hegelian: "Thesis-antithesis-synthesis dialectic",
  talmudic: "Multi-interpretation textual analysis",
  "dissertation-committee": "Multi-stage academic work validation",
} as const;

type FrameworkName = keyof typeof FRAMEWORKS;

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    showHelp();
    process.exit(0);
  }

  if (args[0] === "--version" || args[0] === "-v") {
    const pkg = await Bun.file("package.json").json();
    console.log(`institutional-reasoning v${pkg.version}`);
    process.exit(0);
  }

  const framework = args[0] as FrameworkName;

  if (!Object.keys(FRAMEWORKS).includes(framework)) {
    console.error(`❌ Unknown framework: ${framework}\n`);
    console.error("Available frameworks:");
    for (const [name, desc] of Object.entries(FRAMEWORKS)) {
      console.error(`  ${name.padEnd(15)} - ${desc}`);
    }
    process.exit(1);
  }

  const inputFile = args[1];
  if (!inputFile) {
    console.error(`❌ No input file specified\n`);
    console.error(`Usage: bun cli.ts ${framework} <input-file> [options]`);
    process.exit(1);
  }

  // Parse common flags
  const flags = parseFlags(args.slice(2));

  try {
    await runFramework(framework, inputFile, flags);
  } catch (error) {
    console.error(`\n❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    if (flags.verbose && error instanceof Error) {
      console.error(`\nStack trace:\n${error.stack}`);
    }
    process.exit(2);
  }
}

async function runFramework(
  framework: FrameworkName,
  inputFile: string,
  flags: Record<string, any>
) {
  // Dynamic import based on framework
  const frameworkPath = `./frameworks/${framework}/index.ts`;

  try {
    const module = await import(frameworkPath);

    if (!module.run) {
      throw new Error(`Framework ${framework} does not export a 'run' function`);
    }

    // Load input file
    const input = await loadInput(inputFile);

    if (flags.verbose) {
      console.log(`\n📂 Input file: ${inputFile}`);
      console.log(`🎯 Framework: ${framework}`);
      console.log(`⚙️  Flags: ${JSON.stringify(flags, null, 2)}\n`);
    }

    // Run the framework
    const result = await module.run(input, flags);

    // Handle output
    if (flags.output) {
      await Bun.write(flags.output, JSON.stringify(result, null, 2));
      console.log(`\n💾 Results saved to: ${flags.output}`);
    }

    // Exit code based on decision
    if (result.verdict) {
      const decision = result.verdict.decision || result.decision;
      if (decision === "guilty" || decision === "accept" || decision === "pass") {
        process.exit(0);
      } else if (decision === "not_guilty" || decision === "reject" || decision === "fail") {
        process.exit(1);
      } else {
        process.exit(3); // Indeterminate
      }
    }

    process.exit(0);
  } catch (error) {
    if (error instanceof Error && error.message.includes("Cannot find module")) {
      console.error(`\n❌ Framework '${framework}' not yet implemented`);
      console.error(`   Expected module at: ${frameworkPath}`);
      process.exit(2);
    }
    throw error;
  }
}

async function loadInput(filepath: string): Promise<any> {
  const file = Bun.file(filepath);
  const exists = await file.exists();

  if (!exists) {
    throw new Error(`Input file not found: ${filepath}`);
  }

  // Try to parse as JSON first
  if (filepath.endsWith(".json")) {
    return file.json();
  }

  // Otherwise treat as text
  const text = await file.text();

  // Try to parse as JSON anyway
  try {
    return JSON.parse(text);
  } catch {
    // Return as plain text
    return { content: text };
  }
}

function parseFlags(args: string[]): Record<string, any> {
  const flags: Record<string, any> = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const next = args[i + 1];

      if (next && !next.startsWith("--")) {
        // Has value
        flags[key] = next;
        i++;
      } else {
        // Boolean flag
        flags[key] = true;
      }
    } else if (arg.startsWith("-")) {
      // Short flag (always boolean)
      flags[arg.slice(1)] = true;
    }
  }

  return flags;
}

function showHelp() {
  console.log(`
Institutional Reasoning - LLM Decision Frameworks

Usage:
  bun cli.ts <framework> <input-file> [options]

Frameworks:
${Object.entries(FRAMEWORKS)
  .map(([name, desc]) => `  ${name.padEnd(15)} - ${desc}`)
  .join("\n")}

Common Options:
  --verbose         Show detailed execution logs
  --output FILE     Save results to JSON file
  --config FILE     Load custom configuration
  --dry-run         Show prompts without calling LLMs
  --help, -h        Show this help message
  --version, -v     Show version number

Examples:
  bun cli.ts courtroom case.json --verbose
  bun cli.ts peer-review paper.md --reviewers 3 --output results.json
  bun cli.ts red-blue architecture.md --rounds 5
  bun cli.ts pre-mortem plan.md --pessimists 7

Exit Codes:
  0  Positive decision (guilty, accept, pass)
  1  Negative decision (not guilty, reject, fail)
  2  Error occurred
  3  Indeterminate (dismissed, abstain)

Documentation: https://github.com/[username]/institutional-reasoning
`);
}

// Run if executed directly
if (import.meta.main) {
  main();
}
