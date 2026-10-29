/**
 * Grant Review Panel Framework — engine port.
 *
 * Flow: per-proposal × per-reviewer parallel scoring → panel chair calibration
 * and ranking. All provider/model/audit/logging concerns owned by the engine.
 */
import type { EventSink } from '@core/engine';
import { defineFramework, Session } from '@core/engine';
import { parseJSON } from '@core/orchestrator';
import type { RunFlags } from '@core/types';
import type {
  GrantProposal,
  ReviewerScore,
  PanelRanking,
  GrantPanelConfig,
  GrantPanelResult,
} from './types';
import { DEFAULT_CONFIG } from './types';

export const grantPanel = defineFramework<
  { proposals: GrantProposal[] } | { content: string },
  GrantPanelResult
>({
  name: 'grant-panel',
  description:
    'Comparative prioritization: per-proposal reviewer scoring, panel chair ranking and budget allocation',
  normalize(raw) {
    if (typeof raw === 'object' && raw !== null && 'proposals' in raw) {
      return raw as { proposals: GrantProposal[] };
    }
    const content = (raw as { content?: string })?.content ?? '';
    return { proposals: parseProposalsFromContent(content) };
  },
  async run(rawInput, session) {
    const proposals = (rawInput as { proposals: GrantProposal[] }).proposals;
    const config: GrantPanelConfig = {
      ...DEFAULT_CONFIG,
      ...(session.flags.config as Partial<GrantPanelConfig> | undefined),
    };
    const explicitModel = session.models.override;
    if (explicitModel) {
      config.models = {
        reviewer: explicitModel,
        panel: explicitModel,
      };
    }

    // Phase 1: Independent reviewer scoring
    session.phase(
      'Reviewer Scoring',
      `${proposals.length} proposals × ${config.parameters.reviewersPerProposal} reviewers`
    );
    const reviews = await scoreProposals(proposals, config, session);

    // Phase 2: Panel calibration and ranking
    session.phase('Panel Calibration & Ranking');
    const ranking = await calibrateAndRank(proposals, reviews, config, session);

    session.note(
      `Proposals reviewed: ${proposals.length} | Recommended for funding: ${ranking.allocations.length} | ` +
        `Total allocated: $${ranking.allocations.reduce((sum, a) => sum + a.amount, 0).toLocaleString()}`
    );

    return {
      proposals,
      reviews,
      ranking,
      metadata: {
        timestamp: new Date().toISOString(),
        config,
        decision:
          ranking.rankedProposals.filter((p) => p.fundingRecommendation === 'fund').length > 0
            ? 'approve'
            : ranking.rankedProposals.filter((p) => p.fundingRecommendation === 'fund_if_available')
                  .length > 0
              ? 'delay'
              : 'reject',
      },
    };
  },
});

function parseProposalsFromContent(content: string): GrantProposal[] {
  // Simple parser - in real use, this would be more sophisticated
  return [
    {
      id: 'p1',
      title: 'Proposal from Content',
      abstract: content.slice(0, 200),
      requestedAmount: 100000,
      duration: '12 months',
      document: content,
    },
  ];
}

async function scoreProposals(
  proposals: GrantProposal[],
  config: GrantPanelConfig,
  session: Session
): Promise<ReviewerScore[]> {
  const agentSpecs: Array<{
    name: string;
    prompt: string;
    temperature: number;
    maxTokens: number;
  }> = [];

  for (const proposal of proposals) {
    for (let i = 0; i < config.parameters.reviewersPerProposal; i++) {
      agentSpecs.push({
        name: `reviewer-${proposal.id}-${i + 1}`,
        prompt: `You are a grant reviewer evaluating proposals.

PROPOSAL: ${proposal.title}
REQUESTED: $${proposal.requestedAmount.toLocaleString()} for ${proposal.duration}

ABSTRACT:
${proposal.abstract}

FULL PROPOSAL:
${proposal.document}

Score this proposal (0-10 scale for each criterion) in JSON:
{
  "proposalId": "${proposal.id}",
  "scores": {
    "impact": <0-10>,
    "feasibility": <0-10>,
    "innovation": <0-10>,
    "qualifications": <0-10>
  },
  "overallScore": <0-10>,
  "strengths": ["strength 1", ...],
  "weaknesses": ["weakness 1", ...],
  "comments": "overall assessment"
}`,
        temperature: config.parameters.temperature,
        maxTokens: 1536,
      });
    }
  }

  const responses = await session.parallel(agentSpecs);
  return responses.map((response) => parseJSON<ReviewerScore>(response.content));
}

async function calibrateAndRank(
  proposals: GrantProposal[],
  reviews: ReviewerScore[],
  config: GrantPanelConfig,
  session: Session
): Promise<PanelRanking> {
  const reviewsByProposal = proposals.map((p) => ({
    proposal: p,
    reviews: reviews.filter((r) => r.proposalId === p.id),
  }));

  const reviewsText = reviewsByProposal
    .map(({ proposal, reviews }) => {
      const avgScore = reviews.reduce((sum, r) => sum + r.overallScore, 0) / reviews.length;
      return `Proposal: ${proposal.title} (${proposal.id})\nRequested: $${proposal.requestedAmount.toLocaleString()}\nAverage Score: ${avgScore.toFixed(2)}\nReviews: ${reviews.map((r) => `Score: ${r.overallScore}, Strengths: ${r.strengths.join(', ')}, Weaknesses: ${r.weaknesses.join(', ')}`).join(' | ')}\n`;
    })
    .join('\n---\n\n');

  const response = await session.step({
    name: 'panel-chair',
    prompt: `You are the grant review panel chair calibrating scores and making funding decisions.

TOTAL BUDGET: $${config.totalBudget.toLocaleString()}

PROPOSALS AND REVIEWS:
${reviewsText}

Rank proposals and make funding recommendations in JSON:
{
  "rankedProposals": [
    {
      "proposalId": "...",
      "title": "...",
      "consensusScore": <0-10>,
      "fundingRecommendation": "fund" | "fund_if_available" | "do_not_fund",
      "rationale": "..."
    },
    ...
  ],
  "fundingLine": <index where funding runs out>,
  "totalBudget": ${config.totalBudget},
  "allocations": [
    {"proposalId": "...", "amount": <number>},
    ...
  ],
  "summary": "overall funding decision summary"
}

Rank by quality, allocate budget to highest-ranked proposals until exhausted.`,
    temperature: config.parameters.temperature,
    maxTokens: 2048,
  });

  return parseJSON<PanelRanking>(response.content);
}

/** Backward-compatible entry returning the bare result. */
export async function run(
  input: { proposals: GrantProposal[] } | { content: string },
  flags: RunFlags = {},
  sinks: EventSink[] = []
): Promise<GrantPanelResult> {
  const { result, auditLog } = await grantPanel(input, flags, sinks);
  result.metadata.costUSD = auditLog.metadata.totalCost;
  return result;
}

export * from './types';
