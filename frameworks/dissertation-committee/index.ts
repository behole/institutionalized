/**
 * Dissertation Committee Framework — engine port.
 *
 * Flow: committee formation → sequential per-member reviews (model chosen by
 * member role) → consensus → development plan. Prompt/parse content lives in
 * committee.ts, untouched. All provider/audit/logging concerns owned by the
 * engine.
 */
import type { EventSink } from '@core/engine';
import { defineFramework } from '@core/engine';
import type { RunFlags } from '@core/types';
import type {
  DissertationWork,
  DissertationCommitteeConfig,
  DissertationCommitteeResult,
  CommitteeConsensus,
  DevelopmentPlan,
  StageReview,
} from './types';
import { DEFAULT_CONFIG } from './types';
import { formCommittee, buildReviewPrompt, parseReviewResponse } from './committee';

export const dissertationCommittee = defineFramework<
  DissertationWork | { content: string },
  DissertationCommitteeResult
>({
  name: 'dissertation-committee',
  description:
    'Multi-stage work validation: advisor, specialists and methodologist review sequentially, then committee consensus and a development plan',
  normalize(raw) {
    if (typeof raw === 'object' && raw !== null && 'title' in raw && 'abstract' in raw) {
      return raw as DissertationWork;
    }
    const content = (raw as { content?: string })?.content ?? '';
    return {
      title: 'Untitled Work',
      abstract: content,
      field: 'General',
      stage: 'draft',
      content,
    };
  },
  async run(workInput, session) {
    const work = workInput as DissertationWork;
    const config: DissertationCommitteeConfig = {
      ...DEFAULT_CONFIG,
      ...(session.flags.config as Partial<DissertationCommitteeConfig> | undefined),
    };

    // Engine model override wins over legacy per-role config models.
    const explicitModel = session.models.override;
    if (explicitModel) {
      config.models = {
        advisor: explicitModel,
        specialist1: explicitModel,
        specialist2: explicitModel,
        methodologist: explicitModel,
      };
    }

    // Phase 1: Committee formation
    session.phase('Committee Formation');
    const committee = formCommittee(work, config);
    session.note(`Committee formed: ${committee.length} members`);

    // Phase 2: Individual reviews (sequential, per-role model selection)
    session.phase('Individual Reviews', `${committee.length} members, sequential`);
    const stageReviews: StageReview[] = [];

    for (const member of committee) {
      const modelKey =
        member.role === 'advisor'
          ? 'advisor'
          : member.role === 'methodologist'
            ? 'methodologist'
            : member.role === 'specialist'
              ? `specialist${Math.floor(Math.random() * 2) + 1}`
              : 'advisor';
      const model = config.models[modelKey as keyof typeof config.models];
      const { system, user } = buildReviewPrompt(work, member, config);

      try {
        const response = await session.step({
          name: `reviewer-${member.name.replace(/\s+/g, '-').toLowerCase()}`,
          prompt: user,
          model,
          temperature: config.parameters.temperature,
          maxTokens: 4096,
          systemPrompt: system,
        });
        const review = parseReviewResponse(response.content, work, member);
        stageReviews.push(review);
        session.note(`${member.name}: ${review.verdict.toUpperCase()}`);
      } catch (error) {
        session.note(
          `Review failed for ${member.name}: ${error instanceof Error ? error.message : String(error)}`
        );
        stageReviews.push({
          stage: work.stage,
          reviewer: member.name,
          assessment: {
            strengths: ['Work received for review'],
            weaknesses: ['Complete review pending'],
            questions: ['Please resubmit for full review'],
          },
          verdict: 'revise',
          requiredChanges: ['Address all committee feedback'],
          suggestions: ['Provide more complete work sample'],
        });
      }
    }

    // Phase 3: Committee consensus
    session.phase('Committee Consensus');
    const consensus = determineConsensus(stageReviews, config);
    session.note(
      `Consensus: ${consensus.overallVerdict.toUpperCase()}${consensus.unanimous ? ' (unanimous)' : ''}`
    );

    // Phase 4: Development plan
    session.phase('Development Plan');
    const developmentPlan = generateDevelopmentPlan(work, stageReviews, consensus);

    return {
      work,
      committee,
      stageReviews,
      consensus,
      developmentPlan,
      metadata: {
        timestamp: new Date().toISOString(),
        duration: 0, // engine records duration; audit log carries timings
        costUSD: 0, // replaced from audit log below
        modelUsage: config.models,
        decision:
          consensus.overallVerdict === 'approve'
            ? 'approve'
            : consensus.overallVerdict === 'revise'
              ? 'delay'
              : 'reject',
      },
    };
  },
});

