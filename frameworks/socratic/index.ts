/**
 * Socratic Method Framework
 * Systematic questioning to expose assumptions and refine understanding
 */

import { createProvider } from "@core/providers";
import { getAPIKey } from "@core/config";
import { parseJSON, FrameworkRunner } from "@core/orchestrator";
import type { LLMProvider, RunFlags } from "@core/types";
import type { Statement, SocraticExchange, SocraticResult, SocraticConfig } from "./types";
import { DEFAULT_CONFIG } from "./types";

export async function run(
  input: Statement | { content: string },
  flags: RunFlags = {}
): Promise<SocraticResult> {
  const statement: Statement = "claim" in input
    ? input
    : { claim: input.content || "" };

  const config: SocraticConfig = { ...DEFAULT_CONFIG, ...(flags.config || {}) };
  const cliFlags = flags as Record<string, unknown>;
  if (cliFlags.rounds) {
    config.parameters.maxRounds = parseInt(String(cliFlags.rounds), 10);
  }

  const providerName = flags.provider || "anthropic";
  const apiKey = getAPIKey(providerName);
  const provider = createProvider({ name: providerName, apiKey });

  const verbose = flags.debug ?? false;

  if (verbose) console.log("\n🏛️  SOCRATIC METHOD\n");

  const runner = new FrameworkRunner<Statement, SocraticResult>("socratic", statement);

  const exchanges: SocraticExchange[] = [];

  for (let round = 1; round <= config.parameters.maxRounds; round++) {
    if (verbose) console.log(`\nRound ${round}...`);

    const exchange = await conductExchange(statement, exchanges, round, config, provider, runner, verbose);
    exchanges.push(exchange);

    // Stop if we've reached a natural conclusion
    if (exchange.response.toLowerCase().includes("i don't know") ||
        exchange.response.toLowerCase().includes("acknowledged")) {
      if (verbose) console.log("  Reached epistemic humility");
      break;
    }
  }

  const conclusion = await synthesizeConclusion(statement, exchanges, config, provider, runner, verbose);

  if (verbose) {
    console.log(`\nExchanges: ${exchanges.length}`);
    console.log(`Epistemic Status: ${conclusion.epistemicStatus}`);
    console.log(`Exposed Assumptions: ${conclusion.exposedAssumptions.length}\n`);
  }

  const result: SocraticResult = {
    statement,
    exchanges,
    conclusion,
    metadata: { timestamp: new Date().toISOString(), config },
  };

  const { auditLog } = await runner.finalize(result, "complete");

  return {
    ...result,
    metadata: { ...result.metadata, costUSD: auditLog.metadata.totalCost },
  };
}

async function conductExchange(
  statement: Statement,
  previousExchanges: SocraticExchange[],
  round: number,
  config: SocraticConfig,
  provider: LLMProvider,
  runner: FrameworkRunner<Statement, SocraticResult>,
  verbose: boolean
): Promise<SocraticExchange> {
  // Socrates asks question
  const questionPrompt = `You are Socrates conducting a dialogue.

ORIGINAL CLAIM: ${statement.claim}
${statement.context ? `CONTEXT: ${statement.context}\n` : ""}

${previousExchanges.length > 0 ? `PREVIOUS EXCHANGES:\n${previousExchanges.map((e) => `Q: ${e.question}\nA: ${e.response}`).join("\n\n")}\n` : ""}

Ask a probing question (Round ${round}) that:
- Tests assumptions
- Seeks definitions
- Explores implications
- Looks for contradictions
- Requests justification

Provide in JSON:
{
  "question": "your probing question"
}`;

  const questionResponse = await runner.runAgent(
    `questioner-round-${round}`,
    provider,
    config.models.questioner,
    questionPrompt,
    config.parameters.temperature,
    512
  );

  const { question } = parseJSON<{ question: string }>(questionResponse.content);
  if (verbose) console.log(`  Q: ${question}`);

  // Respondent answers
  const responsePrompt = `You are responding to Socratic questioning about your claim.

YOUR CLAIM: ${statement.claim}

${previousExchanges.length > 0 ? `PREVIOUS EXCHANGES:\n${previousExchanges.map((e) => `Q: ${e.question}\nA: ${e.response}`).join("\n\n")}\n` : ""}

QUESTION: ${question}

Respond thoughtfully in JSON:
{
  "response": "your response",
  "exposedAssumption": "assumption revealed (if any)",
  "contradiction": "contradiction found (if any)"
}

Be honest. If you realize you don't know or find a contradiction, acknowledge it.`;

  const answerResponse = await runner.runAgent(
    `respondent-round-${round}`,
    provider,
    config.models.respondent,
    responsePrompt,
    config.parameters.temperature,
    1024
  );

  const answer = parseJSON<Omit<SocraticExchange, "round" | "question">>(answerResponse.content);
  if (verbose) console.log(`  A: ${answer.response}`);

  return {
    round,
    question,
    ...answer,
  };
}

async function synthesizeConclusion(
  statement: Statement,
  exchanges: SocraticExchange[],
  config: SocraticConfig,
  provider: LLMProvider,
  runner: FrameworkRunner<Statement, SocraticResult>,
  verbose: boolean
): Promise<SocraticResult["conclusion"]> {
  if (verbose) console.log("\nSynthesizing conclusion...\n");

  const exchangesText = exchanges.map((e) =>
    `Round ${e.round}:\nQ: ${e.question}\nA: ${e.response}${e.exposedAssumption ? `\nAssumption: ${e.exposedAssumption}` : ""}${e.contradiction ? `\nContradiction: ${e.contradiction}` : ""}`
  ).join("\n\n");

  const response = await runner.runAgent(
    "questioner-conclusion",
    provider,
    config.models.questioner,
    `Synthesize the Socratic dialogue.

ORIGINAL CLAIM: ${statement.claim}

DIALOGUE:
${exchangesText}

Provide conclusion in JSON:
{
  "refinedUnderstanding": "revised/clarified understanding",
  "exposedAssumptions": ["assumption 1", ...],
  "contradictions": ["contradiction 1", ...],
  "remainingQuestions": ["question 1", ...],
  "epistemicStatus": "clarified" | "refined" | "refuted" | "acknowledged_ignorance",
  "synthesis": "what we learned from this dialogue"
}`,
    config.parameters.temperature,
    1536
  );

  return parseJSON<SocraticResult["conclusion"]>(response.content);
}

export * from "./types";
