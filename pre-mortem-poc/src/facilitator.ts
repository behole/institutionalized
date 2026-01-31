/**
 * Facilitator agent - synthesizes failure scenarios into mitigation strategies
 */

import type { LLMProvider } from "../../core/types";
import type {
  Decision,
  FailureScenario,
  PreMortemReport,
  RankedScenario,
  PreMortemConfig,
} from "./types";

export async function synthesizeReport(
  decision: Decision,
  scenarios: FailureScenario[],
  config: PreMortemConfig,
  provider: LLMProvider
): Promise<PreMortemReport> {
  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt(decision, scenarios);

  const response = await provider.call({
    model: config.models.facilitator,
    temperature: config.parameters.facilitatorTemperature,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });

  const report = parseReport(response.content);
  validateReport(report, scenarios);

  return report;
}

function buildSystemPrompt(): string {
  return `You are the facilitator synthesizing pre-mortem failure scenarios into actionable recommendations.

YOUR ROLE:
- Rank failure scenarios by risk (likelihood × impact)
- Identify patterns across scenarios
- Propose concrete mitigation strategies
- Make final recommendation on the decision

SYNTHESIS PRINCIPLES:
1. Risk score = likelihood × impact (max 25)
2. Look for patterns (common root causes, repeated themes)
3. Prioritize preventable high-risk scenarios
4. Mitigations should address root causes, not symptoms
5. Recommendation should match overall risk level

OUTPUT FORMAT:
{
  "summary": "Executive summary of pre-mortem findings",
  "rankedScenarios": [
    {
      "scenario": { /* full scenario */ },
      "riskScore": 12,
      "priority": "high"
    }
  ],
  "patterns": ["pattern 1", "pattern 2"],
  "mitigations": [
    {
      "addressedScenarios": ["Pessimist 1", "Pessimist 2"],
      "action": "Concrete action to take",
      "timing": "When to do this",
      "cost": "Resource requirement",
      "effectiveness": 4
    }
  ],
  "recommendation": "proceed" | "proceed-with-caution" | "reconsider" | "abort",
  "reasoning": "Why this recommendation"
}

PRIORITY MAPPING:
- critical: risk score >= 20 (very likely catastrophic failure)
- high: risk score 12-19 (likely major failure)
- medium: risk score 6-11 (possible significant failure)
- low: risk score 1-5 (unlikely or minor failure)

RECOMMENDATION GUIDELINES:
- **proceed**: Low/medium risks only, all preventable
- **proceed-with-caution**: Some high risks, but mitigatable
- **reconsider**: Multiple high risks or critical risk present
- **abort**: Critical risks that can't be mitigated in timeframe

DO NOT:
- Dismiss high-likelihood scenarios as "unlikely"
- Propose vague mitigations ("improve planning")
- Ignore patterns across scenarios
- Make recommendation that contradicts risk scores`;
}

function buildUserPrompt(
  decision: Decision,
  scenarios: FailureScenario[]
): string {
  let prompt = `Synthesize the following pre-mortem analysis:\n\n`;
  prompt += `DECISION: ${decision.proposal}\n\n`;

  if (decision.timeline) {
    prompt += `TIMELINE: ${decision.timeline}\n\n`;
  }

  prompt += `FAILURE SCENARIOS (${scenarios.length}):\n\n`;

  scenarios.forEach((scenario, i) => {
    prompt += `${scenario.pessimist} (${scenario.futureDate}):\n`;
    prompt += `  Failure: ${scenario.failureDescription}\n`;
    prompt += `  Root Cause: ${scenario.rootCause}\n`;
    prompt += `  Early Warning: ${scenario.earlyWarningSign}\n`;
    prompt += `  Likelihood: ${scenario.likelihood}/5 | Impact: ${scenario.impact}/5\n`;
    prompt += `  Preventable: ${scenario.preventable ? "Yes" : "No"}\n\n`;
  });

  prompt += `Provide your facilitator report as a JSON object. Rank scenarios, identify patterns, propose mitigations.`;

  return prompt;
}