/** Backward-compatible entry returning the bare result. */
export async function run(
  input: DissertationWork | { content: string },
  flags: RunFlags = {},
  sinks: EventSink[] = []
): Promise<DissertationCommitteeResult> {
  const { result, auditLog } = await dissertationCommittee(input, flags, sinks);
  result.metadata.costUSD = auditLog.metadata.totalCost;
  return result;
}

export { runCommitteeReview } from './orchestrator';
export * from './types';

function determineConsensus(
  stageReviews: StageReview[],
  config: DissertationCommitteeConfig
): CommitteeConsensus {
  const verdicts = stageReviews.map((r) => r.verdict);
  const approveCount = verdicts.filter((v) => v === 'approve').length;
  const rejectCount = verdicts.filter((v) => v === 'reject').length;

  let overallVerdict: 'approve' | 'revise' | 'reject' = 'revise';
  let unanimous = false;

  if (rejectCount > 0) {
    overallVerdict = 'reject';
  } else if (approveCount === verdicts.length) {
    overallVerdict = 'approve';
    unanimous = true;
  } else if (approveCount > verdicts.length / 2) {
    overallVerdict = 'approve';
  }

  // Collect all required changes as conditions
  const conditions = stageReviews
    .flatMap((r) => r.requiredChanges || [])
    .filter((v, i, a) => a.indexOf(v) === i); // dedupe

  // Collect dissenting views
  const dissentingViews = stageReviews
    .filter((r) => r.verdict !== overallVerdict)
    .map((r) => `${r.reviewer}: ${r.assessment.weaknesses.join('; ')}`);

  return {
    overallVerdict,
    unanimous,
    ...(dissentingViews.length > 0 && { dissentingViews }),
    ...(conditions.length > 0 && { conditions }),
  };
}

function generateDevelopmentPlan(
  work: DissertationWork,
  stageReviews: StageReview[],
  consensus: CommitteeConsensus
): DevelopmentPlan {
  // Collect all required changes
  const immediateActions = stageReviews
    .flatMap((r) => r.requiredChanges || [])
    .filter((v, i, a) => a.indexOf(v) === i);

  // Collect all suggestions
  const allSuggestions = stageReviews
    .flatMap((r) => r.suggestions || [])
    .filter((v, i, a) => a.indexOf(v) === i);

  // Determine timeline based on stage
  const timeline =
    work.stage === 'proposal'
      ? '6-12 months to completion'
      : work.stage === 'chapters'
        ? '3-6 months to completion'
        : work.stage === 'draft'
          ? '1-3 months to completion'
          : 'Final revisions only';

  // Generate milestones
  const milestones = [
    `Address all required changes from ${work.stage} review`,
    ...(work.stage !== 'final' ? ['Complete next stage of work'] : []),
    ...(work.stage !== 'final' ? ['Submit for next committee review'] : []),
    'Prepare for final defense/submission',
  ];

  // Resources
  const resources = [
    'Committee feedback and guidance',
    ...(work.methodology ? ['Methodology refinement resources'] : []),
    'Writing and revision support',
    'Peer review from colleagues',
  ];

  return {
    immediateActions: immediateActions.length > 0 ? immediateActions : allSuggestions.slice(0, 5),
    timeline,
    milestones,
    resources,
  };
}
