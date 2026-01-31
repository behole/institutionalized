#!/usr/bin/env bun
import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";
import type { Case } from "./types";
import { runCourtroom } from "./orchestrator";

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    printHelp();
    process.exit(0);
  }

  // Parse arguments
  let caseFile: string | null = null;
  let question: string | null = null;
  let contextFiles: string[] = [];
  let outputFile: string | null = null;
  let verbose = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === "--question" || arg === "-q") {
      question = args[++i];
    } else if (arg === "--context" || arg === "-c") {
      contextFiles.push(args[++i]);
    } else if (arg === "--output" || arg === "-o") {
      outputFile = args[++i];
    } else if (arg === "--verbose" || arg === "-v") {
      verbose = true;
    } else if (!arg.startsWith("-")) {
      caseFile = arg;
    }
  }

  // Load case
  let caseInput: Case;

  if (caseFile) {
    // Load from JSON file
    const casePath = resolve(caseFile);
    const caseJson = readFileSync(casePath, "utf-8");
    const caseData = JSON.parse(caseJson);

    // Load context files
    const context = caseData.context.map((path: string) => {
      const fullPath = resolve(path);
      return readFileSync(fullPath, "utf-8");
    });

    caseInput = {
      question: caseData.question,
      context,
      evidence: caseData.evidence,
    };
  } else if (question && contextFiles.length > 0) {
    // Build from CLI args
    const context = contextFiles.map((path) => {
      const fullPath = resolve(path);
      return readFileSync(fullPath, "utf-8");
    });

    caseInput = {
      question,
      context,
    };
  } else {
    console.error("❌ Error: Must provide either a case file or --question with --context\n");
    printHelp();
    process.exit(1);
  }

  // Run courtroom
  try {
    const result = await runCourtroom(caseInput);

    // Save output if requested
    if (outputFile) {
      const outputPath = resolve(outputFile);
      writeFileSync(outputPath, JSON.stringify(result, null, 2));
      console.log(`\n💾 Full results saved to: ${outputPath}`);
    }

    // Print verbose output if requested
    if (verbose) {
      console.log("\n" + "=".repeat(80));
      console.log("FULL COURTROOM TRANSCRIPT");
      console.log("=".repeat(80));

      console.log("\n📋 PROSECUTION");
      console.log("─".repeat(80));
      console.log(result.prosecution.caseStatement);
      console.log("\nExhibits:");
      result.prosecution.exhibits.forEach((ex, i) => {
        console.log(`\n  ${i + 1}. "${ex.sourceQuote}"`);
        console.log(`     → "${ex.targetQuote}"`);
        console.log(`     Harm: ${ex.harm}`);
      });

      console.log("\n🛡️  DEFENSE");
      console.log("─".repeat(80));
      console.log(result.defense.counterArgument);

      console.log("\n👥 JURY");
      console.log("─".repeat(80));
      result.jury.jurors.forEach((juror, i) => {
        console.log(`\nJuror ${i + 1}: ${juror.vote.toUpperCase()}`);
        console.log(juror.reasoning);
      });

      console.log("\n⚖️  JUDGE");
      console.log("─".repeat(80));
      console.log(result.verdict.reasoning);
    }

    // Exit with code based on verdict
    if (result.verdict.decision === "guilty") {
      process.exit(0); // Success - take action
    } else {
      process.exit(1); // Don't take action
    }
  } catch (error) {
    console.error("\n❌ Error running courtroom:");
    console.error(error);
    process.exit(2);
  }
}

function printHelp() {
  console.log(`
🏛️  Courtroom - LLM-as-a-Courtroom Evaluation System

USAGE:
  bun run courtroom <case-file.json> [options]
  bun run courtroom --question "..." --context <file> [options]

OPTIONS:
  -q, --question <text>     The question to evaluate
  -c, --context <file>      Context file (can specify multiple)
  -o, --output <file>       Save full results to JSON file
  -v, --verbose             Print full courtroom transcript
  -h, --help                Show this help

EXAMPLES:
  # Run with case file
  bun run courtroom examples/essay-publish.json

  # Run with inline question
  bun run courtroom --question "Should I merge PR #123?" \\
    --context pr-diff.txt --context tests.log

  # Save results and view full transcript
  bun run courtroom examples/code-commit.json \\
    --output verdict.json --verbose

CASE FILE FORMAT:
  {
    "question": "Should I publish this essay?",
    "context": [
      "path/to/essay.md",
      "path/to/review.md"
    ]
  }

EXIT CODES:
  0 - Verdict: GUILTY (take action)
  1 - Verdict: NOT GUILTY or DISMISSED (don't take action)
  2 - Error occurred
`);
}

main();
