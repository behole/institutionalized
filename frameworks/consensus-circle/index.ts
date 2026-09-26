/**
 * Consensus Circle Framework — engine port.
 *
 * Flow: Quaker-style rounds — parallel participant voices → clerk synthesis
 * → repeat until no blocking concerns → final decision. All provider/model/
 * audit/logging concerns owned by the engine.
 */
import type { EventSink } from '@core/engine';
import { defineFramework, Session } from '@core/engine';
import { parseJSON } from '@core/orchestrator';
import type { RunFlags } from '@core/types';
import type {
  Proposal,
  ParticipantVoice,
  ConsensusRound,
  ConsensusDecision,
  ConsensusCircleConfig,
  ConsensusCircleResult,
} from './types';
import { DEFAULT_CONFIG } from './types';

export const consensusCircle = defineFramework<
  Proposal | { content: string },
  ConsensusCircleResult
>({
  name: 'consensus-circle',
  description: 'Quaker-inspired consensus building without voting: rounds of voices until unity',
  normalize(raw) {
    if (typeof raw === 'object' && raw !== null && 'question' in raw) {
      return raw as Proposal;
    }
    const content = (raw as { content?: string })?.content ?? '';
    return { question: content, context: '' };
  },
  async run(rawInput, session) {
    const proposal = rawInput as Proposal;
    const config: ConsensusCircleConfig = {
      ...DEFAULT_CONFIG,
      ...(session.flags.config as Partial<ConsensusCircleConfig> | undefined),
    };
    const explicitModel = session.models.override;
    if (explicitModel) {
      config.models = {
        participant: explicitModel,
        clerk: explicitModel,
      };
    }

    const rounds: ConsensusRound[] = [];
    let consensusAchieved = false;

    for (let round = 1; round <= config.parameters.maxRounds && !consensusAchieved; round++) {
      session.phase(`Round ${round}`, 'Gathering voices');

      const previousRound = rounds[rounds.length - 1];
      const voices = await gatherVoices(proposal, round, previousRound, config, session);
      const roundSummary = await synthesizeRound(proposal, voices, round, config, session);

      rounds.push(roundSummary);
      consensusAchieved = roundSummary.blockingConcerns.length === 0;

      session.note(
        `Round ${round}: ${roundSummary.areasOfAgreement.length} agreements, ` +
          `${roundSummary.blockingConcerns.length} blocking` +
          (consensusAchieved ? ' — consensus achieved' : '')
      );
    }

    session.phase('Final Decision');
    const decision = await formulateDecision(proposal, rounds, config, session);

    session.note(
      `Consensus achieved: ${decision.consensusAchieved ? 'yes' : 'no'} | ` +
        `Addressed concerns: ${decision.addressedConcerns.length}`
    );

    return {
      proposal,
      rounds,
      decision,
      metadata: {
        timestamp: new Date().toISOString(),
        config,
        decision: decision.consensusAchieved ? 'approve' : 'delay',
      },
    };
  },
});

