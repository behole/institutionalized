/**
 * Tumor Board / MDT Framework — engine port.
 *
 * Flow: parallel specialist inputs → chair-led team discussion → consensus
 * recommendation. All provider/model/audit/logging concerns owned by the
 * engine.
 */
import type { EventSink } from '@core/engine';
import { defineFramework } from '@core/engine';
import { parseJSON } from '@core/orchestrator';
import type { RunFlags } from '@core/types';
import type {
  Case,
  SpecialistInput,
  TeamDiscussion,
  Recommendation,
  TumorBoardConfig,
  TumorBoardResult,
} from './types';
import { DEFAULT_CONFIG } from './types';

export const tumorBoard = defineFramework<Case | { content: string }, TumorBoardResult>({
  name: 'tumor-board',
  description:
    'Multidisciplinary team (MDT) consensus: parallel specialist inputs, chair discussion, recommendation',
  normalize(raw) {
    if (typeof raw === 'object' && raw !== null && 'caseId' in raw) {
      return raw as Case;
    }
    const content = (raw as { content?: string })?.content ?? '';
    return { caseId: 'case-1', summary: content };
  },
  async run(caseInput, session) {
    const caseData = caseInput as Case;
    const config: TumorBoardConfig = {
      ...DEFAULT_CONFIG,
      ...(session.flags.config as Partial<TumorBoardConfig> | undefined),
    };
    const cliFlags = session.flags as Record<string, unknown>;
    if (cliFlags.specialties) {
      config.specialties = String(cliFlags.specialties).split(',');
    }

    // Engine model override wins over legacy per-role config models.
    const explicitModel = session.models.override;
    if (explicitModel) {
      config.models = {
        specialist: explicitModel,
        chair: explicitModel,
      };
    }

    // Phase 1: Specialist inputs (parallel)
    session.phase('Specialist Inputs', `${config.specialties.length} specialists in parallel`);
    const specialistResponses = await session.parallel(
      config.specialties.map((specialty) => ({
        name: `specialist-${specialty.toLowerCase().replace(/\s+/g, '-')}`,
        prompt: `You are a ${specialty} specialist in a multidisciplinary team meeting.

CASE: ${caseData.caseId}

SUMMARY:
${caseData.summary}

${caseData.patientFactors ? `PATIENT FACTORS:\n${caseData.patientFactors.map((f) => `- ${f}`).join('\n')}\n` : ''}
${caseData.constraints ? `CONSTRAINTS:\n${caseData.constraints.map((c) => `- ${c}`).join('\n')}\n` : ''}
${caseData.options ? `OPTIONS:\n${caseData.options.map((o) => `- ${o}`).join('\n')}\n` : ''}

Provide your specialist input in JSON:
{
  "specialty": "${specialty}",
  "assessment": "your assessment from this specialty's perspective",
  "recommendations": ["recommendation 1", ...],
  "concerns": ["concern 1", ...],
  "contraindications": ["contraindication 1", ...]
}`,
        temperature: config.parameters.temperature,
        maxTokens: 1536,
      }))
    );
    const specialistInputs = specialistResponses.map((response) =>
      parseJSON<SpecialistInput>(response.content)
    );
    session.note(`Specialists consulted: ${specialistInputs.length}`);

    // Phase 2: Team discussion
    session.phase('Team Discussion');
    const inputsText = specialistInputs
      .map(
        (input) =>
          `${input.specialty}:\nAssessment: ${input.assessment}\nRecommendations: ${input.recommendations.join(', ')}\nConcerns: ${input.concerns.join(', ')}`
      )
      .join('\n\n');

    const discussionResponse = await session.step({
      name: 'chair-discussion',
      prompt: `You are chairing a multidisciplinary team discussion.

CASE: ${caseData.caseId}

SPECIALIST INPUTS:
${inputsText}

Synthesize the team discussion in JSON:
{
  "consensusPoints": ["point of agreement 1", ...],
  "disagreements": [
    {
      "point": "point of disagreement",
      "perspectives": ["perspective 1", "perspective 2", ...]
    },
    ...
  ],
  "criticalFactors": ["critical factor 1", ...]
}`,
      temperature: config.parameters.temperature,
      maxTokens: 1536,
    });
    const discussion = parseJSON<TeamDiscussion>(discussionResponse.content);

    // Phase 3: Consensus recommendation
    session.phase('Consensus Recommendation');
    const recommendationsText = specialistInputs
      .map((input) => `${input.specialty}: ${input.recommendations.join(', ')}`)
      .join('\n');

    const recommendationResponse = await session.step({
      name: 'chair-recommendation',
      prompt: `Formulate the multidisciplinary team's consensus recommendation.

CASE: ${caseData.caseId}

CONSENSUS POINTS:
${discussion.consensusPoints.map((p) => `- ${p}`).join('\n')}

DISAGREEMENTS:
${discussion.disagreements.map((d) => `${d.point}: ${d.perspectives.join(', ')}`).join('\n')}

SPECIALIST RECOMMENDATIONS:
${recommendationsText}

Provide consensus recommendation in JSON:
{
  "primaryRecommendation": "the team's primary recommendation",
  "rationale": "why this recommendation",
  "alternativeOptions": ["alternative 1", ...],
  "riskConsiderations": ["risk 1", ...],
  "patientCenteredFactors": ["patient factor 1", ...],
  "followUpPlan": ["follow-up step 1", ...],
  "contingencies": ["if X happens, then Y", ...]
}`,
      temperature: config.parameters.temperature,
      maxTokens: 2048,
    });
    const recommendation = parseJSON<Recommendation>(recommendationResponse.content);

    session.note(
      `Consensus points: ${discussion.consensusPoints.length} | Primary recommendation: ${recommendation.primaryRecommendation}`
    );

    return {
      case: caseData,
      specialistInputs,
      discussion,
      recommendation,
      metadata: {
        timestamp: new Date().toISOString(),
        config,
        decision:
          discussion.criticalFactors.length > 0 ||
          specialistInputs.some((s) => s.contraindications.length > 0)
            ? 'delay'
            : 'approve',
      },
    };
  },
});

/** Backward-compatible entry returning the bare result. */
export async function run(
  input: Case | { content: string },
  flags: RunFlags = {},
  sinks: EventSink[] = []
): Promise<TumorBoardResult> {
  const { result, auditLog } = await tumorBoard(input, flags, sinks);
  result.metadata.costUSD = auditLog.metadata.totalCost;
  return result;
}

export * from './types';
