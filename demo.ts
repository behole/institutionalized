#!/usr/bin/env bun

/**
 * Simple demo of Pre-mortem framework
 * Shows real LLM output analyzing a product launch decision
 */

import { AnthropicProvider } from "./core/providers/anthropic";
import { runPreMortem, getDefaultConfig } from "./pre-mortem-poc/src/orchestrator";
import type { Decision } from "./pre-mortem-poc/src/types";

async function main() {
  console.log("\n" + "=".repeat(80));
  console.log("PRE-MORTEM DEMO: Mobile App Launch Decision");
  console.log("=".repeat(80) + "\n");

  // The decision to analyze
  const decision: Decision = {
    proposal: "Launch mobile app to production on February 1st, 2026",
    context: [
      "App is in beta with 500 active users",
      "Marketing campaign already scheduled and ads purchased",
      "Engineering team: 4 developers, no DevOps/SRE",
      "No formal on-call rotation established",
      "Infrastructure: Single Heroku dyno, Postgres, Redis",
      "Beta users report occasional slowness during peak times",
      "Expected launch day traffic: ~10,000 users (20x current)",
    ],
    timeline: "Launch Feb 1st 2026, evaluate Mar 1st 2026",
    stakeholders: [
      "End users",
      "Marketing team",
      "Engineering team",
      "Support team",
      "Executive team",
    ],
  };

  // Setup provider
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("Error: ANTHROPIC_API_KEY environment variable not set");
    process.exit(1);
  }

  const provider = new AnthropicProvider(apiKey);

  // Configure pre-mortem
  const config = getDefaultConfig();
  config.parameters.numPessimists = 3; // 3 failure scenarios
  config.parameters.futureMonths = 1; // 1 month out (March 2026)
  config.models.pessimists = "claude-sonnet-4-20250514";
  config.models.facilitator = "claude-sonnet-4-20250514";

  console.log("🔮 Running Pre-mortem Analysis...");
  console.log(`   - ${config.parameters.numPessimists} pessimists imagining failure scenarios`);
  console.log(`   - Timeline: ${config.parameters.futureMonths} month(s) into the future`);
  console.log(`   - Provider: Anthropic (${config.models.facilitator})`);
  console.log("\n");

  try {
    const result = await runPreMortem(decision, config, provider, true);

    console.log("\n" + "=".repeat(80));
    console.log("RESULTS");
    console.log("=".repeat(80) + "\n");

    console.log(`📊 RECOMMENDATION: ${result.report.recommendation.toUpperCase()}`);
    console.log(`   ${result.report.reasoning}\n`);

    console.log(`🔍 FAILURE SCENARIOS IDENTIFIED:\n`);
    result.report.rankedScenarios.forEach((ranked, i) => {
      const s = ranked.scenario;
      console.log(`${i + 1}. [${ranked.priority.toUpperCase()}] Risk Score: ${ranked.riskScore}/25`);
      console.log(`   ${s.failureDescription}`);
      console.log(`   Root Cause: ${s.rootCause}`);
      console.log(`   Early Warning: ${s.earlyWarningSign}`);
      console.log(`   Preventable: ${s.preventable ? "Yes" : "No"}\n`);
    });

    if (result.report.patterns.length > 0) {
      console.log(`🎯 PATTERNS IDENTIFIED:`);
      result.report.patterns.forEach((pattern, i) => {
        console.log(`   ${i + 1}. ${pattern}`);
      });
      console.log();
    }

    console.log(`💡 MITIGATION STRATEGIES:\n`);
    result.report.mitigations.forEach((mitigation, i) => {
      console.log(`${i + 1}. ${mitigation.action}`);
      console.log(`   Timing: ${mitigation.timing}`);
      console.log(`   Cost: ${mitigation.cost}`);
      console.log(`   Effectiveness: ${mitigation.effectiveness}/5\n`);
    });

    console.log("=".repeat(80) + "\n");

  } catch (error) {
    console.error(`\n❌ Error: ${error}`);
    process.exit(1);
  }
}

main();
