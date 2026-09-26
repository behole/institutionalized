/**
 * Architecture Review Board Framework — engine port.
 *
 * Flow: parallel domain specialist reviews → board chair synthesizes the
 * decision. Prompts are byte-identical to the original implementation.
 * Provider/model/audit/logging concerns are owned by the engine.
 */
import type { EventSink } from '@core/engine';
import { defineFramework } from '@core/engine';
import { parseJSON } from '@core/orchestrator';
import type { RunFlags } from '@core/types';
import type {
  ArchitectureProposal,
  SpecialistReview,
  BoardDecision,
  ArchitectureReviewConfig,
  ArchitectureReviewResult,
} from './types';
import { DEFAULT_CONFIG } from './types';

export const architectureReview = defineFramework<
  ArchitectureProposal | { content: string },
  ArchitectureReviewResult
>({
  name: 'architecture-review',
  description:
    'Architecture Review Board: multi-domain system design validation from specialist perspectives',
  normalize(raw) {
    if (typeof raw === 'object' && raw !== null && 'title' in raw) {
      return raw as ArchitectureProposal;
    }
    const content = (raw as { content?: string })?.content ?? '';
    return { title: 'Untitled Architecture', summary: '', design: content };
  },
  async run(proposalInput, session) {
    const proposal = proposalInput as ArchitectureProposal;
    const config: ArchitectureReviewConfig = {
      ...DEFAULT_CONFIG,
      ...(session.flags.config as Partial<ArchitectureReviewConfig> | undefined),
    };
    const cliFlags = session.flags as Record<string, unknown>;
    if (cliFlags.domains) {
      config.domains = String(cliFlags.domains).split(',');
    }
    // Engine-level model override wins over legacy per-role config models.
    const explicitModel = session.models.override;
    if (explicitModel) {
      config.models = { specialist: explicitModel, chair: explicitModel };
    }

    // Phase 1: Domain specialists review (parallel)
    session.phase('Domain Specialist Reviews', `${config.domains.length} domains`);
    const reviewSteps = await session.parallel(
      config.domains.map((domain) => ({
        name: `specialist-${domain.toLowerCase().replace(/\s+/g, '-')}`,
        prompt: `You are an Architecture Review Board member specializing in: ${domain}

ARCHITECTURE PROPOSAL: ${proposal.title}

SUMMARY:
${proposal.summary}

${proposal.requirements ? `REQUIREMENTS:\n${proposal.requirements}\n` : ''}

${proposal.constraints ? `CONSTRAINTS:\n${proposal.constraints}\n` : ''}

DESIGN DOCUMENT:
${proposal.design}

Review this architecture from your domain perspective (${domain}) and provide assessment in JSON:
{
  "domain": "${domain}",
  "concerns": ["concern 1", "concern 2", ...],
  "recommendations": ["recommendation 1", ...],
  "riskLevel": "low" | "medium" | "high" | "critical",
  "verdict": "approve" | "approve_with_conditions" | "revise" | "reject",
  "rationale": "explanation of your verdict"
}

Be thorough and identify potential issues specific to your domain.`,
        temperature: config.parameters.temperature,
        maxTokens: 2048,
      }))
    );
    const reviews = reviewSteps.map((s) => parseJSON<SpecialistReview>(s.content));
    session.note(`${reviews.length} specialist reviews received`);

    // Phase 2: Board chair synthesizes decision
    session.phase('Board Decision');
    const reviewsText = reviews
      .map(
        (review) =>
          `${review.domain}:\nVerdict: ${review.verdict}\nRisk Level: ${review.riskLevel}\nConcerns: ${review.concerns.join(', ')}\nRecommendations: ${review.recommendations.join(', ')}\nRationale: ${review.rationale}\n`
      )
      .join('\n---\n\n');

    const decisionStep = await session.step({
      name: 'chair',
      prompt: `You are the Architecture Review Board chair.

PROPOSAL: ${proposal.title}

SPECIALIST REVIEWS:
${reviewsText}

Based on all specialist reviews, render the board's decision in JSON:
{
  "decision": "approved" | "approved_with_conditions" | "major_revisions" | "rejected",
  "summary": "decision summary paragraph",
  "criticalIssues": ["critical issue 1", ...],
  "requiredChanges": ["required change 1", ...],
  "recommendations": ["recommendation 1", ...],
  "tradeoffs": ["identified tradeoff 1", ...]
}

Decision criteria:
- "approved": No significant concerns, ready to proceed
- "approved_with_conditions": Minor issues, can proceed with documented conditions
- "major_revisions": Significant concerns requiring redesign and re-review
- "rejected": Fundamental flaws, not viable approach`,
      temperature: config.parameters.temperature,
      maxTokens: 2048,
    });
    const decision = parseJSON<BoardDecision>(decisionStep.content);
    session.note(
      `Decision: ${decision.decision.toUpperCase()} | Critical issues: ${decision.criticalIssues.length} | Required changes: ${decision.requiredChanges.length}`
    );

    return {
      proposal,
      reviews,
      decision,
      metadata: {
        timestamp: new Date().toISOString(),
        config,
        decision:
          decision.decision === 'approved'
            ? 'approve'
            : decision.decision === 'approved_with_conditions'
              ? 'delay'
              : 'reject',
      },
    };
  },
});

/**
 * Backward-compatible entry: runs the framework, patches cost from
 * the audit log, returns the bare result (legacy contract).
 */
export async function run(
  input: ArchitectureProposal | { content: string },
  flags: RunFlags = {},
  sinks: EventSink[] = []
): Promise<ArchitectureReviewResult> {
  const { result, auditLog } = await architectureReview(input, flags, sinks);
  result.metadata.costUSD = auditLog.metadata.totalCost;
  return result;
}

export * from './types';
