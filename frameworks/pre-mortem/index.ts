/**
 * Pre-mortem Framework — engine port.
 *
 * Flow: parallel pessimists imagine failure → facilitator synthesizes risk
 * assessment. Agent prompt/parse logic in pessimist/facilitator, untouched.
 */
import type { EventSink } from '@core/engine';
import { defineFramework, Session } from '@core/engine';
import type { LLMProvider, RunFlags } from '@core/types';
import type { Plan, PreMortemConfig, PreMortemResult } from './types';
import { DEFAULT_CONFIG } from './types';
import { imagineFailure } from './pessimist';
import { synthesizeRisks } from './facilitator';

/** Legacy agent functions expect an LLMProvider; route through the session. */
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
        temperature: params.temperature ?? temperature,
        systemPrompt: params.systemPrompt,
        messages: params.messages,
        maxTokens: params.maxTokens,
      }),
    calculateCost: (usage, m) => session.provider.calculateCost(usage, m),
  };
}

export const preMortem = defineFramework<Plan | { content: string }, PreMortemResult>({
  name: 'pre-mortem',
  description:
    'Imagines the plan already failed: parallel pessimists surface risks, facilitator synthesizes',
  normalize(raw) {
    if (typeof raw === 'object' && raw !== null && 'description' in raw) {
      return raw as Plan;
    }
    const content = (raw as { content?: string })?.content ?? '';
    return { description: content };
  },
  async run(plan, session) {
    const config: PreMortemConfig = {
      ...DEFAULT_CONFIG,
      ...(session.flags.config as Partial<PreMortemConfig> | undefined),
    };
    const explicitModel = session.models.override;
    if (explicitModel) {
      config.models = { pessimists: explicitModel, facilitator: explicitModel };
    }
    const planData = plan as Plan;

    // Phase 1: Pessimists imagine failure (parallel)
    session.phase('Failure Imagination', `${config.parameters.numPessimists} pessimists`);
    const scenarios = await Promise.all(
      Array.from({ length: config.parameters.numPessimists }, (_, i) =>
        imagineFailure(
          i + 1,
          planData,
          config,
          sessionProvider(
            session,
            `pessimist-${i + 1}`,
            config.models.pessimists,
            config.parameters.pessimistTemperature
          )
        )
      )
    );
    session.note(`${scenarios.length} failure scenarios imagined`);

    // Phase 2: Facilitator synthesis
    session.phase('Risk Synthesis');
    const assessment = await synthesizeRisks(
      planData,
      scenarios,
      config,
      sessionProvider(
        session,
        'facilitator',
        config.models.facilitator,
        config.parameters.facilitatorTemperature
      )
    );

    return {
      plan: planData,
      scenarios,
      assessment,
      metadata: {
        timestamp: new Date().toISOString(),
        numPessimists: config.parameters.numPessimists,
        config,
        decision: assessment.recommendation === 'proceed' ? 'approve' : 'delay',
      },
    };
  },
});

/** Backward-compatible entry returning the bare result. */
export async function run(
  input: Plan | { content: string },
  flags: RunFlags = {},
  sinks: EventSink[] = []
): Promise<PreMortemResult> {
  const { result, auditLog } = await preMortem(input, flags, sinks);
  result.metadata.costUSD = auditLog.metadata.totalCost;
  return result;
}

export { runPreMortem } from './orchestrator';
export * from './types';