async function gatherVoices(
  proposal: Proposal,
  round: number,
  previousRound: ConsensusRound | undefined,
  config: ConsensusCircleConfig,
  session: Session
): Promise<ParticipantVoice[]> {
  const perspectives = [
    'Pragmatic implementer',
    'Values guardian',
    'Systems thinker',
    'Affected community member',
    'Future-oriented planner',
  ].slice(0, config.parameters.participantCount);

  const responses = await session.parallel(
    perspectives.map((perspective, i) => {
      let prompt = `You are a participant in a Consensus Circle (Quaker-style decision making) with the perspective of: ${perspective}.

PROPOSAL:
${proposal.question}

CONTEXT:
${proposal.context}

${proposal.options ? `OPTIONS:\n${proposal.options.map((o) => `- ${o}`).join('\n')}\n` : ''}`;

      if (previousRound) {
        prompt += `\nPREVIOUS ROUND SUMMARY:
Emerging Direction: ${previousRound.emergingDirection}
Areas of Agreement: ${previousRound.areasOfAgreement.join(', ')}
Blocking Concerns: ${previousRound.blockingConcerns.join(', ')}

You may refine your voice based on the emerging consensus.`;
      }

      prompt += `\n\nShare your voice in JSON (Round ${round}):
{
  "perspective": "${perspective}",
  "concerns": ["concern 1", ...],
  "supportedAspects": ["what you support", ...],
  "blockingConcerns": ["fundamental objections", ...],
  "suggestions": ["suggestion for unity", ...]
}

In Quaker consensus, all voices are valued equally. Express concerns honestly. Only list blockingConcerns if they represent fundamental moral or practical objections.`;

      return {
        name: `participant-${i + 1}`,
        prompt,
        temperature: config.parameters.temperature,
        maxTokens: 1024,
      };
    })
  );

  return responses.map((response, i) => {
    const parsed = parseJSON<Omit<ParticipantVoice, 'participantId'>>(response.content);
    return {
      participantId: `p${i + 1}`,
      ...parsed,
    };
  });
}

async function synthesizeRound(
  proposal: Proposal,
  voices: ParticipantVoice[],
  round: number,
  config: ConsensusCircleConfig,
  session: Session
): Promise<ConsensusRound> {
  const voicesText = voices
    .map(
      (v) =>
        `${v.perspective}:\nConcerns: ${v.concerns.join(', ')}\nSupports: ${v.supportedAspects.join(', ')}\nBlocking: ${v.blockingConcerns.join(', ')}\nSuggestions: ${v.suggestions.join(', ')}`
    )
    .join('\n\n');

  const response = await session.step({
    name: `clerk-round-${round}`,
    prompt: `You are the Clerk synthesizing this round of consensus building.

PROPOSAL: ${proposal.question}

VOICES:
${voicesText}

Synthesize this round in JSON:
{
  "emergingDirection": "where consensus is forming",
  "blockingConcerns": ["fundamental objection 1", ...],
  "areasOfAgreement": ["agreement 1", ...]
}

Only include concerns that are truly blocking (fundamental objections), not minor reservations.`,
    temperature: config.parameters.temperature,
    maxTokens: 1024,
  });

  const parsed = parseJSON<Omit<ConsensusRound, 'round' | 'voices'>>(response.content);
  return {
    round,
    voices,
    ...parsed,
  };
}

async function formulateDecision(
  proposal: Proposal,
  rounds: ConsensusRound[],
  config: ConsensusCircleConfig,
  session: Session
): Promise<ConsensusDecision> {
  const roundsText = rounds
    .map(
      (r) =>
        `Round ${r.round}:\nEmerging: ${r.emergingDirection}\nBlocking: ${r.blockingConcerns.join(', ')}\nAgreement: ${r.areasOfAgreement.join(', ')}`
    )
    .join('\n\n');

  const response = await session.step({
    name: 'clerk-final',
    prompt: `You are the Clerk formulating the final decision from the consensus process.

PROPOSAL: ${proposal.question}

ROUNDS:
${roundsText}

Formulate the decision in JSON:
{
  "decision": "the emerged decision statement",
  "consensusAchieved": <boolean>,
  "unitySummary": "how unity was achieved",
  "addressedConcerns": [
    {"concern": "...", "resolution": "how it was addressed"},
    ...
  ],
  "remainingReservations": ["reservation 1", ...],
  "commitments": ["commitment for implementation", ...]
}`,
    temperature: config.parameters.temperature,
    maxTokens: 1536,
  });

  return parseJSON<ConsensusDecision>(response.content);
}

/** Backward-compatible entry returning the bare result. */
export async function run(
  input: Proposal | { content: string },
  flags: RunFlags = {},
  sinks: EventSink[] = []
): Promise<ConsensusCircleResult> {
  const { result, auditLog } = await consensusCircle(input, flags, sinks);
  result.metadata.costUSD = auditLog.metadata.totalCost;
  return result;
}

export * from './types';
