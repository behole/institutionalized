/**
 * Parliamentary Debate Framework — engine port.
 *
 * Flow: opening government → opening opposition → parallel backbenchers →
 * closing opposition → closing government → speaker vote → summary. Speech
 * order is preserved. All provider/audit/logging concerns owned by the engine.
 */
import type { EventSink } from '@core/engine';
import { defineFramework, Session } from '@core/engine';
import { parseJSON } from '@core/orchestrator';
import type { RunFlags } from '@core/types';
import type {
  Motion,
  Speech,
  DebateRecord,
  Vote,
  ParliamentaryResult,
  ParliamentaryConfig,
} from './types';
import { DEFAULT_CONFIG } from './types';

export const parliamentary = defineFramework<Motion | { content: string }, ParliamentaryResult>({
  name: 'parliamentary',
  description:
    'Structured adversarial policy debate: government/opposition speeches, backbenchers, speaker vote and summary',
  normalize(raw) {
    if (typeof raw === 'object' && raw !== null && 'motion' in raw) {
      return raw as Motion;
    }
    const content = (raw as { content?: string })?.content ?? '';
    return { motion: content, context: '' };
  },
  async run(rawMotion, session) {
    const motion = rawMotion as Motion;
    const config: ParliamentaryConfig = {
      ...DEFAULT_CONFIG,
      ...(session.flags.config as Partial<ParliamentaryConfig> | undefined),
    };
    const cliFlags = session.flags as Record<string, unknown>;
    if (cliFlags.backbenchers) {
      config.parameters.backbenchCount = parseInt(String(cliFlags.backbenchers), 10);
    }

    // Engine model override wins over legacy per-role config models.
    const explicitModel = session.models.override;
    if (explicitModel) {
      config.models = {
        speaker: explicitModel,
        debater: explicitModel,
      };
    }

    // Phase 1: Debate
    session.phase('Debate', `${config.parameters.backbenchCount} backbenchers`);
    const debate = await conductDebate(motion, config, session);

    // Phase 2: Vote
    session.phase('Division');
    const vote = await countVotes(motion, debate, config, session);

    // Phase 3: Summary
    session.phase('Summary');
    const summary = await summarizeDebate(motion, vote, config, session);

    session.note(
      `Vote: ${vote.voteCounts.ayes} Ayes, ${vote.voteCounts.noes} Noes — ${vote.outcome}`
    );

    return {
      motion,
      debate,
      vote,
      summary,
      metadata: {
        timestamp: new Date().toISOString(),
        config,
        decision: vote.outcome === 'motion_passed' ? 'approve' : 'reject',
      },
    };
  },
});

async function conductDebate(
  motion: Motion,
  config: ParliamentaryConfig,
  session: Session
): Promise<DebateRecord> {
  // Opening Government
  session.phase('Opening Government');
  const openingGov = await deliverSpeech(
    'Opening Government',
    'government',
    'for',
    motion,
    [],
    config,
    session
  );

  // Opening Opposition
  session.phase('Opening Opposition');
  const openingOpp = await deliverSpeech(
    'Opening Opposition',
    'opposition',
    'against',
    motion,
    [openingGov],
    config,
    session
  );

  // Backbench contributions (parallel)
  session.phase('Backbench Contributions', `${config.parameters.backbenchCount} in parallel`);
  const backbenchResponses = await session.parallel(
    Array.from({ length: config.parameters.backbenchCount }, (_, i) => {
      const position = i % 2 === 0 ? 'for' : 'against';
      const previousSpeeches = [openingGov, openingOpp];
      const previousDebate = `\n\nPREVIOUS SPEECHES:\n${previousSpeeches.map((s) => `${s.speaker} (${s.position}): ${s.keyPoints.join(', ')}`).join('\n')}`;

      return {
        name: `backbencher-${i + 1}`,
        prompt: `You are Backbencher ${i + 1} in a Parliamentary debate.

MOTION: ${motion.motion}

CONTEXT:
${motion.context}
${motion.background ? `\nBACKGROUND:\n${motion.background}` : ''}${previousDebate}

Your role: backbench
Your position: ${position}

Deliver your speech in JSON:
{
  "speech": "your speech (2-3 paragraphs)",
  "keyPoints": ["main point 1", "main point 2", ...]
}

Follow parliamentary conventions: address counterarguments, cite evidence, be persuasive.`,
        temperature: config.parameters.temperature,
        maxTokens: 1536,
      };
    })
  );

  const backbenchContributions: Speech[] = backbenchResponses.map((response, i) => {
    const position = i % 2 === 0 ? 'for' : 'against';
    const parsed = parseJSON<Omit<Speech, 'speaker' | 'role' | 'position'>>(response.content);
    return {
      speaker: `Backbencher ${i + 1}`,
      role: 'backbench' as const,
      position: position,
      ...parsed,
    };
  });

  // Closing Opposition
  session.phase('Closing Opposition');
  const closingOpp = await deliverSpeech(
    'Closing Opposition',
    'opposition',
    'against',
    motion,
    [openingGov, openingOpp, ...backbenchContributions],
    config,
    session
  );

  // Closing Government
  session.phase('Closing Government');
  const closingGov = await deliverSpeech(
    'Closing Government',
    'government',
    'for',
    motion,
    [openingGov, openingOpp, ...backbenchContributions, closingOpp],
    config,
    session
  );

  return {
    openingGovernment: openingGov,
    openingOpposition: openingOpp,
    backbenchContributions,
    closingOpposition: closingOpp,
    closingGovernment: closingGov,
  };
}

