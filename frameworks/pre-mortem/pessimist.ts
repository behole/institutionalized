/**
 * Pessimist agent - imagines specific failure scenarios
 */

import type { LLMProvider } from "@core/types";
import { parseJSON } from "@core/orchestrator";
import type { Plan, FailureScenario, PreMortemConfig } from "./types";

export async function imagineFailure(
  pessimistNumber: number,
  plan: Plan,
  config: PreMortemConfig,
  provider: LLMProvider
): Promise<FailureScenario> {
  const prompt = buildPrompt(pessimistNumber, plan);

  const response = await provider.call({
    model: config.models.pessimists,
    temperature: config.parameters.pessimistTemperature,
    messages: [{ role: "user", content: prompt }],
    maxTokens: 2048,
  });

  const parsed = parseJSON<Omit<FailureScenario, "pessimist">>(response.content);

  const scenario: FailureScenario = {
    pessimist: `Pessimist ${pessimistNumber}`,
    ...parsed,
  };

  validateScenario(scenario);
  return scenario;
}

function buildPrompt(pessimistNumber: number, plan: Plan): string {
  let prompt = `You are Pessimist ${pessimistNumber} in a PRE-MORTEM exercise.

## THE EXERCISE

A pre-mortem is where we imagine a plan has FAILED spectacularly, then work backward to figure out why.

## THE PLAN
${plan.description}
`;

  if (plan.context && plan.context.length > 0) {
    prompt += `\n## CONTEXT\n`;
    plan.context.forEach((ctx, i) => {
      prompt += `${i + 1}. ${ctx}\n`;
    });
  }

  if (plan.timeline) {
    prompt += `\n## TIMELINE\n${plan.timeline}\n`;
  }

  if (plan.stakeholders && plan.stakeholders.length > 0) {
    prompt += `\n## STAKEHOLDERS\n${plan.stakeholders.join(", ")}\n`;
  }

  prompt += `

## YOUR TASK

**Imagine it's ${plan.timeline || "6 months from now"} and this plan has FAILED.**

You must:
1. **Describe the failure scenario** - What went wrong? Be specific.
2. **Identify root causes** - Why did it happen? What were the underlying issues?
3. **Note early warnings** - What signs should we have seen?
4. **Assess severity** - How bad was the failure?
5. **Assess likelihood** - How likely is this scenario?
6. **Determine preventability** - Could this have been avoided?

## GUIDELINES

- Be creative but realistic
- Think about second-order effects
- Consider human factors (politics, incentives, communication)
- Don't just think about technical failures
- Be specific - generic failures aren't useful

## FOCUS AREAS

Consider failures in:
- **Execution** - poor implementation, resource constraints
- **Assumptions** - things we believed that weren't true
- **External factors** - market changes, competitors, regulations
- **Human factors** - team dynamics, motivation, politics
- **Technical** - bugs, scalability, architecture
- **Business** - product-market fit, pricing, go-to-market

## OUTPUT FORMAT

Respond with a JSON object:

{
  "scenario": "Specific description of what failed",
  "rootCauses": ["cause 1", "cause 2", ...],
  "earlyWarnings": ["warning sign 1", "warning sign 2", ...],
  "severity": "catastrophic" | "major" | "moderate" | "minor",
  "likelihood": "very-likely" | "likely" | "possible" | "unlikely",
  "preventable": true | false
}

SEVERITY DEFINITIONS:
- catastrophic: Company/project ending
- major: Significant setback, major rework needed
- moderate: Recoverable but painful
- minor: Small impact, easy fix

LIKELIHOOD DEFINITIONS:
- very-likely: >50% chance
- likely: 25-50% chance
- possible: 10-25% chance
- unlikely: <10% chance

IMPORTANT: Return ONLY valid JSON, no markdown formatting.`;

  return prompt;
}

function validateScenario(scenario: FailureScenario): void {
  if (!scenario.scenario || scenario.scenario.length < 20) {
    throw new Error(`${scenario.pessimist}: Scenario too brief`);
  }

  if (!scenario.rootCauses || scenario.rootCauses.length === 0) {
    throw new Error(`${scenario.pessimist}: Must identify root causes`);
  }

  if (!scenario.earlyWarnings || scenario.earlyWarnings.length === 0) {
    throw new Error(`${scenario.pessimist}: Must identify early warnings`);
  }

  const validSeverities = ["catastrophic", "major", "moderate", "minor"];
  if (!validSeverities.includes(scenario.severity)) {
    throw new Error(`${scenario.pessimist}: Invalid severity`);
  }

  const validLikelihoods = ["very-likely", "likely", "possible", "unlikely"];
  if (!validLikelihoods.includes(scenario.likelihood)) {
    throw new Error(`${scenario.pessimist}: Invalid likelihood`);
  }

  if (typeof scenario.preventable !== "boolean") {
    throw new Error(`${scenario.pessimist}: Preventable must be boolean`);
  }
}
