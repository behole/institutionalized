/**
 * Orchestrator for Pre-mortem framework
 */

import type { LLMProvider } from "@core/types";
import type { Plan, PreMortemConfig, PreMortemResult } from "./types";
import { imagineFailure } from "./pessimist";
import { synthesizeRisks } from "./facilitator";

export async function runPreMortem(
  plan: Plan,
  config: PreMortemConfig,
  provider: LLMProvider,
  verbose: boolean = false
): Promise<PreMortemResult> {
  if (verbose) {
    console.log("\n" + "=".repeat(80));
    console.log("⏪ PRE-MORTEM EXERCISE");
    console.log("=".repeat(80));
    console.log(`\nPlan: ${plan.description}`);
    console.log(`Pessimists: ${config.parameters.numPessimists}\n`);
  }

  // Phase 1: Pessimists imagine failures (parallel)
  if (verbose) {
    console.log("💀 PHASE 1: IMAGINE FAILURE");
    console.log(`${config.parameters.numPessimists} pessimists imagining what could go wrong...\n`);
  }

  const pessimistPromises = Array.from(
    { length: config.parameters.numPessimists },
    (_, i) => imagineFailure(i + 1, plan, config, provider)
  );

  const scenarios = await Promise.all(pessimistPromises);

  if (verbose) {
    scenarios.forEach((scenario) => {
      console.log(`${scenario.pessimist}:`);
      console.log(`  ${scenario.scenario}`);
      console.log(`  Severity: ${scenario.severity} | Likelihood: ${scenario.likelihood}`);
      console.log(`  Root causes: ${scenario.rootCauses.length}`);
      console.log();
    });
  }

  // Phase 2: Facilitator synthesizes
  if (verbose) {
    console.log("🎯 PHASE 2: RISK ASSESSMENT");
    console.log("Facilitator synthesizing scenarios...\n");
  }

  const assessment = await synthesizeRisks(plan, scenarios, config, provider);

  if (verbose) {
    console.log("=".repeat(80));
    console.log(`RISK LEVEL: ${assessment.overallRiskLevel.toUpperCase()}`);
    console.log(`RECOMMENDATION: ${assessment.recommendation.toUpperCase()}`);
    console.log("=".repeat(80));

    console.log(`\nTop Risks (${assessment.topRisks.length}):`);
    assessment.topRisks.forEach((risk, i) => {
      console.log(`  ${i + 1}. [${risk.severity}/${risk.likelihood}] ${risk.scenario.substring(0, 100)}...`);
    });

    console.log(`\nCommon Themes (${assessment.commonThemes.length}):`);
    assessment.commonThemes.forEach((theme, i) => {
      console.log(`  ${i + 1}. ${theme}`);
    });

    console.log(`\nCritical Assumptions (${assessment.criticalAssumptions.length}):`);
    assessment.criticalAssumptions.forEach((assumption, i) => {
      console.log(`  ${i + 1}. ${assumption}`);
    });

    const criticalMitigations = assessment.mitigationPlan.filter(
      (m) => m.priority === "critical" || m.priority === "high"
    );

    if (criticalMitigations.length > 0) {
      console.log(`\nPriority Mitigations (${criticalMitigations.length}):`);
      criticalMitigations.forEach((m, i) => {
        console.log(`  ${i + 1}. [${m.priority}] ${m.action}`);
        console.log(`      Addresses: ${m.risk}`);
        console.log(`      Effort: ${m.effort}`);
      });
    }

    console.log(`\nEarly Warning Signals (${assessment.earlyWarningSystem.length}):`);
    assessment.earlyWarningSystem.forEach((signal, i) => {
      console.log(`  ${i + 1}. ${signal}`);
    });

    console.log("\n" + "=".repeat(80) + "\n");
  }

  return {
    plan,
    scenarios,
    assessment,
    metadata: {
      timestamp: new Date().toISOString(),
      numPessimists: config.parameters.numPessimists,
      config,
    },
  };
}