async function deliverSpeech(
  speaker: string,
  role: 'government' | 'opposition' | 'backbench',
  position: 'for' | 'against' | 'neutral',
  motion: Motion,
  previousSpeeches: Speech[],
  config: ParliamentaryConfig,
  session: Session
): Promise<Speech> {
  const previousDebate =
    previousSpeeches.length > 0
      ? `\n\nPREVIOUS SPEECHES:\n${previousSpeeches.map((s) => `${s.speaker} (${s.position}): ${s.keyPoints.join(', ')}`).join('\n')}`
      : '';

  const response = await session.step({
    name: `speaker-${speaker.toLowerCase().replace(/\s+/g, '-')}`,
    prompt: `You are ${speaker} in a Parliamentary debate.

MOTION: ${motion.motion}

CONTEXT:
${motion.context}
${motion.background ? `\nBACKGROUND:\n${motion.background}` : ''}${previousDebate}

Your role: ${role}
Your position: ${position}

Deliver your speech in JSON:
{
  "speech": "your speech (2-3 paragraphs)",
  "keyPoints": ["main point 1", "main point 2", ...]
}

Follow parliamentary conventions: address counterarguments, cite evidence, be persuasive.`,
    temperature: config.parameters.temperature,
    maxTokens: 1536,
  });

  const parsed = parseJSON<Omit<Speech, 'speaker' | 'role' | 'position'>>(response.content);
  return {
    speaker,
    role,
    position,
    ...parsed,
  };
}

async function countVotes(
  motion: Motion,
  debate: DebateRecord,
  config: ParliamentaryConfig,
  session: Session
): Promise<Vote> {
  const debateText = [
    debate.openingGovernment,
    debate.openingOpposition,
    ...debate.backbenchContributions,
    debate.closingOpposition,
    debate.closingGovernment,
  ]
    .map((s) => `${s.speaker} (${s.position}): ${s.speech}`)
    .join('\n\n');

  const response = await session.step({
    name: 'speaker-vote',
    prompt: `You are the Speaker presiding over the division (vote).

MOTION: ${motion.motion}

DEBATE:
${debateText}

Count the votes based on the quality and persuasiveness of arguments in JSON:
{
  "decision": "ayes" | "noes" | "abstain",
  "voteCounts": {
    "ayes": <number>,
    "noes": <number>,
    "abstentions": <number>
  },
  "majority": "description of majority",
  "outcome": "motion_passed" | "motion_defeated"
}`,
    temperature: config.parameters.temperature,
    maxTokens: 512,
  });

  return parseJSON<Vote>(response.content);
}

async function summarizeDebate(
  motion: Motion,
  vote: Vote,
  config: ParliamentaryConfig,
  session: Session
): Promise<ParliamentaryResult['summary']> {
  const response = await session.step({
    name: 'speaker-summary',
    prompt: `Summarize the parliamentary debate.

MOTION: ${motion.motion}
OUTCOME: ${vote.outcome}

Provide summary in JSON:
{
  "mainArguments": {
    "for": ["argument 1", ...],
    "against": ["argument 1", ...]
  },
  "keyContentions": ["contention 1", ...],
  "outcome": "summary of what was decided"
}`,
    temperature: config.parameters.temperature,
    maxTokens: 1024,
  });

  return parseJSON<ParliamentaryResult['summary']>(response.content);
}

/** Backward-compatible entry returning the bare result. */
export async function run(
  input: Motion | { content: string },
  flags: RunFlags = {},
  sinks: EventSink[] = []
): Promise<ParliamentaryResult> {
  const { result, auditLog } = await parliamentary(input, flags, sinks);
  result.metadata.costUSD = auditLog.metadata.totalCost;
  return result;
}

export * from './types';
