/**
 * Parliamentary Debate Framework
 * Structured adversarial policy discussion
 */

import { createProvider } from "@core/providers";
import { getAPIKey } from "@core/config";
import { parseJSON, FrameworkRunner } from "@core/orchestrator";
import type { LLMProvider, RunFlags } from "@core/types";
import type { Motion, Speech, DebateRecord, Vote, ParliamentaryResult, ParliamentaryConfig } from "./types";
import { DEFAULT_CONFIG } from "./types";

export async function run(
  input: Motion | { content: string },
  flags: RunFlags = {}
): Promise<ParliamentaryResult> {
  const motion: Motion = "motion" in input
    ? input
    : { motion: input.content || "", context: "" };

  const config: ParliamentaryConfig = { ...DEFAULT_CONFIG, ...(flags.config || {}) };
  const cliFlags = flags as Record<string, unknown>;
  if (cliFlags.backbenchers) {
    config.parameters.backbenchCount = parseInt(String(cliFlags.backbenchers), 10);
  }

  const providerName = flags.provider || "anthropic";
  const apiKey = getAPIKey(providerName);
  const provider = createProvider({ name: providerName, apiKey });

  const verbose = flags.debug ?? false;

  if (verbose) console.log("\n🏛️  PARLIAMENTARY DEBATE\n");

  const runner = new FrameworkRunner<Motion, ParliamentaryResult>("parliamentary", motion);

  // Conduct debate
  const debate = await conductDebate(motion, config, provider, runner, verbose);

  // Count votes
  const vote = await countVotes(motion, debate, config, provider, runner, verbose);

  // Summarize
  const summary = await summarizeDebate(motion, debate, vote, config, provider, runner, verbose);

  if (verbose) {
    console.log(`\nVote: ${vote.voteCounts.ayes} Ayes, ${vote.voteCounts.noes} Noes`);
    console.log(`Outcome: ${vote.outcome}\n`);
  }

  const result: ParliamentaryResult = {
    motion,
    debate,
    vote,
    summary,
    metadata: { timestamp: new Date().toISOString(), config },
  };

  const { auditLog } = await runner.finalize(result, "complete");

  return {
    ...result,
    metadata: { ...result.metadata, costUSD: auditLog.metadata.totalCost },
  };
}

async function conductDebate(
  motion: Motion,
  config: ParliamentaryConfig,
  provider: LLMProvider,
  runner: FrameworkRunner<Motion, ParliamentaryResult>,
  verbose: boolean
): Promise<DebateRecord> {
  if (verbose) console.log("Conducting parliamentary debate...\n");

  // Opening Government
  if (verbose) console.log("  Opening Government...");
  const openingGov = await deliverSpeech("Opening Government", "government", "for", motion, [], config, provider, runner);

  // Opening Opposition
  if (verbose) console.log("  Opening Opposition...");
  const openingOpp = await deliverSpeech("Opening Opposition", "opposition", "against", motion, [openingGov], config, provider, runner);

  // Backbench contributions (parallel)
  if (verbose) console.log("  Backbench contributions...");
  const backbenchResponses = await runner.runParallel(
    Array.from({ length: config.parameters.backbenchCount }, (_, i) => {
      const position = i % 2 === 0 ? "for" : "against";
      const previousSpeeches = [openingGov, openingOpp];
      const previousDebate = `\n\nPREVIOUS SPEECHES:\n${previousSpeeches.map((s) => `${s.speaker} (${s.position}): ${s.keyPoints.join(", ")}`).join("\n")}`;

      return {
        name: `backbencher-${i + 1}`,
        provider,
        model: config.models.debater,
        prompt: `You are Backbencher ${i + 1} in a Parliamentary debate.

MOTION: ${motion.motion}

CONTEXT:
${motion.context}
${motion.background ? `\nBACKGROUND:\n${motion.background}` : ""}${previousDebate}

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
    const position = i % 2 === 0 ? "for" : "against";
    const parsed = parseJSON<Omit<Speech, "speaker" | "role" | "position">>(response.content);
    return {
      speaker: `Backbencher ${i + 1}`,
      role: "backbench" as const,
      position: position as "for" | "against",
      ...parsed,
    };
  });

  // Closing Opposition
  if (verbose) console.log("  Closing Opposition...");
  const closingOpp = await deliverSpeech("Closing Opposition", "opposition", "against", motion, [openingGov, openingOpp, ...backbenchContributions], config, provider, runner);

  // Closing Government
  if (verbose) console.log("  Closing Government...");
  const closingGov = await deliverSpeech("Closing Government", "government", "for", motion, [openingGov, openingOpp, ...backbenchContributions, closingOpp], config, provider, runner);

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
  role: "government" | "opposition" | "backbench",
  position: "for" | "against" | "neutral",
  motion: Motion,
  previousSpeeches: Speech[],
  config: ParliamentaryConfig,
  provider: LLMProvider,
  runner: FrameworkRunner<Motion, ParliamentaryResult>
): Promise<Speech> {
  const previousDebate = previousSpeeches.length > 0
    ? `\n\nPREVIOUS SPEECHES:\n${previousSpeeches.map((s) => `${s.speaker} (${s.position}): ${s.keyPoints.join(", ")}`).join("\n")}`
    : "";

  const response = await runner.runAgent(
    `speaker-${speaker.toLowerCase().replace(/\s+/g, "-")}`,
    provider,
    config.models.debater,
    `You are ${speaker} in a Parliamentary debate.

MOTION: ${motion.motion}

CONTEXT:
${motion.context}
${motion.background ? `\nBACKGROUND:\n${motion.background}` : ""}${previousDebate}

Your role: ${role}
Your position: ${position}

Deliver your speech in JSON:
{
  "speech": "your speech (2-3 paragraphs)",
  "keyPoints": ["main point 1", "main point 2", ...]
}

Follow parliamentary conventions: address counterarguments, cite evidence, be persuasive.`,
    config.parameters.temperature,
    1536
  );

  const parsed = parseJSON<Omit<Speech, "speaker" | "role" | "position">>(response.content);
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
  provider: LLMProvider,
  runner: FrameworkRunner<Motion, ParliamentaryResult>,
  verbose: boolean
): Promise<Vote> {
  if (verbose) console.log("\nCounting votes...\n");

  const debateText = [
    debate.openingGovernment,
    debate.openingOpposition,
    ...debate.backbenchContributions,
    debate.closingOpposition,
    debate.closingGovernment,
  ].map((s) => `${s.speaker} (${s.position}): ${s.speech}`).join("\n\n");

  const response = await runner.runAgent(
    "speaker-vote",
    provider,
    config.models.speaker,
    `You are the Speaker presiding over the division (vote).

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
    config.parameters.temperature,
    512
  );

  return parseJSON<Vote>(response.content);
}

async function summarizeDebate(
  motion: Motion,
  debate: DebateRecord,
  vote: Vote,
  config: ParliamentaryConfig,
  provider: LLMProvider,
  runner: FrameworkRunner<Motion, ParliamentaryResult>,
  verbose: boolean
): Promise<ParliamentaryResult["summary"]> {
  const response = await runner.runAgent(
    "speaker-summary",
    provider,
    config.models.speaker,
    `Summarize the parliamentary debate.

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
    config.parameters.temperature,
    1024
  );

  return parseJSON<ParliamentaryResult["summary"]>(response.content);
}

export * from "./types";
