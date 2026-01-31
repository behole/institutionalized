#!/usr/bin/env bun

/**
 * CLI for Peer Review POC
 */

import { resolve } from "path";
import { readFileSync, writeFileSync } from "fs";
import type { Submission, PeerReviewConfig } from "./types";
import {
  runPeerReview,
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

  // Parse arguments
  const submissionPath = args[0];
  const verbose = args.includes("--verbose");
  const numReviewers = getArgValue(args, "--reviewers");
  const noRebuttal = args.includes("--no-rebuttal");
  const outputPath = getArgValue(args, "--output");
  const providerName = getArgValue(args, "--provider");

  // Load submission
  let submission: Submission;
  try {
    const submissionFile = resolve(submissionPath);
    const content = readFileSync(submissionFile, "utf-8");
    submission = JSON.parse(content);
  } catch (error) {
    console.error(`Failed to load submission: ${error}`);
    process.exit(1);
  }

  // Validate submission
  if (!submission.work || submission.work.trim().length === 0) {
    console.error("Submission must include 'work' field");
    process.exit(1);
  }

  // Build config
  const config = getDefaultConfig();

  if (numReviewers) {
    const num = parseInt(numReviewers, 10);
    if (num < 2 || num > 5) {
      console.error("Number of reviewers must be between 2 and 5");
      process.exit(1);
    }
    config.parameters.numReviewers = num;
  }

  if (noRebuttal) {
    config.parameters.enableRebuttal = false;
  }

  // Get provider
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

  // Run peer review
  try {
    const result = await runPeerReview(submission, config, provider, verbose);

    // Format and output
    const formatted = formatResult(result);
    console.log(formatted);

    // Save to file if requested
    if (outputPath) {
      const outputFile = resolve(outputPath);
      writeFileSync(outputFile, JSON.stringify(result, null, 2));
      console.log(`\nFull result saved to: ${outputFile}`);
    }

    // Exit with appropriate code
    const exitCode = result.decision.decision === "reject" ? 1 : 0;
    process.exit(exitCode);
  } catch (error) {
    console.error(`\n❌ Peer review failed: ${error}`);
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
Peer Review POC - Academic peer review with author rebuttal

USAGE:
  bun run peer-review <submission.json> [options]

OPTIONS:
  --reviewers N      Number of reviewers (2-5, default: 3)
  --no-rebuttal      Skip author rebuttal phase
  --output PATH      Save full result JSON to file
  --provider NAME    LLM provider (anthropic, openai, openrouter)
  --verbose          Show detailed progress
  --help             Show this help

SUBMISSION FORMAT:
  {
    "work": "The paper/doc/code to review",
    "context": ["Supporting materials..."],
    "reviewType": "academic" | "technical" | "creative"
  }

EXAMPLES:
  # Basic technical review
  bun run peer-review examples/technical-doc.json

  # Academic paper with 4 reviewers
  bun run peer-review examples/paper.json --reviewers 4 --verbose

  # Quick review without rebuttal
  bun run peer-review examples/code.json --no-rebuttal

  # Save full result
  bun run peer-review examples/spec.json --output result.json

EXIT CODES:
  0 = Accept or Revise
  1 = Reject or Error
`);
}

main();
