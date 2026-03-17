/**
 * After-Action Review (AAR) Framework
 * Blameless learning from execution
 */

import { createProvider } from "@core/providers";
import { getAPIKey } from "@core/config";
import { parseJSON, FrameworkRunner } from "@core/orchestrator";
import type { LLMProvider, RunFlags } from "@core/types";
import type { ActionReview, AARConfig, AARResult } from "./types";
import { DEFAULT_CONFIG } from "./types";

export async function run(
  input: ActionReview | { content: string },
  flags: RunFlags = {}
): Promise<AARResult> {
  const review: ActionReview = "situation" in input
    ? input
    : { situation: input.content || "", intended: [], actual: [] };

  const config: AARConfig = { ...DEFAULT_CONFIG, ...(flags.config || {}) };
  const providerName = flags.provider || "anthropic";
  const apiKey = getAPIKey(providerName);
  const provider = createProvider({ name: providerName, apiKey });

  const verbose = flags.debug ?? false;

  if (verbose) console.log("\n🔄 AFTER-ACTION REVIEW\n");

  const runner = new FrameworkRunner<ActionReview, AARResult>("aar", review);

  const result = await conductAAR(review, config, provider, runner, verbose);

  if (verbose) {
    console.log(`\nKey Insights: ${result.learnings.keyInsights.length}`);
    console.log(`Action Items: ${result.actionItems.immediate.length + result.actionItems.systemicChanges.length}\n`);
  }

  const { auditLog } = await runner.finalize(result, "complete");

  return {
    ...result,
    metadata: { ...result.metadata, costUSD: auditLog.metadata.totalCost },
  };
}

async function conductAAR(
  review: ActionReview,
  config: AARConfig,
  provider: LLMProvider,
  runner: FrameworkRunner<ActionReview, AARResult>,
  verbose: boolean
): Promise<AARResult> {
  const response = await runner.runAgent(
    "facilitator",
    provider,
    config.models.facilitator,
    `Conduct an After-Action Review (blameless post-mortem):

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
}`,
    config.parameters.temperature,
    4096
  );

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
