/**
 * Orchestrator for Red Team / Blue Team framework
 */

import type { LLMProvider } from "@core/types";
import type { Target, RedBlueConfig, RedBlueResult } from "./types";
import { proposeSystem } from "./blue-team";
import { attackSystem } from "./red-team";
import { synthesizeFindings } from "./observer";

export async function runRedBlue(
  target: Target,
  config: RedBlueConfig,
  provider: LLMProvider,
  verbose: boolean = false
): Promise<RedBlueResult> {
  if (verbose) {
    console.log("\n" + "=".repeat(80));
    console.log("🔴🔵 RED TEAM / BLUE TEAM EXERCISE");
    console.log("=".repeat(80));
    console.log(`\nTarget: ${target.system}`);
    console.log(`Rounds: ${config.parameters.rounds}\n`);
  }

  // Phase 1: Blue Team proposes system
  if (verbose) {
    console.log("🔵 PHASE 1: BLUE TEAM PROPOSAL");
    console.log("Blue Team designing system...\n");
  }

  const blueProposal = await proposeSystem(target, config, provider);

  if (verbose) {
    console.log(`Summary: ${blueProposal.summary}`);
    console.log(`Security Measures: ${blueProposal.securityMeasures.length}`);
    console.log(`Assumptions: ${blueProposal.assumptions.length}\n`);
  }

  // Phase 2: Red Team attacks (multiple rounds)
  if (verbose) {
    console.log("🔴 PHASE 2: RED TEAM ATTACKS");
    console.log(`Running ${config.parameters.rounds} attack rounds...\n`);
  }

  const redAttacks = [];

  for (let round = 1; round <= config.parameters.rounds; round++) {
    if (verbose) {
      console.log(`Round ${round}/${config.parameters.rounds}:`);
    }

    const attack = await attackSystem(
      target,
      blueProposal,
      round,
      config,
      provider
    );

    redAttacks.push(attack);

    if (verbose) {
      console.log(`  Vulnerabilities found: ${attack.vulnerabilities.length}`);
      const criticalCount = attack.vulnerabilities.filter(
        (v) => v.severity === "critical"
      ).length;
      const highCount = attack.vulnerabilities.filter(
        (v) => v.severity === "high"
      ).length;
      if (criticalCount > 0)
        console.log(`    - Critical: ${criticalCount}`);
      if (highCount > 0) console.log(`    - High: ${highCount}`);
      console.log(`  Attack scenarios: ${attack.attackScenarios.length}`);
      console.log();
    }
  }

  // Phase 3: Observer synthesizes
  if (verbose) {
    console.log("👁️  PHASE 3: OBSERVER SYNTHESIS");
    console.log("Observer analyzing findings...\n");
  }

  const observerReport = await synthesizeFindings(
    target,
    blueProposal,
    redAttacks,
    config,
    provider
  );

  if (verbose) {
    console.log("=" .repeat(80));
    console.log(`VERDICT: ${observerReport.verdict.toUpperCase()}`);
    console.log("=".repeat(80));
    console.log(`\nAssessment: ${observerReport.overallAssessment}\n`);

    if (observerReport.criticalVulnerabilities.length > 0) {
      console.log(`Critical Vulnerabilities (${observerReport.criticalVulnerabilities.length}):`);
      observerReport.criticalVulnerabilities.forEach((v, i) => {
        console.log(`  ${i + 1}. [${v.severity.toUpperCase()}] ${v.category}: ${v.description}`);
      });
      console.log();
    }

    if (observerReport.highRiskScenarios.length > 0) {
      console.log(`High-Risk Scenarios (${observerReport.highRiskScenarios.length}):`);
      observerReport.highRiskScenarios.forEach((s, i) => {
        console.log(`  ${i + 1}. ${s.name} (${s.likelihood} likelihood)`);
      });
      console.log();
    }

    if (observerReport.prioritizedActions.length > 0) {
      console.log("Prioritized Actions:");
      observerReport.prioritizedActions.forEach((action, i) => {
        console.log(`  ${i + 1}. ${action}`);
      });
      console.log();
    }

    console.log("=".repeat(80) + "\n");
  }

  return {
    target,
    blueProposal,
    redAttacks,
    observerReport,
    metadata: {
      timestamp: new Date().toISOString(),
      rounds: config.parameters.rounds,
      config,
    },
  };
}
