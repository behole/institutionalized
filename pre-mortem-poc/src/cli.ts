#!/usr/bin/env bun

/**
 * CLI for Pre-mortem POC
 */

import { resolve } from "path";
import { readFileSync, writeFileSync } from "fs";
import type { Decision, PreMortemConfig } from "./types";
import { runPreMortem, getDefaultConfig, formatResult } from "./orchestrator";
import { getProvider } from "../../core/providers";

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes("--help")) {
    printUsage();
    process.exit(0);
  }

  const decisionPath = args[0];
  const verbose = args.includes("--verbose");
  const numPessimists = getArgValue(args, "--pessimists");
  const futureMonths = getArgValue(args, "--timeline");
  const outputPath = getArgValue(args, "--output");
  const providerName = getArgValue(args, "--provider");

  let decision: Decision;
  try {
    const decisionFile = resolve(decisionPath);
    const content = readFileSync(decisionFile, "utf-8");
    decision = JSON.parse(content);
  } catch (error) {
    console.error(`Failed to load decision: ${error}`);
    process.exit(1);
  }

  if (!decision.proposal || decision.proposal.trim().length === 0) {
    console.error("Decision must include 'proposal' field");
    process.exit(1);
  }

  const config = getDefaultConfig();

  if (numPessimists) {
    const num = parseInt(numPessimists, 10);
    if (num < 2 || num > 6) {
      console.error("Number of pessimists must be between 2 and 6");
      process.exit(1);
    }
    config.parameters.numPessimists = num;
  }

  if (futureMonths) {
    const months = parseInt(futureMonths, 10);
    if (months < 1 || months > 24) {
      console.error("Future timeline must be between 1 and 24 months");
      process.exit(1);
    }
    config.parameters.futureMonths = months;
  }

  let provider;
  try {
    provider = getProvider(providerName);
  } catch (error) {
    console.error(`Provider error: ${error}`);
    process.exit(1);
  }

  if (verbose) {
    console.log(`Using provider: ${provider.name}`);
  }

  try {
    const result = await runPreMortem(decision, config, provider, verbose);

    const formatted = formatResult(result);
    console.log(formatted);

    if (outputPath) {
      const outputFile = resolve(outputPath);
      writeFileSync(outputFile, JSON.stringify(result, null, 2));
      console.log(`\nFull result saved to: ${outputFile}`);
    }

    const exitCode = result.report.recommendation === "abort" ? 1 : 0;
    process.exit(exitCode);
  } catch (error) {
    console.error(`\n❌ Pre-mortem failed: ${error}`);
    if (verbose && error instanceof Error) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

function getArgValue(args: string[], flag: string): string | undefined {
  const index = args.indexOf(flag);
  if (index !== -1 && index + 1 < args.length) {
    return args[index + 1];
  }
  return undefined;
}

function printUsage() {
  console.log(`
Pre-mortem POC - Failure mode analysis before commitment

USAGE:
  bun run pre-mortem <decision.json> [options]

OPTIONS:
  --pessimists N     Number of pessimists (2-6, default: 3)
  --timeline N       Months into future (1-24, default: 6)
  --output PATH      Save full result JSON to file
  --provider NAME    LLM provider (anthropic, openai, openrouter)
  --verbose          Show detailed progress
  --help             Show this help

DECISION FORMAT:
  {
    "proposal": "What you're considering",
    "context": ["Background", "Constraints", ...],
    "timeline": "When this would happen",
    "stakeholders": ["Who's affected", ...]
  }

EXAMPLES:
  # Basic pre-mortem
  bun run pre-mortem examples/product-launch.json

  # More pessimists for thorough analysis
  bun run pre-mortem examples/migration.json --pessimists 5 --verbose

  # Different timeline
  bun run pre-mortem examples/decision.json --timeline 12

EXIT CODES:
  0 = Proceed / Proceed with caution / Reconsider
  1 = Abort or Error
`);
}

main();
