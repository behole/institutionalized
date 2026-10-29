/**
 * Hegelian Dialectic Framework — engine port.
 *
 * Flow: thesis → antithesis → synthesis → insight extraction.
 * Prompt/parse logic lives in dialectic.ts, untouched. All provider/model/
 * audit/logging concerns owned by the engine.
 */
import type { EventSink } from '@core/engine';
import { defineFramework } from '@core/engine';
import type { RunFlags } from '@core/types';
import type {
  DialecticalProblem,
  HegelianConfig,
  HegelianResult,
  Thesis,
  Antithesis,
  Synthesis,
  DialecticalInsight,
} from './types';
import { DEFAULT_CONFIG } from './types';
import {
  buildThesisPrompt,
  parseThesisResponse,
  buildAntithesisPrompt,
  parseAntithesisResponse,
  buildSynthesisPrompt,
  parseSynthesisResponse,
} from './dialectic';

function extractInsights(
  thesis: Thesis,
  antithesis: Antithesis,
  synthesis: Synthesis
): DialecticalInsight[] {
  const insights: DialecticalInsight[] = [];

  // Extract insights from thesis
  thesis.supportingArguments.forEach((arg, i) => {
    if (i < 2) {
      insights.push({
        insight: arg,
        source: 'thesis',
        application: 'Valid consideration that synthesis preserves',
      });
    }
  });

  // Extract insights from antithesis
  antithesis.counterArguments.forEach((arg, i) => {
    if (i < 2) {
      insights.push({
        insight: arg,
        source: 'antithesis',
        application: 'Valid critique that synthesis addresses',
      });
    }
  });

  // Extract insights from synthesis
  synthesis.transcendsBoth.forEach((insight) => {
    insights.push({
      insight,
      source: 'synthesis',
      application: 'Higher-order understanding emerging from dialectic',
    });
  });

  return insights;
}

export const hegelian = defineFramework<DialecticalProblem | { content: string }, HegelianResult>({
  name: 'hegelian',
  description: 'Thesis-antithesis-synthesis dialectic for resolving contradictions',
  normalize(raw) {
    if (typeof raw === 'object' && raw !== null && 'context' in raw && 'thesis' in raw) {
      return raw as DialecticalProblem;
    }
    const content = (raw as { content?: string })?.content ?? '';
    return { context: content, thesis: 'Initial position to be examined' };
  },
  async run(rawInput, session) {
    const problem = rawInput as DialecticalProblem;
    const config: HegelianConfig = {
      ...DEFAULT_CONFIG,
      ...(session.flags.config as Partial<HegelianConfig> | undefined),
    };
    const explicitModel = session.models.override;
    if (explicitModel) {
      config.models = {
        thesis: explicitModel,
        antithesis: explicitModel,
        synthesis: explicitModel,
      };
    }

    const startTime = Date.now();

    // Phase 1: Develop the thesis
    session.phase('Thesis', `Context: ${problem.context}`);
    const { system: thesisSystem, user: thesisUser } = buildThesisPrompt(problem, config);
    const thesisStep = await session.step({
      name: 'thesis',
      prompt: thesisUser,
      temperature: config.parameters.temperature,
      maxTokens: 4096,
      systemPrompt: thesisSystem,
    });
    const thesis = parseThesisResponse(thesisStep.content);
    session.note(
      `Position: ${thesis.position.slice(0, 60)}… | Arguments: ${thesis.supportingArguments.length}`
    );

    // Phase 2: Generate genuine opposition (antithesis)
    session.phase('Antithesis');
    const { system: antithesisSystem, user: antithesisUser } = buildAntithesisPrompt(
      problem,
      thesis,
      config
    );
    const antithesisStep = await session.step({
      name: 'antithesis',
      prompt: antithesisUser,
      temperature: config.parameters.temperature,
      maxTokens: 4096,
      systemPrompt: antithesisSystem,
    });
    const antithesis = parseAntithesisResponse(antithesisStep.content);
    session.note(
      `Position: ${antithesis.position.slice(0, 60)}… | Contradictions: ${antithesis.contradictionsIdentified.length}`
    );

    // Phase 3: Synthesize into higher-order resolution
    session.phase('Synthesis');
    const { system: synthesisSystem, user: synthesisUser } = buildSynthesisPrompt(
      problem,
      thesis,
      antithesis,
      config
    );
    const synthesisStep = await session.step({
      name: 'synthesis',
      prompt: synthesisUser,
      temperature: config.parameters.temperature,
      maxTokens: 4096,
      systemPrompt: synthesisSystem,
    });
    const synthesis = parseSynthesisResponse(synthesisStep.content);
    session.note(
      `Integrated Position: ${synthesis.integratedPosition.slice(0, 60)}… | Transcends Both: ${synthesis.transcendsBoth.length}`
    );

    // Phase 4: Extract insights
    const insights = extractInsights(thesis, antithesis, synthesis);

    return {
      problem,
      thesis,
      antithesis,
      synthesis,
      insights,
      metadata: {
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime,
        costUSD: 0, // replaced from audit log below
        modelUsage: config.models,
        decision: 'unclear',
      },
    };
  },
});

/** Backward-compatible entry returning the bare result. */
export async function run(
  input: DialecticalProblem | { content: string },
  flags: RunFlags = {},
  sinks: EventSink[] = []
): Promise<HegelianResult> {
  const { result, auditLog } = await hegelian(input, flags, sinks);
  result.metadata.costUSD = auditLog.metadata.totalCost;
  return result;
}

export { runDialectic } from './orchestrator';
export * from './types';
