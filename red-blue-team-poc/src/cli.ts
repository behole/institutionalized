#!/usr/bin/env bun

/**
 * CLI for Red Team / Blue Team POC
 */

import { resolve } from "path";
import { readFileSync, writeFileSync } from "fs";
import type { Target, RedBlueConfig } from "./types";
import { runRedBlueTeam, getDefaultConfig, formatResult } from "./orchestrator";
import { getProvider } from "../../core/providers";

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes("--help")) {
    printUsage();
    process.exit(0);
  }

  const targetPath = args[0];
  const verbose = args.includes("--verbose");
  const numRedTeam = getArgValue(args, "--red-team");
  const noResponse = args.includes("--no-response");
  const threatModel = getArgValue(args, "--threat");
  const outputPath = getArgValue(args, "--output");
  const providerName = getArgValue(args, "--provider");

  let target: Target;
  try {
    const targetFile = resolve(targetPath);
    const content = readFileSync(targetFile, "utf-8");
    target = JSON.parse(content);
  } catch (error) {
    console.error(`Failed to load target: ${error}`);
    process.exit(1);
  }

  if (!target.system || target.system.trim().length === 0) {
    console.error("Target must include 'system' field");
    process.exit(1);
  }

  if (threatModel) {
    target.threatModel = threatModel;
  }

  const config = getDefaultConfig();

  if (numRedTeam) {
    const num = parseInt(numRedTeam, 10);
    if (num < 1 || num > 5) {
      console.error("Number of red team attackers must be between 1 and 5");
      process.exit(1);
    }
    config.parameters.numRedTeam = num;
  }

  if (noResponse) {
    config.parameters.enableBlueResponse = false;
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
    const result = await runRedBlueTeam(target, config, provider, verbose);

    const formatted = formatResult(result);
    console.log(formatted);

    if (outputPath) {
      const outputFile = resolve(outputPath);
      writeFileSync(outputFile, JSON.stringify(result, null, 2));
      console.log(`\nFull result saved to: ${outputFile}`);
    }

    const exitCode = result.observerReport.overallRisk === "critical" ? 1 : 0;
    process.exit(exitCode);
  } catch (error) {
    console.error(`\n❌ Red/Blue team exercise failed: ${error}`);
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
Red Team / Blue Team POC - Adversarial security testing

USAGE:
  bun run red-blue <target.json> [options]

OPTIONS:
  --red-team N       Number of red team attackers (1-5, default: 3)
  --no-response      Skip blue team response phase
  --threat MODEL     Threat model: security, reliability, performance
  --output PATH      Save full result JSON to file
  --provider NAME    LLM provider (anthropic, openai, openrouter)
  --verbose          Show detailed progress
  --help             Show this help

TARGET FORMAT:
  {
    "system": "System to test",
    "context": ["Supporting materials..."],
    "scope": ["What to test..."],
    "threatModel": "security" | "reliability" | "performance"
  }

EXAMPLES:
  # Basic security test
  bun run red-blue examples/api-system.json

  # More red team attackers
  bun run red-blue examples/architecture.json --red-team 4 --verbose

  # Quick test without blue response
  bun run red-blue examples/quick.json --no-response

  # Reliability testing
  bun run red-blue examples/system.json --threat reliability

EXIT CODES:
  0 = Low/Medium/High risk
  1 = Critical risk or Error
`);
}

main();
