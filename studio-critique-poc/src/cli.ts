#!/usr/bin/env bun

/**
 * CLI for Studio Critique POC
 */

import { resolve } from "path";
import { readFileSync, writeFileSync } from "fs";
import type { Work, StudioCritiqueConfig } from "./types";
import {
  runStudioCritique,
  getDefaultConfig,
  formatResult,
} from "./orchestrator";
import { getProvider } from "../../core/providers";

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes("--help")) {
    printUsage();
    process.exit(0);
  }

  const workPath = args[0];
  const verbose = args.includes("--verbose");
  const numPeers = getArgValue(args, "--peers");
  const noResponse = args.includes("--no-response");
  const outputPath = getArgValue(args, "--output");
  const providerName = getArgValue(args, "--provider");

  let work: Work;
  try {
    const workFile = resolve(workPath);
    const content = readFileSync(workFile, "utf-8");
    work = JSON.parse(content);
  } catch (error) {
    console.error(`Failed to load work: ${error}`);
    process.exit(1);
  }

  if (!work.content || work.content.trim().length === 0) {
    console.error("Work must include 'content' field");
    process.exit(1);
  }

  const config = getDefaultConfig();

  if (numPeers) {
    const num = parseInt(numPeers, 10);
    if (num < 2 || num > 6) {
      console.error("Number of peers must be between 2 and 6");
      process.exit(1);
    }
    config.parameters.numPeers = num;
  }

  if (noResponse) {
    config.parameters.enableCreatorResponse = false;
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
    const result = await runStudioCritique(work, config, provider, verbose);

    const formatted = formatResult(result);
    console.log(formatted);

    if (outputPath) {
      const outputFile = resolve(outputPath);
      writeFileSync(outputFile, JSON.stringify(result, null, 2));
      console.log(`\nFull result saved to: ${outputFile}`);
    }

    const exitCode = result.instructorAssessment.readyToShip ? 0 : 1;
    process.exit(exitCode);
  } catch (error) {
    console.error(`\n❌ Studio critique failed: ${error}`);
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
Studio Critique POC - Creative work evaluation

USAGE:
  bun run studio-critique <work.json> [options]

OPTIONS:
  --peers N          Number of peers (2-6, default: 3)
  --no-response      Skip creator response phase
  --output PATH      Save full result JSON to file
  --provider NAME    LLM provider (anthropic, openai, openrouter)
  --verbose          Show detailed progress
  --help             Show this help

WORK FORMAT:
  {
    "content": "The work itself (essay, design, code)",
    "context": "Creator's brief statement",
    "medium": "writing" | "design" | "code" | "other",
    "stage": "draft" | "revision" | "final"
  }

EXAMPLES:
  # Basic critique
  bun run studio-critique examples/essay.json

  # More peers for diverse perspectives
  bun run studio-critique examples/design.json --peers 5 --verbose

  # Quick critique without creator response
  bun run studio-critique examples/code.json --no-response

EXIT CODES:
  0 = Ready to ship
  1 = Needs revision or Error
`);
}

main();
