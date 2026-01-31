/**
 * Pessimist agent - imagines specific failure scenarios
 */

import type { LLMProvider } from "../../core/types";
import type { Decision, FailureScenario, PreMortemConfig } from "./types";

export async function imagineFailure(
  pessimistNumber: number,
  decision: Decision,
  config: PreMortemConfig,
  provider: LLMProvider
): Promise<FailureScenario> {
  const futureDate = calculateFutureDate(config.parameters.futureMonths);
  const systemPrompt = buildSystemPrompt(futureDate);
  const userPrompt = buildUserPrompt(decision, futureDate);

  const response = await provider.call({
    model: config.models.pessimists,
    temperature: config.parameters.pessimistTemperature,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });

  const scenario = parseScenario(response.content, pessimistNumber, futureDate);
  validateScenario(scenario);

  return scenario;
}

function calculateFutureDate(months: number): string {
  const now = new Date();
  now.setMonth(now.getMonth() + months);
  return now.toLocaleDateString("en-US", { year: "numeric", month: "long" });
}

function buildSystemPrompt(futureDate: string): string {
  return `You are a pessimist conducting a pre-mortem analysis.

THE SCENARIO:
It is now ${futureDate}. The decision/plan has FAILED CATASTROPHICALLY.

YOUR ROLE:
- Imagine a specific, plausible failure scenario
- Work backward from failure to root cause
- Identify the early warning sign that was missed
- Rate the likelihood and impact honestly
- Determine if this was preventable

GUIDELINES:
- Be specific: name concrete failures, not vague concerns
- Be creative: think beyond obvious risks
- Be realistic: must be actually plausible
- Work backward: failure → root cause → early warning
- Focus on your unique failure scenario (don't duplicate others)

OUTPUT FORMAT:
{
  "failureDescription": "Specific description of what failed",
  "rootCause": "Why it failed (the true underlying reason)",
  "earlyWarningSign": "The signal that appeared first (that we ignored)",
  "likelihood": 1-5 (1=unlikely, 5=very likely),
  "impact": 1-5 (1=minor, 5=catastrophic),
  "preventable": true/false
}

RATING SCALES:
Likelihood:
1 = Very unlikely (< 10% chance)
2 = Unlikely (10-30%)
3 = Possible (30-50%)
4 = Likely (50-70%)
5 = Very likely (> 70%)

Impact:
1 = Minor annoyance
2 = Noticeable problem
3 = Significant damage
4 = Major crisis
5 = Catastrophic failure

EXAMPLES OF GOOD SCENARIOS:
- "The database ran out of disk space during Black Friday traffic, crashing the site. Root cause: We never set up monitoring for disk usage. Early warning: Disk usage grew 10% per day for a week before the crash."
- "The key engineer quit on launch day. Root cause: They were the only person who understood the deployment system. Early warning: They mentioned feeling overwhelmed in 1-on-1s two months ago."

AVOID:
- Generic concerns ("security could be better")
- Unlikely scenarios ("meteor hits datacenter")
- Vague root causes ("poor planning")`;
}

function buildUserPrompt(decision: Decision, futureDate: string): string {
  let prompt = `It is now ${futureDate}. This decision has FAILED:\n\n`;
  prompt += `DECISION: ${decision.proposal}\n\n`;

  if (decision.context && decision.context.length > 0) {
    prompt += `CONTEXT:\n`;
    decision.context.forEach((ctx, i) => {
      prompt += `- ${ctx}\n`;
    });
    prompt += `\n`;
  }

  if (decision.timeline) {
    prompt += `ORIGINAL TIMELINE: ${decision.timeline}\n\n`;
  }

  if (decision.stakeholders && decision.stakeholders.length > 0) {
    prompt += `STAKEHOLDERS: ${decision.stakeholders.join(", ")}\n\n`;
  }

  prompt += `Imagine a specific failure scenario. What went wrong? Work backward to the root cause and early warning sign.`;

  return prompt;
}

function parseScenario(
  content: string,
  pessimistNumber: number,
  futureDate: string
): FailureScenario {
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error(`Pessimist ${pessimistNumber}: No JSON found in response`);
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]);

    return {
      pessimist: `Pessimist ${pessimistNumber}`,
      futureDate,
      failureDescription: parsed.failureDescription,
      rootCause: parsed.rootCause,
      earlyWarningSign: parsed.earlyWarningSign,
      likelihood: parsed.likelihood,
      impact: parsed.impact,
      preventable: parsed.preventable,
    };
  } catch (error) {
    throw new Error(
      `Pessimist ${pessimistNumber}: Failed to parse JSON - ${error}`
    );
  }
}

function validateScenario(scenario: FailureScenario): void {
  if (
    !scenario.failureDescription ||
    scenario.failureDescription.trim().length < 30
  ) {
    throw new Error(
      `${scenario.pessimist}: Failure description must be detailed (at least 30 characters)`
    );
  }

  if (!scenario.rootCause || scenario.rootCause.trim().length < 20) {
    throw new Error(
      `${scenario.pessimist}: Root cause must be specific (at least 20 characters)`
    );
  }

  if (
    !scenario.earlyWarningSign ||
    scenario.earlyWarningSign.trim().length < 20
  ) {
    throw new Error(
      `${scenario.pessimist}: Early warning sign must be specific (at least 20 characters)`
    );
  }

  if (scenario.likelihood < 1 || scenario.likelihood > 5) {
    throw new Error(
      `${scenario.pessimist}: Likelihood must be 1-5, got ${scenario.likelihood}`
    );
  }

  if (scenario.impact < 1 || scenario.impact > 5) {
    throw new Error(
      `${scenario.pessimist}: Impact must be 1-5, got ${scenario.impact}`
    );
  }

  // Check for vague failures
  const vagueTerms = [
    "things went wrong",
    "it failed",
    "didn't work",
    "problems occurred",
  ];

  const descLower = scenario.failureDescription.toLowerCase();
  const hasOnlyVague = vagueTerms.some(
    (term) => descLower.includes(term) && descLower.length < 100
  );

  if (hasOnlyVague) {
    throw new Error(
      `${scenario.pessimist}: Failure description too vague - be specific about what failed`
    );
  }

  // Check root cause isn't just restating failure
  const similarity = calculateSimilarity(
    scenario.failureDescription.toLowerCase(),
    scenario.rootCause.toLowerCase()
  );

  if (similarity > 0.7) {
    throw new Error(
      `${scenario.pessimist}: Root cause too similar to failure description - explain WHY it failed`
    );
  }
}

function calculateSimilarity(str1: string, str2: string): number {
  const words1 = new Set(str1.split(/\s+/));
  const words2 = new Set(str2.split(/\s+/));

  const intersection = new Set([...words1].filter((w) => words2.has(w)));
  const union = new Set([...words1, ...words2]);

  return intersection.size / union.size;
}
