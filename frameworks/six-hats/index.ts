/**
 * Six Thinking Hats Framework — engine port.
 *
 * Flow: six hats in parallel → facilitator synthesis.
 * All provider/model/audit/logging concerns owned by the engine.
 */
import type { EventSink } from '@core/engine';
import { defineFramework } from '@core/engine';
import { parseJSON } from '@core/orchestrator';
import type { RunFlags } from '@core/types';
import type { Analysis, HatPerspective, SixHatsConfig, SixHatsResult } from './types';
import { DEFAULT_CONFIG } from './types';

const HATS = [
  {
    color: 'white' as const,
    name: 'White Hat - Facts & Information',
    prompt:
      "Focus on data, facts, and information. What do we know? What don't we know? What information is missing? Be objective and neutral.",
  },
  {
    color: 'red' as const,
    name: 'Red Hat - Emotions & Intuition',
    prompt:
      'Express emotions, feelings, hunches, and intuition about this. What does your gut say? How do you feel about it? No need to justify.',
  },
  {
    color: 'black' as const,
    name: 'Black Hat - Critical Judgment',
    prompt:
      'Identify risks, problems, weaknesses, and dangers. What could go wrong? Why might this fail? What are the downsides? Be cautious and critical.',
  },
  {
    color: 'yellow' as const,
    name: 'Yellow Hat - Optimistic View',
    prompt:
      'Explore benefits, values, and opportunities. What are the best-case scenarios? Why will this work? What are the advantages? Be positive and constructive.',
  },
  {
    color: 'green' as const,
    name: 'Green Hat - Creative Alternatives',
    prompt:
      'Generate creative ideas, alternatives, and possibilities. Think outside the box. What are unconventional approaches? What if we did something completely different?',
  },
  {
    color: 'blue' as const,
    name: 'Blue Hat - Process Control',
    prompt:
      "Think about the thinking process itself. What have we covered? What's missing? How should we organize our thoughts? What's the big picture?",
  },
] as const;

export const sixHats = defineFramework<Analysis | { content: string }, SixHatsResult>({
  name: 'six-hats',
  description: 'Multi-perspective analysis using Edward de Bono\u2019s Six Thinking Hats method',
  normalize(raw) {
    if (typeof raw === 'object' && raw !== null && 'question' in raw) {
      return raw as Analysis;
    }
    const content = (raw as { content?: string })?.content ?? '';
    return { question: content };
  },
  async run(rawInput, session) {
    const analysis = rawInput as Analysis;
    const config: SixHatsConfig = {
      ...DEFAULT_CONFIG,
      ...(session.flags.config as Partial<SixHatsConfig> | undefined),
    };
    const explicitModel = session.models.override;
    if (explicitModel) {
      config.models = {
        hat: explicitModel,
        facilitator: explicitModel,
      };
    }

    // Phase 1: All hats think in parallel
    session.phase('Hat Perspectives', 'Six hats in parallel');
    const hatSteps = await session.parallel(
      HATS.map((hat) => ({
        name: `hat-${hat.color}`,
        prompt: `You are wearing the ${hat.name} in Edward de Bono's Six Thinking Hats method.

${hat.prompt}

QUESTION/DECISION TO ANALYZE:
${analysis.question}

${analysis.context ? `CONTEXT:\n${analysis.context}\n` : ''}

Provide your analysis from this hat's perspective (2-4 paragraphs).`,
        temperature: config.parameters.temperature,
        maxTokens: 1024,
      }))
    );

    const perspectives: HatPerspective[] = hatSteps.map((step, i) => ({
      hat: HATS[i].color,
      name: HATS[i].name,
      analysis: step.content.trim(),
    }));

    // Phase 2: Facilitator synthesizes
    session.phase('Synthesis', 'Blue Hat facilitator');
    const perspectivesText = perspectives
      .map((p) => `${p.name}:\n${p.analysis}\n`)
      .join('\n---\n\n');

    const synthesisStep = await session.step({
      name: 'facilitator',
      prompt: `You are the Blue Hat facilitator in a Six Thinking Hats session.

QUESTION ANALYZED:
${analysis.question}

ALL PERSPECTIVES:
${perspectivesText}

Synthesize all perspectives into a comprehensive analysis in JSON:
{
  "summary": "overall synthesis paragraph",
  "keyInsights": ["insight 1", "insight 2", ...],
  "recommendation": "recommended path forward",
  "considerations": {
    "facts": ["key fact 1", ...],
    "risks": ["risk 1", ...],
    "benefits": ["benefit 1", ...],
    "alternatives": ["alternative 1", ...],
    "emotions": ["emotional factor 1", ...]
  }
}`,
      temperature: config.parameters.temperature,
      maxTokens: 2048,
    });

    const synthesis = parseJSON<SixHatsResult['synthesis']>(synthesisStep.content);

    session.note(
      `Perspectives: ${perspectives.length} | Key Insights: ${synthesis.keyInsights.length}`
    );

    return {
      analysis,
      perspectives,
      synthesis,
      metadata: {
        timestamp: new Date().toISOString(),
        config,
        decision: 'unclear',
      },
    };
  },
});

/** Backward-compatible entry returning the bare result. */
export async function run(
  input: Analysis | { content: string },
  flags: RunFlags = {},
  sinks: EventSink[] = []
): Promise<SixHatsResult> {
  const { result, auditLog } = await sixHats(input, flags, sinks);
  result.metadata.costUSD = auditLog.metadata.totalCost;
  return result;
}

export * from './types';
