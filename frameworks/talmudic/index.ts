/**
 * Talmudic Dialectic Framework — engine port.
 *
 * Flow: sequential multiple interpretations → pairwise counterpoint debate →
 * practical resolution → insight extraction. Prompt/parse content lives in
 * interpreters.ts, untouched. Provider/model/audit/logging concerns are
 * owned by the engine.
 */
import type { EventSink } from '@core/engine';
import { defineFramework } from '@core/engine';
import type { RunFlags } from '@core/types';
import type {
  TextualProblem,
  Interpretation,
  CounterInterpretation,
  TalmudicConfig,
  TalmudicResult,
} from './types';
import { DEFAULT_CONFIG } from './types';
import {
  buildInterpretationPrompt,
  parseInterpretationResponse,
  buildCounterpointPrompt,
  parseCounterpointResponse,
  buildResolutionPrompt,
  parseResolutionResponse,
  extractInsights,
} from './interpreters';

export const talmudic = defineFramework<TextualProblem | { content: string }, TalmudicResult>({
  name: 'talmudic',
  description:
    'Talmudic dialectic: multiple interpretations of a text, counterpoint debate, practical resolution',
  normalize(raw) {
    if (typeof raw === 'object' && raw !== null && 'text' in raw) {
      return raw as TextualProblem;
    }
    const content = (raw as { content?: string })?.content ?? '';
    return { text: content };
  },
  async run(problemInput, session) {
    const problem = problemInput as TextualProblem;
    const startTime = Date.now();
    const config: TalmudicConfig = {
      ...DEFAULT_CONFIG,
      ...(session.flags.config as Partial<TalmudicConfig> | undefined),
    };
    // Engine-level model override wins over legacy per-interpreter config models.
    const explicitModel = session.models.override;
    if (explicitModel) {
      config.models = { ...config.models, resolver: explicitModel };
      for (const key of Object.keys(config.models)) {
        config.models[key] = explicitModel;
      }
    }

    // Phase 1: Multiple interpretations (sequential)
    session.phase('Multiple Interpretations', `${config.parameters.interpreterCount} interpreters`);
    const interpretations: Interpretation[] = [];
    const interpreterNames = Object.keys(config.models).filter((k) => k.startsWith('interpreter'));

    for (let i = 0; i < config.parameters.interpreterCount && i < interpreterNames.length; i++) {
      const interpreterName = interpreterNames[i];
      const { system, user } = buildInterpretationPrompt(problem, interpreterName, config);
      const step = await session.step({
        name: interpreterName,
        prompt: user,
        temperature: config.parameters.temperature,
        maxTokens: 4096,
        systemPrompt: system,
      });
      interpretations.push(parseInterpretationResponse(step.content, interpreterName));
    }
    session.note(`${interpretations.length} interpretations generated`);

    // Phase 2: Counterpoints and debate (pairwise, sequential)
    session.phase('Counterpoints and Debate');
    const counterpoints: CounterInterpretation[] = [];
    for (let i = 0; i < interpretations.length; i++) {
      for (let j = 0; j < interpretations.length; j++) {
        if (i === j) {
          continue;
        }
        const { system, user } = buildCounterpointPrompt(
          problem,
          interpretations[i],
          interpretations[j],
          config
        );
        const agentName = `counterpoint-${interpretations[i].interpreter}-vs-${interpretations[j].interpreter}`;
        const step = await session.step({
          name: agentName,
          prompt: user,
          temperature: 0.6,
          maxTokens: 4096,
          systemPrompt: system,
        });
        counterpoints.push(
          parseCounterpointResponse(step.content, interpretations[i], interpretations[j])
        );
      }
    }
    session.note(`${counterpoints.length} counterpoints generated`);

    // Phase 3: Practical resolutions
    session.phase('Practical Resolutions');
    const { system: resolverSystem, user: resolverUser } = buildResolutionPrompt(
      problem,
      interpretations,
      counterpoints,
      config
    );
    const resolverStep = await session.step({
      name: 'resolver',
      prompt: resolverUser,
      temperature: 0.5,
      maxTokens: 4096,
      systemPrompt: resolverSystem,
    });
    const resolutions = parseResolutionResponse(resolverStep.content, problem, interpretations);

    // Step 4: Extract insights
    const insights = extractInsights(interpretations, counterpoints, resolutions);
    session.note(`${resolutions.length} resolutions, ${insights.length} insights`);

    return {
      problem,
      interpretations,
      counterpoints,
      resolutions,
      insights,
      metadata: {
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime,
        costUSD: 0, // replaced from audit log by the run() wrapper
        modelUsage: config.models,
        decision: 'unclear',
      },
    };
  },
});

/**
 * Backward-compatible entry: runs the framework, patches cost from
 * the audit log, returns the bare result (legacy contract).
 */
export async function run(
  input: TextualProblem | { content: string },
  flags: RunFlags = {},
  sinks: EventSink[] = []
): Promise<TalmudicResult> {
  const { result, auditLog } = await talmudic(input, flags, sinks);
  result.metadata.costUSD = auditLog.metadata.totalCost;
  return result;
}

export { runTalmudicAnalysis } from './orchestrator';
export * from './types';
