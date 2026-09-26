/**
 * Delphi Method Framework — engine port.
 *
 * Flow: iterative anonymous expert rounds with convergence statistics →
 * facilitator consensus synthesis. All provider/model/audit/logging concerns
 * owned by the engine.
 */
import type { EventSink } from '@core/engine';
import { defineFramework, Session } from '@core/engine';
import { parseJSON } from '@core/orchestrator';
import type { RunFlags } from '@core/types';
import type { Question, ExpertEstimate, RoundSummary, DelphiResult, DelphiConfig } from './types';
import { DEFAULT_CONFIG } from './types';

export const delphi = defineFramework<Question | { content: string }, DelphiResult>({
  name: 'delphi',
  description: 'Iterative anonymous expert consensus building with convergence statistics',
  normalize(raw) {
    if (typeof raw === 'object' && raw !== null && 'question' in raw) {
      return raw as Question;
    }
    const content = (raw as { content?: string })?.content ?? '';
    return { question: content };
  },
  async run(rawInput, session) {
    const question = rawInput as Question;
    const config: DelphiConfig = {
      ...DEFAULT_CONFIG,
      ...(session.flags.config as Partial<DelphiConfig> | undefined),
    };
    const explicitModel = session.models.override;
    if (explicitModel) {
      config.models = {
        expert: explicitModel,
        facilitator: explicitModel,
      };
    }

    const rounds: RoundSummary[] = [];
    let converged = false;

    for (let round = 1; round <= config.parameters.maxRounds && !converged; round++) {
      session.phase(`Round ${round}`, `${config.parameters.expertCount} anonymous experts`);

      const previousRound = rounds[rounds.length - 1];
      const estimates = await conductRound(question, round, previousRound, config, session);
      const summary = calculateRoundStatistics(round, estimates);
      rounds.push(summary);

      converged = summary.convergence <= config.parameters.convergenceThreshold;
      session.note(
        `Round ${round}: median=${summary.statistics.median}, CV=${summary.convergence.toFixed(3)}` +
          (converged ? ' — convergence achieved' : '')
      );
    }

    session.phase('Consensus Synthesis');
    const finalConsensus = await synthesizeConsensus(question, rounds, config, session);

    session.note(
      `Final consensus: ${finalConsensus.estimate} (confidence: ${finalConsensus.confidence})`
    );

    return {
      question,
      rounds,
      finalConsensus,
      metadata: {
        timestamp: new Date().toISOString(),
        config,
        decision: 'unclear',
      },
    };
  },
});

async function conductRound(
  question: Question,
  round: number,
  previousRound: RoundSummary | undefined,
  config: DelphiConfig,
  session: Session
): Promise<ExpertEstimate[]> {
  const responses = await session.parallel(
    Array.from({ length: config.parameters.expertCount }, (_, i) => {
      const expertId = `expert-${i + 1}`;

      let prompt = `You are an independent expert participating in a Delphi study (anonymous, Round ${round}).

QUESTION:
${question.question}

${question.context ? `CONTEXT:\n${question.context}\n` : ''}
${question.targetMetric ? `TARGET METRIC: ${question.targetMetric}\n` : ''}`;

      if (previousRound) {
        prompt += `\nPREVIOUS ROUND STATISTICS (anonymous):
- Median: ${previousRound.statistics.median}
- Range: ${previousRound.statistics.range.min} - ${previousRound.statistics.range.max}
- IQR: ${previousRound.statistics.iqr.q1} - ${previousRound.statistics.iqr.q3}

You may revise your estimate based on group feedback.`;
      }

      prompt += `\n\nProvide your estimate in JSON:
{
  "estimate": <number>,
  "confidence": <0-10>,
  "reasoning": "why this estimate",
  "assumptions": ["assumption 1", ...]
}`;

      return {
        name: expertId,
        prompt,
        temperature: config.parameters.temperature,
        maxTokens: 1024,
      };
    })
  );

  return responses.map((response, i) => {
    const expertId = `expert-${i + 1}`;
    const parsed = parseJSON<Omit<ExpertEstimate, 'expertId' | 'round'>>(response.content);
    return {
      expertId,
      round,
      ...parsed,
    };
  });
}

function calculateRoundStatistics(round: number, estimates: ExpertEstimate[]): RoundSummary {
  const values = estimates.map((e) =>
    typeof e.estimate === 'number' ? e.estimate : parseFloat(e.estimate)
  );
  const sorted = [...values].sort((a, b) => a - b);

  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const median = sorted[Math.floor(sorted.length / 2)];
  const q1 = sorted[Math.floor(sorted.length * 0.25)];
  const q3 = sorted[Math.floor(sorted.length * 0.75)];

  const stdDev = Math.sqrt(
    values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length
  );
  const convergence = stdDev / mean; // Coefficient of variation

  return {
    round,
    estimates,
    statistics: {
      median,
      mean,
      range: { min: Math.min(...values), max: Math.max(...values) },
      iqr: { q1, q3 },
    },
    convergence,
  };
}

async function synthesizeConsensus(
  question: Question,
  rounds: RoundSummary[],
  config: DelphiConfig,
  session: Session
): Promise<DelphiResult['finalConsensus']> {
  const finalRound = rounds[rounds.length - 1];
  const roundsText = rounds
    .map(
      (r) =>
        `Round ${r.round}: Median=${r.statistics.median}, Mean=${r.statistics.mean}, Range=${r.statistics.range.min}-${r.statistics.range.max}, Convergence=${r.convergence.toFixed(3)}`
    )
    .join('\n');

  const response = await session.step({
    name: 'facilitator',
    prompt: `Synthesize the Delphi study results.

QUESTION: ${question.question}

ROUNDS:
${roundsText}

FINAL ROUND ESTIMATES:
${finalRound.estimates.map((e) => `${e.estimate} (confidence: ${e.confidence}) - ${e.reasoning}`).join('\n')}

Provide consensus in JSON:
{
  "estimate": <final consensus number>,
  "confidence": "low" | "medium" | "high",
  "range": {"min": <number>, "max": <number>},
  "reasoning": "why this consensus",
  "outliers": [{"estimate": <number>, "reasoning": "..."}, ...],
  "convergenceAchieved": <boolean>
}`,
    temperature: config.parameters.temperature,
    maxTokens: 1536,
  });

  return parseJSON<DelphiResult['finalConsensus']>(response.content);
}

/** Backward-compatible entry returning the bare result. */
export async function run(
  input: Question | { content: string },
  flags: RunFlags = {},
  sinks: EventSink[] = []
): Promise<DelphiResult> {
  const { result, auditLog } = await delphi(input, flags, sinks);
  result.metadata.costUSD = auditLog.metadata.totalCost;
  return result;
}

export * from './types';
