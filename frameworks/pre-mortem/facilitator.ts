/**
 * Facilitator - synthesizes scenarios and creates risk assessment
 */

import type { LLMProvider } from "@core/types";
import { parseJSON } from "@core/orchestrator";
import type { Plan, FailureScenario, RiskAssessment, PreMortemConfig } from "./types";

export async function synthesizeRisks(
  plan: Plan,
  scenarios: FailureScenario[],
  config: PreMortemConfig,
  provider: LLMProvider
): Promise<RiskAssessment> {
  const prompt = buildPrompt(plan, scenarios);

  const response = await provider.call({
    model: config.models.facilitator,
    temperature: config.parameters.facilitatorTemperature,
    messages: [{ role: "user", content: prompt }],
    maxTokens: 4096,
  });

  const assessment = parseJSON<RiskAssessment>(response.content);
  validateAssessment(assessment);

  return assessment;
}

function buildPrompt(plan: Plan, scenarios: FailureScenario[]): string {
  let prompt = `You are the FACILITATOR in a pre-mortem exercise. Your role is to synthesize failure scenarios into actionable risk assessment.

## THE PLAN
${plan.description}

## FAILURE SCENARIOS (${scenarios.length} pessimists)

`;

  scenarios.forEach((s, i) => {
    prompt += `### ${s.pessimist}\n`;
    prompt += `**Scenario:** ${s.scenario}\n`;
    prompt += `**Severity:** ${s.severity} | **Likelihood:** ${s.likelihood} | **Preventable:** ${s.preventable}\n`;
    prompt += `**Root Causes:**\n`;
    s.rootCauses.forEach((c) => (prompt += `- ${c}\n`));
    prompt += `**Early Warnings:**\n`;
    s.earlyWarnings.forEach((w) => (prompt += `- ${w}\n`));
    prompt += `\n`;
  });

  prompt += `

## YOUR TASK

Synthesize these scenarios into a comprehensive risk assessment:

1. **Identify top risks** - Which scenarios are most critical? (high severity + high likelihood)
2. **Find common themes** - What patterns emerge across scenarios?
3. **Surface critical assumptions** - What assumptions, if wrong, lead to failure?
4. **Design early warning system** - What should we monitor?
5. **Create mitigation plan** - What actions reduce risk?
6. **Assess overall risk level** - How risky is this plan?
7. **Make recommendation** - Proceed, mitigate first, or reconsider?

## GUIDELINES

- Prioritize ruthlessly - focus on what matters most
- Be specific in mitigations - actionable steps, not platitudes
- Consider effort vs. impact trade-offs
- Look for quick wins that reduce multiple risks
- Be honest about overall risk level

## OUTPUT FORMAT

Respond with a JSON object:

{
  "topRisks": [
    {
      "pessimist": "Pessimist X",
      "scenario": "...",
      "rootCauses": [...],
      "earlyWarnings": [...],
      "severity": "...",
      "likelihood": "...",
      "preventable": true/false
    },
    ...
  ],
  "commonThemes": ["theme 1", "theme 2", ...],
  "criticalAssumptions": ["assumption 1", "assumption 2", ...],
  "earlyWarningSystem": ["metric/signal 1", "metric/signal 2", ...],
  "mitigationPlan": [
    {
      "risk": "Which scenario it addresses",
      "action": "Specific action to take",
      "priority": "critical" | "high" | "medium" | "low",
      "effort": "high" | "medium" | "low"
    },
    ...
  ],
  "overallRiskLevel": "high" | "medium" | "low",
  "recommendation": "proceed" | "mitigate-first" | "reconsider"
}

RECOMMENDATION CRITERIA:
- **proceed**: Low risk, or risks have clear mitigations in place
- **mitigate-first**: Medium/high risk, but addressable with preparation
- **reconsider**: High risk with fundamental issues that may not be fixable

IMPORTANT: Return ONLY valid JSON, no markdown formatting.`;

  return prompt;
}

function validateAssessment(assessment: RiskAssessment): void {
  if (!assessment.topRisks || assessment.topRisks.length === 0) {
    throw new Error("Assessment must identify top risks");
  }

  if (!assessment.commonThemes || assessment.commonThemes.length === 0) {
    throw new Error("Assessment must identify common themes");
  }

  if (!assessment.criticalAssumptions || assessment.criticalAssumptions.length === 0) {
    throw new Error("Assessment must identify critical assumptions");
  }

  if (!assessment.earlyWarningSystem || assessment.earlyWarningSystem.length === 0) {
    throw new Error("Assessment must define early warning system");
  }

  if (!assessment.mitigationPlan || assessment.mitigationPlan.length === 0) {
    throw new Error("Assessment must provide mitigation plan");
  }

  const validRiskLevels = ["high", "medium", "low"];
  if (!validRiskLevels.includes(assessment.overallRiskLevel)) {
    throw new Error(`Invalid risk level: ${assessment.overallRiskLevel}`);
  }

  const validRecommendations = ["proceed", "mitigate-first", "reconsider"];
  if (!validRecommendations.includes(assessment.recommendation)) {
    throw new Error(`Invalid recommendation: ${assessment.recommendation}`);
  }

  // Validate each mitigation
  for (const mitigation of assessment.mitigationPlan) {
    if (!mitigation.risk || !mitigation.action) {
      throw new Error("Mitigation missing risk or action");
    }

    if (!["critical", "high", "medium", "low"].includes(mitigation.priority)) {
      throw new Error(`Invalid mitigation priority: ${mitigation.priority}`);
    }

    if (!["high", "medium", "low"].includes(mitigation.effort)) {
      throw new Error(`Invalid mitigation effort: ${mitigation.effort}`);
    }
  }
}
