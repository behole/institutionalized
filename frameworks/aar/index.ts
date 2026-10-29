/**
 * After-Action Review (AAR) Framework — engine port.
 *
 * Flow: single facilitator step producing analysis, learnings, action items.
 * All provider/model/audit/logging concerns owned by the engine.
 */
import type { EventSink } from '@core/engine';
import { defineFramework } from '@core/engine';
import { parseJSON } from '@core/orchestrator';
import type { RunFlags } from '@core/types';
import type { ActionReview, AARConfig, AARResult } from './types';
import { DEFAULT_CONFIG } from './types';

export const aar = defineFramework<ActionReview | { content: string }, AARResult>({
  name: 'aar',
  description: 'Blameless learning from execution: analysis, learnings, action items',
  normalize(raw) {
    if (typeof raw === 'object' && raw !== null && 'situation' in raw) {
      return raw as ActionReview;
    }
    const content = (raw as { content?: string })?.content ?? '';
    return { situation: content, intended: [], actual: [] };
  },
  async run(rawInput, session) {
    const review = rawInput as ActionReview;
    const config: AARConfig = {
      ...DEFAULT_CONFIG,
      ...(session.flags.config as Partial<AARConfig> | undefined),
    };
    const explicitModel = session.models.override;
    if (explicitModel) {
      config.models = {
        facilitator: explicitModel,
      };
    }

    session.phase('After-Action Review', 'Blameless post-mortem');
    const step = await session.step({
      name: 'facilitator',
      prompt: `Conduct an After-Action Review (blameless post-mortem):

SITUATION: ${review.situation}

WHAT WAS INTENDED:
${review.intended.map((i, idx) => `${idx + 1}. ${i}`).join('\n')}

WHAT ACTUALLY HAPPENED:
${review.actual.map((a, idx) => `${idx + 1}. ${a}`).join('\n')}

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
      temperature: config.parameters.temperature,
      maxTokens: 16384,
    });

    const parsed = parseJSON<{
      analysis: AARResult['analysis'];
      learnings: AARResult['learnings'];
      actionItems: AARResult['actionItems'];
    }>(step.content);

    session.note(
      `Successes: ${parsed.analysis.successes.length} | Failures: ${parsed.analysis.failures.length} | Key Insights: ${parsed.learnings.keyInsights.length}`
    );

    return {
      review,
      analysis: parsed.analysis,
      learnings: parsed.learnings,
      actionItems: parsed.actionItems,
      metadata: {
        timestamp: new Date().toISOString(),
        config,
        decision: 'unclear',
      },
    };
  },
});

/** Backward-compatible entry returning the bare result. */
export async function run(
  input: ActionReview | { content: string },
  flags: RunFlags = {},
  sinks: EventSink[] = []
): Promise<AARResult> {
  const { result, auditLog } = await aar(input, flags, sinks);
  result.metadata.costUSD = auditLog.metadata.totalCost;
  return result;
}

export * from './types';