function parseReport(content: string): PreMortemReport {
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Facilitator: No JSON found in report");
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]);

    return {
      summary: parsed.summary,
      rankedScenarios: parsed.rankedScenarios || [],
      patterns: parsed.patterns || [],
      mitigations: parsed.mitigations || [],
      recommendation: parsed.recommendation,
      reasoning: parsed.reasoning,
    };
  } catch (error) {
    throw new Error(`Facilitator: Failed to parse report JSON - ${error}`);
  }
}

function validateReport(
  report: PreMortemReport,
  scenarios: FailureScenario[]
): void {
  if (!report.summary || report.summary.trim().length < 50) {
    throw new Error("Facilitator: Summary must be substantial");
  }

  if (
    !["proceed", "proceed-with-caution", "reconsider", "abort"].includes(
      report.recommendation
    )
  ) {
    throw new Error(
      `Facilitator: Invalid recommendation "${report.recommendation}"`
    );
  }

  if (!report.reasoning || report.reasoning.trim().length < 50) {
    throw new Error("Facilitator: Reasoning must be substantial");
  }

  // Should rank all scenarios
  if (report.rankedScenarios.length !== scenarios.length) {
    throw new Error(
      `Facilitator: Should rank all ${scenarios.length} scenarios (found ${report.rankedScenarios.length})`
    );
  }

  // Validate ranked scenarios
  report.rankedScenarios.forEach((ranked, i) => {
    if (!["critical", "high", "medium", "low"].includes(ranked.priority)) {
      throw new Error(
        `Facilitator: Scenario ${i + 1} has invalid priority "${ranked.priority}"`
      );
    }

    const expectedRisk =
      ranked.scenario.likelihood * ranked.scenario.impact;

    if (ranked.riskScore !== expectedRisk) {
      throw new Error(
        `Facilitator: Scenario ${i + 1} risk score ${ranked.riskScore} doesn't match likelihood×impact ${expectedRisk}`
      );
    }

    // Check priority matches risk score
    if (ranked.riskScore >= 20 && ranked.priority !== "critical") {
      throw new Error(
        `Facilitator: Scenario ${i + 1} has risk score ${ranked.riskScore} but priority is not critical`
      );
    }
  });

  // Should identify patterns
  if (scenarios.length >= 3 && report.patterns.length === 0) {
    throw new Error(
      "Facilitator: With 3+ scenarios, should identify at least one pattern"
    );
  }

  // Should propose mitigations
  if (report.mitigations.length === 0) {
    throw new Error("Facilitator: Must propose at least one mitigation");
  }

  // Validate mitigations
  report.mitigations.forEach((mitigation, i) => {
    if (mitigation.addressedScenarios.length === 0) {
      throw new Error(
        `Facilitator: Mitigation ${i + 1} doesn't address any scenarios`
      );
    }

    if (!mitigation.action || mitigation.action.trim().length < 20) {
      throw new Error(
        `Facilitator: Mitigation ${i + 1} needs specific action`
      );
    }

    if (
      mitigation.effectiveness < 1 ||
      mitigation.effectiveness > 5
    ) {
      throw new Error(
        `Facilitator: Mitigation ${i + 1} effectiveness must be 1-5`
      );
    }
  });

  // Recommendation should match risk level
  const hasCritical = report.rankedScenarios.some(
    (r) => r.priority === "critical"
  );
  const highRiskCount = report.rankedScenarios.filter(
    (r) => r.priority === "high" || r.priority === "critical"
  ).length;

  if (hasCritical && report.recommendation === "proceed") {
    throw new Error(
      "Facilitator: Critical risks present but recommendation is 'proceed'"
    );
  }

  if (highRiskCount >= 2 && report.recommendation === "proceed") {
    throw new Error(
      "Facilitator: Multiple high risks present but recommendation is 'proceed'"
    );
  }
}
