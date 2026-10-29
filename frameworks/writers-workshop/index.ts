/**
 * Writers' Workshop Framework — engine port.
 *
 * Flow: sequential peer reviews → facilitated discussion → workshop summary.
 * Prompt/parse content lives in peer.ts/facilitator.ts, untouched. All
 * provider/audit/logging concerns owned by the engine.
 */
import type { EventSink } from '@core/engine';
import { defineFramework } from '@core/engine';
import type { RunFlags } from '@core/types';
import type {
  Manuscript,
  WritersWorkshopResult,
  WritersWorkshopConfig,
  PeerReview,
  DiscussionPoint,
  WorkshopSummary,
} from './types';
import { DEFAULT_CONFIG } from './types';
import { buildPeerReviewPrompt, parsePeerReviewResponse } from './peer';
import { buildFacilitatorPrompt, parseFacilitatorResponse } from './facilitator';

export const writersWorkshop = defineFramework<
  Manuscript | { content: string },
  WritersWorkshopResult
>({
  name: 'writers-workshop',
  description:
    'Clarion-style manuscript workshop: sequential peer reviews, facilitated discussion, summary',
  normalize(raw) {
    if (typeof raw === 'object' && raw !== null && 'content' in raw && 'title' in raw) {
      return raw as Manuscript;
    }
    const content = (raw as { content?: string })?.content ?? '';
    return {
      title: 'Untitled Manuscript',
      content,
    };
  },
  async run(manuscriptInput, session) {
    const manuscript = manuscriptInput as Manuscript;
    const config: WritersWorkshopConfig = {
      ...DEFAULT_CONFIG,
      ...(session.flags.config as Partial<WritersWorkshopConfig> | undefined),
    };

    // Engine model override wins over legacy per-role config models.
    const explicitModel = session.models.override;
    if (explicitModel) {
      for (const key of Object.keys(config.models)) {
        config.models[key] = explicitModel;
      }
    }

    // Phase 1: Peer reviews (sequential -- the structure IS the value)
    session.phase('Peer Reviews', `${config.parameters.peerCount} peers, sequential`);
    const peerReviews: PeerReview[] = [];
    const peerNames = Object.keys(config.models).filter((k) => k.startsWith('peer'));

    for (let i = 0; i < config.parameters.peerCount && i < peerNames.length; i++) {
      const peerName = peerNames[i];
      const { system, user } = buildPeerReviewPrompt(manuscript, peerName, config);
      const response = await session.step({
        name: peerName,
        prompt: user,
        model: config.models[peerName],
        temperature: config.parameters.temperature,
        maxTokens: 4096,
        systemPrompt: system,
      });
      const review = parsePeerReviewResponse(response.content, peerName);
      peerReviews.push(review);
    }
    session.note(`${peerReviews.length} peer reviews collected`);

    // Phase 2: Facilitated discussion
    let discussion: DiscussionPoint[] = [];
    if (config.parameters.enableDiscussion && peerReviews.length > 1) {
      session.phase('Facilitated Discussion');
      const { system, user } = buildFacilitatorPrompt(manuscript, peerReviews, config);
      const facilitatorResponse = await session.step({
        name: 'facilitator',
        prompt: user,
        model: config.models.facilitator,
        temperature: 0.5,
        maxTokens: 4096,
        systemPrompt: system,
      });
      discussion = parseFacilitatorResponse(facilitatorResponse.content);
      session.note(`${discussion.length} discussion points synthesized`);
    }

    // Phase 3: Workshop summary
    session.phase('Workshop Summary');
    const summary = generateSummary(peerReviews, discussion);

    return {
      manuscript,
      peerReviews,
      discussion,
      summary,
      metadata: {
        timestamp: new Date().toISOString(),
        duration: 0, // engine records duration; audit log carries timings
        costUSD: 0, // replaced from audit log below
        peerCount: peerReviews.length,
        modelUsage: config.models,
        decision: 'unclear',
      },
    };
  },
});

/** Backward-compatible entry returning the bare result. */
export async function run(
  input: Manuscript | { content: string },
  flags: RunFlags = {},
  sinks: EventSink[] = []
): Promise<WritersWorkshopResult> {
  const { result, auditLog } = await writersWorkshop(input, flags, sinks);
  result.metadata.costUSD = auditLog.metadata.totalCost;
  return result;
}

export { runWorkshop } from './orchestrator';
export * from './types';

function generateSummary(
  peerReviews: PeerReview[],
  discussion: DiscussionPoint[]
): WorkshopSummary {
  // Extract all strengths
  const allStrengths = peerReviews.flatMap((r) => r.positive.strengths);
  const strengthCounts = countOccurrences(allStrengths);
  const overallStrengths = Object.entries(strengthCounts)
    .filter(([_, count]) => count > 1)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([strength]) => strength);

  // Extract common concerns
  const allConcerns = peerReviews.flatMap((r) => r.constructive.craftConcerns);
  const concernCounts = countOccurrences(allConcerns);
  const commonConcerns = Object.entries(concernCounts)
    .filter(([_, count]) => count > 1)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([concern]) => concern);

  // Generate focus areas from suggestions
  const allSuggestions = peerReviews.flatMap((r) => r.constructive.suggestions);
  const recommendedFocus = [...new Set(allSuggestions)].slice(0, 5);

  // Generate next steps
  const nextSteps = [
    'Address common concerns raised by multiple reviewers',
    'Leverage identified strengths in revision',
    'Consider discussion points for deeper revision',
    'Review specific suggestions from peer feedback',
  ];

  return {
    overallStrengths: overallStrengths.length > 0 ? overallStrengths : allStrengths.slice(0, 3),
    commonConcerns: commonConcerns.length > 0 ? commonConcerns : allConcerns.slice(0, 3),
    recommendedFocus,
    nextSteps,
  };
}

function countOccurrences(items: string[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const item of items) {
    counts[item] = (counts[item] || 0) + 1;
  }
  return counts;
}
