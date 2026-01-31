/**
 * After-Action Review (AAR) Framework
 * Blameless learning from execution
 */

import { createProvider } from "@core/providers";
import { getAPIKey } from "@core/config";
import { parseJSON } from "@core/orchestrator";
import type { LLMProvider } from "@core/types";
import type { ActionReview, AARConfig, AARResult } from "./types";
import { DEFAULT_CONFIG } from "./types";

export async function run(
  input: ActionReview | { content: string },
  flags: Record<string, any> = {}
): Promise<AARResult> {
  const review: ActionReview = "situation" in input
    ? input
    : { situation: input.content || "", intended: [], actual: [] };

  const config: AARConfig = { ...DEFAULT_CONFIG, ...(flags.config || {}) };
  const providerName = flags.provider || "anthropic";
  const apiKey = getAPIKey(providerName);
  const provider = createProvider({ name: providerName, apiKey });

  const verbose = flags.verbose || false;

  if (verbose) console.log("\n🔄 AFTER-ACTION REVIEW\n");

  const result = await conductAAR(review, config, provider, verbose);

  if (verbose) {
    console.log(`\nKey Insights: ${result.learnings.keyInsights.length}`);
    console.log(`Action Items: ${result.actionItems.immediate.length + result.actionItems.systemicChanges.length}\n`);
  }

  return result;
}

async function conductAAR(
  review: ActionReview,
  config: AARConfig,
  provider: LLMProvider,
  verbose: boolean
): Promise<AARResult> {
  const response = await provider.call({
    model: config.models.facilitator,
    temperature: config.parameters.temperature,
    messages: [{
      role: "user",
      content: `Conduct an After-Action Review (blameless post-mortem):

SITUATION: ${review.situation}

WHAT WAS INTENDED:
${review.intended.map((i, idx) => `${idx + 1}. ${i}`).join("\n")}

WHAT ACTUALLY HAPPENED:
${review.actual.map((a, idx) => `${idx + 1}. ${a}`).join("\n")}

Provide comprehensive AAR in JSON:
{
  "analysis": {
    "whatHappened": "narrative summary",
    "whatWasExpected": "narrative summary",
    "gaps": [{"expectation": "...", "reality": "...", "why": "..."}, ...],
    "successes": ["what went well", ...],
    "failures": ["what went wrong", ...]
  },
  "learnings": {
    "keyInsights": ["insight 1", ...],
    "rootCauses": ["root cause 1", ...],
    "contributingFactors": ["factor 1", ...],
    "thingsToRepeat": ["practice 1", ...],
    "thingsToAvoid": ["antipattern 1", ...]
  },
  "actionItems": {
    "immediate": ["quick fix 1", ...],
    "systemicChanges": ["process change 1", ...],
    "processImprovements": ["improvement 1", ...],
    "trainingNeeds": ["training need 1", ...]
  }
}`
    }],
    maxTokens: 4096,
  });

  const parsed = parseJSON<{ analysis: any; learnings: any; actionItems: any }>(response.content);

  return {
    review,
    analysis: parsed.analysis,
    learnings: parsed.learnings,
    actionItems: parsed.actionItems,
    metadata: { timestamp: new Date().toISOString(), config },
  };
}

export * from "./types";
