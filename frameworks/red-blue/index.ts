/**
 * Red-Blue Team Framework — engine port.
 *
 * Flow: blue proposal → N sequential red attack rounds → observer synthesis.
 * Agent prompt/parse logic in blue-team/red-team/observer files, untouched.
 */
import type { EventSink } from '@core/engine';
import { defineFramework, Session } from '@core/engine';
import type { LLMProvider, RunFlags } from '@core/types';
import type { Target, RedBlueConfig, RedBlueResult } from './types';
import { DEFAULT_CONFIG } from './types';
import { proposeSystem } from './blue-team';
import { attackSystem } from './red-team';
import { synthesizeFindings } from './observer';

/** Legacy agent functions expect an LLMProvider; route through the session. */
function sessionProvider(
  session: Session,
  agentName: string,
  model: string,
  temperature?: number,
  maxTokens?: number
): LLMProvider {
  return {
    name: 'engine',
    call: (params) =>
      session.call(agentName, {
        model,
        temperature: params.temperature ?? temperature,
        systemPrompt: params.systemPrompt,
        messages: params.messages,
        maxTokens: params.maxTokens ?? maxTokens,
      }),
    calculateCost: (usage, m) => session.provider.calculateCost(usage, m),
  };
}

export const redBlue = defineFramework<Target | { content: string }, RedBlueResult>({
  name: 'red-blue',
  description:
    'Adversarial security review: blue team proposes, red team attacks in rounds, observer synthesizes',
  normalize(raw) {
    if (typeof raw === 'object' && raw !== null && 'system' in raw) {
      return raw as Target;
    }
    const content = (raw as { content?: string })?.content ?? '';
    return { system: content };
  },
  async run(target, session) {
    const config: RedBlueConfig = {
      ...DEFAULT_CONFIG,
      ...(session.flags.config as Partial<RedBlueConfig> | undefined),
    };
    const explicitModel = session.models.override;
    if (explicitModel) {
      config.models = { blueTeam: explicitModel, redTeam: explicitModel, observer: explicitModel };
    }
    const targetData = target as Target;

    // Phase 1: Blue team proposal
    session.phase('Blue Team Proposal');
    const blueProposal = await proposeSystem(
      targetData,
      config,
      sessionProvider(
        session,
        'blue-team',
        config.models.blueTeam,
        config.parameters.blueTemperature
      )
    );

    // Phase 2: Red team attacks (sequential rounds — each sees prior attacks)
    session.phase('Red Team Attacks', `${config.parameters.rounds} rounds`);
    const redAttacks = [];
    for (let round = 1; round <= config.parameters.rounds; round++) {
      const attack = await attackSystem(
        targetData,
        blueProposal,
        round,
        config,
        sessionProvider(
          session,
          `red-team-r${round}`,
          config.models.redTeam,
          config.parameters.redTemperature
        )
      );
      redAttacks.push(attack);
      const criticalCount = attack.vulnerabilities.filter((v) => v.severity === 'critical').length;
      session.note(
        `Round ${round}: ${attack.vulnerabilities.length} vulnerabilities (${criticalCount} critical)`
      );
    }

    // Phase 3: Observer synthesis
    session.phase('Observer Synthesis');
    const observerReport = await synthesizeFindings(
      targetData,
      blueProposal,
      redAttacks,
      config,
      sessionProvider(
        session,
        'observer',
        config.models.observer,
        config.parameters.observerTemperature
      )
    );

    return {
      target: targetData,
      blueProposal,
      redAttacks,
      observerReport,
      metadata: {
        timestamp: new Date().toISOString(),
        rounds: config.parameters.rounds,
        config,
        decision: observerReport.verdict === 'ready' ? 'approve' : 'delay',
      },
    };
  },
});

/** Backward-compatible entry returning the bare result. */
export async function run(
  input: Target | { content: string },
  flags: RunFlags = {},
  sinks: EventSink[] = []
): Promise<RedBlueResult> {
  const { result, auditLog } = await redBlue(input, flags, sinks);
  result.metadata.costUSD = auditLog.metadata.totalCost;
  return result;
}

export { runRedBlue } from './orchestrator';
export * from './types';
