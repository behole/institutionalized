/**
 * Peer Review Framework — engine port.
 *
 * Flow: parallel independent reviews → optional author rebuttal → editor
 * decision. Agent prompt/parse logic lives in reviewer/author/editor files,
 * untouched. Provider/model/audit/logging owned by the engine.
 */
import type { EventSink } from '@core/engine';
import { defineFramework, Session } from '@core/engine';
import type { LLMProvider } from '@core/types';
import type { RunFlags } from '@core/types';
import type { Submission, PeerReviewConfig, PeerReviewResult, Review } from './types';
import { conductReview } from './reviewer';
import { createRebuttal } from './author';
import { makeDecision } from './editor';
import { getDefaultConfig } from './orchestrator';

/**
 * Legacy agent functions expect an LLMProvider; route their calls through
 * the session so audit/events stay intact.
 */
function sessionProvider(
  session: Session,
  agentName: string,
  model: string,
  temperature?: number
): LLMProvider {
  return {
    name: 'engine',
    call: (params) =>
      session.call(agentName, {
        model,
        temperature,
        systemPrompt: params.systemPrompt,
        messages: params.messages,
      }),
    calculateCost: (usage, m) => session.provider.calculateCost(usage, m),
  };
}

export const peerReview = defineFramework<Submission | { content: string }, PeerReviewResult>({
  name: 'peer-review',
  description:
    'Academic-style validation with parallel reviewers, author rebuttal, editor decision',
  normalize(raw) {
    if (typeof raw === 'object' && raw !== null && 'work' in raw) {
      return raw as Submission;
    }
    const content = (raw as { content?: string })?.content ?? '';
    return { work: content, reviewType: 'general' };
  },
  async run(submission, session) {
    const config: PeerReviewConfig = {
      ...getDefaultConfig(),
      ...(session.flags.config as Partial<PeerReviewConfig> | undefined),
    };

    // Engine model override wins over legacy per-role config models.
    const explicitModel = session.models.override;
    if (explicitModel) {
      config.models = { reviewers: explicitModel, author: explicitModel, editor: explicitModel };
    }

    // Phase 1: Independent reviews (parallel)
    session.phase('Independent Reviews', `${config.parameters.numReviewers} reviewers`);
    const reviewSettlements = await Promise.allSettled(
      Array.from({ length: config.parameters.numReviewers }, (_, i) =>
        conductReview(
          i + 1,
          submission as Submission,
          config,
          sessionProvider(
            session,
            `reviewer-${i + 1}`,
            config.models.reviewers,
            config.parameters.reviewerTemperature
          )
        )
      )
    );
    const rejected = reviewSettlements.filter((s) => s.status === 'rejected');
    if (rejected.length > 0) {
      throw new AggregateError(
        rejected.map((s) => (s as PromiseRejectedResult).reason),
        `${rejected.length} reviewer(s) failed`
      );
    }
    const reviews = reviewSettlements.map((s) => (s as PromiseFulfilledResult<Review>).value);

    // Phase 2: Author rebuttal (optional)
    let rebuttal;
    if (config.parameters.enableRebuttal) {
      session.phase('Author Rebuttal');
      rebuttal = await createRebuttal(
        submission as Submission,
        reviews,
        config,
        sessionProvider(session, 'author', config.models.author)
      );
    }

    // Phase 3: Editor decision
    session.phase('Editor Decision');
    const decision = await makeDecision(
      submission as Submission,
      reviews,
      rebuttal,
      config,
      sessionProvider(session, 'editor', config.models.editor, config.parameters.editorTemperature)
    );

    return {
      submission: submission as Submission,
      reviews,
      rebuttal,
      decision,
      metadata: {
        timestamp: new Date().toISOString(),
        config,
        decision:
          decision.decision === 'accept'
            ? 'approve'
            : decision.decision === 'reject'
              ? 'reject'
              : 'delay',
      },
    };
  },
});

/** Backward-compatible entry returning the bare result. */
export async function run(
  input: Submission | { content: string },
  flags: RunFlags = {},
  sinks: EventSink[] = []
): Promise<PeerReviewResult> {
  const { result, auditLog } = await peerReview(input, flags, sinks);
  result.metadata.costUSD = auditLog.metadata.totalCost;
  return result;
}

export { runPeerReview, getDefaultConfig, formatResult } from './orchestrator';
export * from './types';
