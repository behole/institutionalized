/**
 * Orchestrator - coordinates the full red/blue team process
 */

import type { LLMProvider } from "../../core/types";
import type {
  Target,
  BlueTeamDefense,
  RedTeamAttack,
  BlueTeamResponse,
  ObserverReport,
  RedBlueConfig,
  RedBlueResult,
} from "./types";
import { presentDefense, respondToAttacks } from "./blue-team";
import { conductAttack } from "./red-team";
import { synthesizeReport } from "./observer";

export async function runRedBlueTeam(
  target: Target,
  config: RedBlueConfig,
  provider: LLMProvider,
  verbose: boolean = false
): Promise<RedBlueResult> {
  if (verbose) {
    console.log("\n🔴🔵 RED TEAM / BLUE TEAM EXERCISE INITIATED");
    console.log(`Configuration:`);
    console.log(`  - Red Team Attackers: ${config.parameters.numRedTeam}`);
    console.log(`  - Blue Response: ${config.parameters.enableBlueResponse ? "Enabled" : "Disabled"}`);
    console.log(`  - Threat Model: ${target.threatModel || "security"}`);
    console.log("\n");
  }

  // Phase 1: Blue Team Defense Presentation
  if (verbose) {
    console.log("🔵 PHASE 1: BLUE TEAM DEFENSE PRESENTATION");
    console.log("Blue team presenting system design...\n");
  }

  const defense = await presentDefense(target, config, provider);

  if (verbose) {
    console.log(`Defense presented:`);
    console.log(`  Security measures: ${defense.securityMeasures.length}`);
    console.log(`  Assumptions: ${defense.assumptions.length}`);
    console.log(`  Known limitations: ${defense.knownLimitations.length}`);
    console.log();
  }

  // Phase 2: Red Team Attacks (parallel)
  if (verbose) {
    console.log("🔴 PHASE 2: RED TEAM ATTACKS");
    console.log(`Launching ${config.parameters.numRedTeam} attackers in parallel...\n`);
  }

  const attackPromises = Array.from(
    { length: config.parameters.numRedTeam },
    (_, i) => conductAttack(i + 1, target, defense, config, provider)
  );

  const attacks = await Promise.all(attackPromises);

  if (verbose) {
    attacks.forEach((attack) => {
      console.log(`${attack.attacker} (${attack.focus}):`);
      console.log(`  Vulnerabilities found: ${attack.vulnerabilities.length}`);
      const severities = attack.vulnerabilities.map((v) => v.severity);
      const criticalCount = severities.filter((s) => s === "critical").length;
      const highCount = severities.filter((s) => s === "high").length;
      if (criticalCount > 0) console.log(`    Critical: ${criticalCount}`);
      if (highCount > 0) console.log(`    High: ${highCount}`);
      console.log();
    });
  }

  // Phase 3: Blue Team Response (optional)
  let blueResponse: BlueTeamResponse | undefined;

  if (config.parameters.enableBlueResponse) {
    if (verbose) {
      console.log("🔵 PHASE 3: BLUE TEAM RESPONSE");
      console.log("Blue team responding to attacks...\n");
    }

    blueResponse = await respondToAttacks(
      target,
      defense,
      attacks,
      config,
      provider
    );

    if (verbose) {
      console.log(`Blue team responses:`);
      const accepted = blueResponse.vulnerabilityResponses.filter(
        (r) => r.response === "accepted"
      ).length;
      const disputed = blueResponse.vulnerabilityResponses.filter(
        (r) => r.response === "disputed"
      ).length;
      const mitigated = blueResponse.vulnerabilityResponses.filter(
        (r) => r.response === "mitigated"
      ).length;

      console.log(`  Accepted: ${accepted}`);
      console.log(`  Disputed: ${disputed}`);
      console.log(`  Mitigated: ${mitigated}`);
      if (blueResponse.systemUpdates && blueResponse.systemUpdates.length > 0) {
        console.log(`  System updates: ${blueResponse.systemUpdates.length}`);
      }
      console.log();
    }
  }

  // Phase 4: Observer Synthesis
  if (verbose) {
    console.log("👁️  PHASE 4: OBSERVER SYNTHESIS");
    console.log("Observer evaluating findings...\n");
  }

  const observerReport = await synthesizeReport(
    target,
    defense,
    attacks,
    blueResponse,
    config,
    provider
  );

  if (verbose) {
    console.log(`OVERALL RISK: ${observerReport.overallRisk.toUpperCase()}`);
    console.log(`Confirmed vulnerabilities: ${observerReport.confirmedVulnerabilities.length}`);
    console.log(`\nReadiness: ${observerReport.readinessAssessment}`);
    console.log("\n✅ RED/BLUE TEAM EXERCISE COMPLETE\n");
  }

  return {
    target,
    blueDefense: defense,
    redAttacks: attacks,
    blueResponse,
    observerReport,
    metadata: {
      timestamp: new Date().toISOString(),
      config,
    },
  };
}

export function getDefaultConfig(): RedBlueConfig {
  return {
    models: {
      blueTeam: "claude-3-7-sonnet-20250219",
      redTeam: "claude-3-5-sonnet-20241022",
      observer: "claude-3-7-sonnet-20250219",
    },
    parameters: {
      numRedTeam: 3,
      enableBlueResponse: true,
      redTeamTemperature: 0.8,
      blueTeamTemperature: 0.5,
      observerTemperature: 0.3,
    },
  };
}

export function formatResult(result: RedBlueResult): string {
  let output = "\n" + "=".repeat(80) + "\n";
  output += "RED TEAM / BLUE TEAM RESULT\n";
  output += "=".repeat(80) + "\n\n";

  output += `OVERALL RISK: ${result.observerReport.overallRisk.toUpperCase()}\n`;
  output += `Readiness: ${result.observerReport.readinessAssessment}\n\n`;

  output += `EXECUTIVE SUMMARY:\n${result.observerReport.summary}\n\n`;

  output += `CONFIRMED VULNERABILITIES (${result.observerReport.confirmedVulnerabilities.length}):\n\n`;
  result.observerReport.confirmedVulnerabilities.forEach((vuln, i) => {
    output += `${i + 1}. [${vuln.severity.toUpperCase()}] ${vuln.description}\n`;
    output += `   Status: ${vuln.status.toUpperCase()}\n`;
    output += `   Impact: ${vuln.impact}\n`;
    output += `   Recommendation: ${vuln.recommendation}\n\n`;
  });

  output += `RED TEAM ATTACKS:\n\n`;
  result.redAttacks.forEach((attack) => {
    output += `${attack.attacker} (${attack.focus}):\n`;
    attack.vulnerabilities.forEach((vuln, i) => {
      output += `  ${i + 1}. [${vuln.severity.toUpperCase()}] ${vuln.description}\n`;
      output += `     Exploit: ${vuln.exploit}\n`;
      output += `     Impact: ${vuln.impact}\n`;
    });
    output += `\n`;
  });

  if (result.blueResponse) {
    output += `BLUE TEAM RESPONSES:\n\n`;
    result.blueResponse.vulnerabilityResponses.forEach((resp, i) => {
      output += `${i + 1}. "${resp.vulnerability}":\n`;
      output += `   Response: ${resp.response.toUpperCase()}\n`;
      output += `   ${resp.explanation}\n`;
      if (resp.mitigation) {
        output += `   Mitigation: ${resp.mitigation}\n`;
      }
      output += `\n`;
    });
  }

  output += "=".repeat(80) + "\n";

  return output;
}
