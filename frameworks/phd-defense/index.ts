/**
 * PhD Defense Framework — engine port.
 *
 * Flow: parallel committee examination → chair renders the decision.
 * Prompts are byte-identical to the original implementation.
 * Provider/model/audit/logging concerns are owned by the engine.
 */
import type { EventSink } from '@core/engine';
import { defineFramework } from '@core/engine';
import { parseJSON } from '@core/orchestrator';
import type { RunFlags } from '@core/types';
import type {
  Proposal,
  CommitteeMember,
  DefenseResult,
  PhDDefenseConfig,
  PhDDefenseOutput,
} from './types';
import { DEFAULT_CONFIG } from './types';

export const phdDefense = defineFramework<Proposal | { content: string }, PhDDefenseOutput>({
  name: 'phd-defense',
  description:
    'Doctoral examination: parallel committee assessment, chair-rendered decision on a proposal',
  normalize(raw) {
    if (typeof raw === 'object' && raw !== null && 'title' in raw) {
      return raw as Proposal;
    }
    const content = (raw as { content?: string })?.content ?? '';
    return { title: 'Untitled Proposal', abstract: '', document: content };
  },
  async run(proposalInput, session) {
    const proposal = proposalInput as Proposal;
    const config: PhDDefenseConfig = {
      ...DEFAULT_CONFIG,
      ...(session.flags.config as Partial<PhDDefenseConfig> | undefined),
    };
    const cliFlags = session.flags as Record<string, unknown>;
    if (cliFlags.committee) {
      config.parameters.committeeSize = parseInt(String(cliFlags.committee), 10);
    }
    if (cliFlags.specialties) {
      config.specialties = String(cliFlags.specialties).split(',');
    }
    // Engine-level model override wins over legacy per-role config models.
    const explicitModel = session.models.override;
    if (explicitModel) {
      config.models = { committee: explicitModel, chair: explicitModel };
    }

    // Phase 1: Committee members examine proposal (parallel)
    const specialties = config.specialties.slice(0, config.parameters.committeeSize);
    session.phase('Committee Examination', `${specialties.length} members in parallel`);
    const committeeSteps = await session.parallel(
      specialties.map((specialty) => ({
        name: `committee-${specialty.toLowerCase().replace(/\s+/g, '-')}`,
        prompt: `You are a PhD committee member with expertise in: ${specialty}

PROPOSAL TITLE: ${proposal.title}

ABSTRACT:
${proposal.abstract || 'N/A'}

${proposal.methodology ? `METHODOLOGY:\n${proposal.methodology}\n` : ''}

${proposal.contributions ? `CONTRIBUTIONS:\n${proposal.contributions}\n` : ''}

FULL DOCUMENT:
${proposal.document}

As an expert in ${specialty}, examine this proposal and provide your assessment in JSON:
{
  "specialty": "${specialty}",
  "questions": ["probing question 1", "question 2", ...],
  "assessment": "overall assessment paragraph",
  "concerns": ["concern 1", "concern 2", ...]
}

Be rigorous and thorough. Ask hard questions that test the depth of understanding.`,
        temperature: config.parameters.temperature,
        maxTokens: 2048,
      }))
    );
    const committee = committeeSteps.map((s) => parseJSON<CommitteeMember>(s.content));
    session.note(`${committee.length} committee assessments received`);

    // Phase 2: Chair synthesizes decision
    session.phase("Chair's Decision");
    const committeeText = committee
      .map(
        (member, idx) =>
          `Committee Member ${idx + 1} (${member.specialty}):\nQuestions: ${member.questions.join(', ')}\nAssessment: ${member.assessment}\nConcerns: ${member.concerns.join(', ')}\n`
      )
      .join('\n---\n\n');

    const decisionStep = await session.step({
      name: 'chair',
      prompt: `You are the PhD defense committee chair.

PROPOSAL: ${proposal.title}

COMMITTEE ASSESSMENTS:
${committeeText}

Based on all committee feedback, render your decision in JSON:
{
  "decision": "pass" | "pass_with_revisions" | "major_revisions" | "fail",
  "summary": "decision summary paragraph",
  "strengths": ["strength 1", ...],
  "weaknesses": ["weakness 1", ...],
  "requiredRevisions": ["revision 1", ...],
  "recommendations": ["recommendation 1", ...]
}

Standards:
- "pass": No revisions needed, ready to proceed
- "pass_with_revisions": Minor clarifications required
- "major_revisions": Significant work needed, re-defense may be required
- "fail": Fundamental issues, proposal not viable`,
      temperature: config.parameters.temperature,
      maxTokens: 2048,
    });
    const defense = parseJSON<DefenseResult>(decisionStep.content);
    session.note(
      `Decision: ${defense.decision.toUpperCase()} | Required revisions: ${defense.requiredRevisions.length}`
    );

    return {
      proposal,
      committee,
      defense,
      metadata: {
        timestamp: new Date().toISOString(),
        config,
        decision:
          defense.decision === 'pass'
            ? 'approve'
            : defense.decision === 'fail'
              ? 'reject'
              : 'delay',
      },
    };
  },
});

/**
 * Backward-compatible entry: runs the framework, patches cost from
 * the audit log, returns the bare result (legacy contract).
 */
export async function run(
  input: Proposal | { content: string },
  flags: RunFlags = {},
  sinks: EventSink[] = []
): Promise<PhDDefenseOutput> {
  const { result, auditLog } = await phdDefense(input, flags, sinks);
  result.metadata.costUSD = auditLog.metadata.totalCost;
  return result;
}

export * from './types';
