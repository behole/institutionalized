/**
 * Delphi Method Framework
 * Iterative anonymous expert consensus building
 */

import { createProvider } from "@core/providers";
import { getAPIKey } from "@core/config";
import { parseJSON, FrameworkRunner } from "@core/orchestrator";
import type { LLMProvider, RunFlags } from "@core/types";
import type { Question, ExpertEstimate, RoundSummary, DelphiResult, DelphiConfig } from "./types";
import { DEFAULT_CONFIG } from "./types";

export async function run(
  input: Question | { content: string },
  flags: RunFlags = {}
): Promise<DelphiResult> {
  const question: Question = "question" in input
    ? input
    : { question: input.content || "" };

  const config: DelphiConfig = { ...DEFAULT_CONFIG, ...(flags.config || {}) };
  const cliFlags = flags as Record<string, unknown>;
  if (cliFlags.experts) {
    config.parameters.expertCount = parseInt(String(cliFlags.experts), 10);
  }
  if (cliFlags.rounds) {
    config.parameters.maxRounds = parseInt(String(cliFlags.rounds), 10);
  }

  const providerName = flags.provider || "anthropic";
  const apiKey = getAPIKey(providerName);
  const provider = createProvider({ name: providerName, apiKey });

  const verbose = flags.debug ?? false;

  if (verbose) console.log("\n🔮 DELPHI METHOD - EXPERT CONSENSUS\n");

  const runner = new FrameworkRunner<Question, DelphiResult>("delphi", question);

  const rounds: RoundSummary[] = [];
  let converged = false;

  for (let round = 1; round <= config.parameters.maxRounds && !converged; round++) {
    if (verbose) console.log(`\nRound ${round}...`);

    const previousRound = rounds[rounds.length - 1];
    const estimates = await conductRound(question, round, previousRound, config, provider, runner, verbose);
    const summary = calculateRoundStatistics(round, estimates);
    rounds.push(summary);

    converged = checkConvergence(summary, config);
    if (verbose && converged) {
      console.log(`  Convergence achieved! (CV: ${summary.convergence.toFixed(3)})`);
    }
  }

  const finalConsensus = await synthesizeConsensus(question, rounds, config, provider, runner, verbose);

  if (verbose) {
    console.log(`\nFinal Consensus: ${finalConsensus.estimate}`);
    console.log(`Confidence: ${finalConsensus.confidence}\n`);
  }

  const result: DelphiResult = {
    question,
    rounds,
    finalConsensus,
    metadata: { timestamp: new Date().toISOString(), config },
  };

  const { auditLog } = await runner.finalize(result, "complete");

  return {
    ...result,
    metadata: { ...result.metadata, costUSD: auditLog.metadata.totalCost },
  };
}

async function conductRound(
  question: Question,
  round: number,
  previousRound: RoundSummary | undefined,
  config: DelphiConfig,
  provider: LLMProvider,
  runner: FrameworkRunner<Question, DelphiResult>,
  verbose: boolean
): Promise<ExpertEstimate[]> {
  const responses = await runner.runParallel(
    Array.from({ length: config.parameters.expertCount }, (_, i) => {
      const expertId = `expert-${i + 1}`;

      let prompt = `You are an independent expert participating in a Delphi study (anonymous, Round ${round}).

QUESTION:
${question.question}

${question.context ? `CONTEXT:\n${question.context}\n` : ""}
${question.targetMetric ? `TARGET METRIC: ${question.targetMetric}\n` : ""}`;

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
        provider,
        model: config.models.expert,
        prompt,
        temperature: config.parameters.temperature,
        maxTokens: 1024,
      };
    })
  );

  return responses.map((response, i) => {
    const expertId = `expert-${i + 1}`;
    const parsed = parseJSON<Omit<ExpertEstimate, "expertId" | "round">>(response.content);
    return {
      expertId,
      round,
      ...parsed,
    };
  });
}

function calculateRoundStatistics(round: number, estimates: ExpertEstimate[]): RoundSummary {
  const values = estimates.map((e) => typeof e.estimate === "number" ? e.estimate : parseFloat(e.estimate as string));
  const sorted = [...values].sort((a, b) => a - b);

  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const median = sorted[Math.floor(sorted.length / 2)];
  const q1 = sorted[Math.floor(sorted.length * 0.25)];
  const q3 = sorted[Math.floor(sorted.length * 0.75)];

  const stdDev = Math.sqrt(values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length);
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

function checkConvergence(summary: RoundSummary, config: DelphiConfig): boolean {
  return summary.convergence <= config.parameters.convergenceThreshold;
}

async function synthesizeConsensus(
  question: Question,
  rounds: RoundSummary[],
  config: DelphiConfig,
  provider: LLMProvider,
  runner: FrameworkRunner<Question, DelphiResult>,
  verbose: boolean
): Promise<DelphiResult["finalConsensus"]> {
  if (verbose) console.log("\nSynthesizing final consensus...\n");

  const finalRound = rounds[rounds.length - 1];
  const roundsText = rounds.map((r) =>
    `Round ${r.round}: Median=${r.statistics.median}, Mean=${r.statistics.mean}, Range=${r.statistics.range.min}-${r.statistics.range.max}, Convergence=${r.convergence.toFixed(3)}`
  ).join("\n");

  const response = await runner.runAgent(
    "facilitator",
    provider,
    config.models.facilitator,
    `Synthesize the Delphi study results.

QUESTION: ${question.question}

ROUNDS:
${roundsText}

FINAL ROUND ESTIMATES:
${finalRound.estimates.map((e) => `${e.estimate} (confidence: ${e.confidence}) - ${e.reasoning}`).join("\n")}

Provide consensus in JSON:
{
  "estimate": <final consensus number>,
  "confidence": "low" | "medium" | "high",
  "range": {"min": <number>, "max": <number>},
  "reasoning": "why this consensus",
  "outliers": [{"estimate": <number>, "reasoning": "..."}, ...],
  "convergenceAchieved": <boolean>
}`,
    config.parameters.temperature,
    1536
  );

  return parseJSON<DelphiResult["finalConsensus"]>(response.content);
}

export * from "./types";
