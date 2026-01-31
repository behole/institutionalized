/**
 * Orchestrator - coordinates the full pre-mortem process
 */

import type { LLMProvider } from "../../core/types";
import type {
  Decision,
  FailureScenario,
  PreMortemReport,
  PreMortemConfig,
  PreMortemResult,
} from "./types";
import { imagineFailure } from "./pessimist";
import { synthesizeReport } from "./facilitator";

export async function runPreMortem(
  decision: Decision,
  config: PreMortemConfig,
  provider: LLMProvider,
  verbose: boolean = false
): Promise<PreMortemResult> {
  if (verbose) {
    console.log("\n🔮 PRE-MORTEM ANALYSIS INITIATED");
    console.log(`Configuration:`);
    console.log(`  - Pessimists: ${config.parameters.numPessimists}`);
    console.log(`  - Future timeline: ${config.parameters.futureMonths} months`);
    console.log("\n");
  }

  // Phase 1: Failure Scenarios (parallel pessimists)
  if (verbose) {
    console.log("💭 PHASE 1: IMAGINING FAILURE SCENARIOS");
    console.log(
      `Running ${config.parameters.numPessimists} pessimists in parallel...\n`
    );
  }

  const scenarioPromises = Array.from(
    { length: config.parameters.numPessimists },
    (_, i) => imagineFailure(i + 1, decision, config, provider)
  );

  const scenarios = await Promise.all(scenarioPromises);

  if (verbose) {
    scenarios.forEach((scenario) => {
      console.log(`${scenario.pessimist}:`);
      console.log(`  ${scenario.failureDescription}`);
      console.log(
        `  Risk: ${scenario.likelihood * scenario.impact}/25 (L${scenario.likelihood} × I${scenario.impact})`
      );
      console.log(`  Preventable: ${scenario.preventable ? "Yes" : "No"}`);
      console.log();
    });
  }

  // Phase 2: Facilitator Synthesis
  if (verbose) {
    console.log("📊 PHASE 2: FACILITATOR SYNTHESIS");
    console.log("Analyzing patterns and proposing mitigations...\n");
  }

  const report = await synthesizeReport(decision, scenarios, config, provider);

  if (verbose) {
    console.log(`RECOMMENDATION: ${report.recommendation.toUpperCase()}`);
    console.log(`Reasoning: ${report.reasoning}`);
    console.log(`\nRisks identified: ${report.rankedScenarios.length}`);
    const critical = report.rankedScenarios.filter(
      (r) => r.priority === "critical"
    ).length;
    const high = report.rankedScenarios.filter(
      (r) => r.priority === "high"
    ).length;
    if (critical > 0) console.log(`  Critical: ${critical}`);
    if (high > 0) console.log(`  High: ${high}`);
    console.log(`\nMitigations proposed: ${report.mitigations.length}`);
    console.log(`Patterns identified: ${report.patterns.length}`);
    console.log("\n✅ PRE-MORTEM COMPLETE\n");
  }

  return {
    decision,
    scenarios,
    report,
    metadata: {
      timestamp: new Date().toISOString(),
      config,
    },
  };
}

export function getDefaultConfig(): PreMortemConfig {
  return {
    models: {
      pessimists: "claude-3-5-sonnet-20241022",
      facilitator: "claude-3-7-sonnet-20250219",
    },
    parameters: {
      numPessimists: 3,
      futureMonths: 6,
      pessimistTemperature: 0.9,
      facilitatorTemperature: 0.3,
    },
  };
}

export function formatResult(result: PreMortemResult): string {
  let output = "\n" + "=".repeat(80) + "\n";
  output += "PRE-MORTEM ANALYSIS\n";
  output += "=".repeat(80) + "\n\n";

  output += `RECOMMENDATION: ${result.report.recommendation.toUpperCase()}\n`;
  output += `${result.report.reasoning}\n\n`;

  output += `EXECUTIVE SUMMARY:\n${result.report.summary}\n\n`;

  output += `RANKED FAILURE SCENARIOS:\n\n`;
  result.report.rankedScenarios.forEach((ranked, i) => {
    const s = ranked.scenario;
    output += `${i + 1}. [${ranked.priority.toUpperCase()}] Risk Score: ${ranked.riskScore}/25\n`;
    output += `   ${s.failureDescription}\n`;
    output += `   Root Cause: ${s.rootCause}\n`;
    output += `   Early Warning: ${s.earlyWarningSign}\n`;
    output += `   Preventable: ${s.preventable ? "Yes" : "No"}\n\n`;
  });

  if (result.report.patterns.length > 0) {
    output += `PATTERNS IDENTIFIED:\n`;
    result.report.patterns.forEach((pattern, i) => {
      output += `${i + 1}. ${pattern}\n`;
    });
    output += `\n`;
  }

  output += `MITIGATION STRATEGIES:\n\n`;
  result.report.mitigations.forEach((mitigation, i) => {
    output += `${i + 1}. ${mitigation.action}\n`;
    output += `   Addresses: ${mitigation.addressedScenarios.join(", ")}\n`;
    output += `   Timing: ${mitigation.timing}\n`;
    output += `   Cost: ${mitigation.cost}\n`;
    output += `   Effectiveness: ${mitigation.effectiveness}/5\n\n`;
  });

  output += "=".repeat(80) + "\n";

  return output;
}
