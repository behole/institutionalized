/**
 * Studio Critique Framework — engine port.
 *
 * Flow: parallel peer observation → parallel critique → optional creator
 * response → instructor synthesis. Agent prompt/parse logic lives in the
 * peer/creator/instructor files, untouched. Provider/model/audit/logging
 * owned by the engine.
 */
import type { EventSink } from '@core/engine';
import { defineFramework, Session } from '@core/engine';
import type { LLMProvider, RunFlags } from '@core/types';
import type { CreativeWork, StudioConfig, StudioResult } from './types';
import { DEFAULT_CONFIG } from './types';
import { observeWork, critiqueWork } from './peer';
import { respondToFeedback } from './creator';
import { synthesizeCritique } from './instructor';

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
        maxTokens: params.maxTokens,
        systemPrompt: params.systemPrompt,
        messages: params.messages,
      }),
    calculateCost: (usage, m) => session.provider.calculateCost(usage, m),
  };
}

export const studio = defineFramework<CreativeWork | { content: string }, StudioResult>({
  name: 'studio',
  description:
    'Creative work evaluation with peer observation, critique, creator response, instructor synthesis',
  normalize(raw) {
    if (typeof raw === 'object' && raw !== null && 'work' in raw) {
      return raw as CreativeWork;
    }
    const content = (raw as { content?: string })?.content ?? '';
    return { work: content, workType: 'general' };
  },
  async run(rawInput, session) {
    const work = rawInput as CreativeWork;
    const config: StudioConfig = {
      ...DEFAULT_CONFIG,
      ...(session.flags.config as Partial<StudioConfig> | undefined),
    };
    const cliFlags = session.flags as Record<string, unknown>;
    if (cliFlags.peers) {
      config.parameters.numPeers = parseInt(String(cliFlags.peers), 10);
    }
    if (cliFlags.noCreatorResponse) {
      config.parameters.enableCreatorResponse = false;
    }
    const explicitModel = session.models.override;
    if (explicitModel) {
      config.models = {
        peers: explicitModel,
        creator: explicitModel,
        instructor: explicitModel,
      };
    }

    // Phase 1: Silent observation (parallel)
    session.phase('Silent Observation', `${config.parameters.numPeers} peers observing in silence`);
    const observations = await Promise.all(
      Array.from({ length: config.parameters.numPeers }, (_, i) =>
        observeWork(
          i + 1,
          work,
          config,
          sessionProvider(
            session,
            `observer-${i + 1}`,
            config.models.peers,
            config.parameters.peerTemperature
          )
        )
      )
    );
    session.note(
      observations
        .map(
          (obs) =>
            `${obs.peer}: obs ${obs.observations.length}/q ${obs.questions.length}/rx ${obs.reactions.length}`
        )
        .join(' | ')
    );

    // Phase 2: Structured critique (parallel)
    session.phase('Structured Critique', 'Peers providing feedback');
    const critiques = await Promise.all(
      Array.from({ length: config.parameters.numPeers }, (_, i) =>
        critiqueWork(
          i + 1,
          work,
          config,
          sessionProvider(
            session,
            `critic-${i + 1}`,
            config.models.peers,
            config.parameters.peerTemperature
          )
        )
      )
    );
    session.note(
      critiques
        .map(
          (c) =>
            `${c.peer}: +${c.strengths.length}/-${c.weaknesses.length}/→${c.suggestions.length}`
        )
        .join(' | ')
    );

    // Phase 3: Creator response (optional)
    let creatorResponse;
    if (config.parameters.enableCreatorResponse) {
      session.phase('Creator Response', 'Creator responding to feedback');
      creatorResponse = await respondToFeedback(
        work,
        observations,
        critiques,
        config,
        sessionProvider(session, 'creator', config.models.creator, 0.6)
      );
      session.note(
        `Clarifications: ${creatorResponse.clarifications.length} | Intentions: ${creatorResponse.intentions.length}`
      );
    }

    // Phase 4: Instructor synthesis
    session.phase('Instructor Synthesis', 'Instructor synthesizing feedback');
    const synthesis = await synthesizeCritique(
      work,
      observations,
      critiques,
      creatorResponse,
      config,
      sessionProvider(
        session,
        'instructor',
        config.models.instructor,
        config.parameters.instructorTemperature
      )
    );

    session.note(
      `Overall: ${synthesis.overallAssessment.slice(0, 100)}${synthesis.overallAssessment.length > 100 ? '…' : ''}`
    );

    return {
      work,
      observations,
      critiques,
      creatorResponse,
      synthesis,
      metadata: {
        timestamp: new Date().toISOString(),
        numPeers: config.parameters.numPeers,
        config,
        decision: synthesis.nextSteps.length > 0 ? 'delay' : 'unclear',
      },
    };
  },
});

/** Backward-compatible entry returning the bare result. */
export async function run(
  input: CreativeWork | { content: string },
  flags: RunFlags = {},
  sinks: EventSink[] = []
): Promise<StudioResult> {
  const { result, auditLog } = await studio(input, flags, sinks);
  result.metadata.costUSD = auditLog.metadata.totalCost;
  return result;
}

export { runStudio } from './orchestrator';
export * from './types';
