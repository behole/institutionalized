/**
 * Parliamentary Debate Framework
 * Structured adversarial policy discussion
 */

import { createProvider } from "@core/providers";
import { getAPIKey } from "@core/config";
import { parseJSON, executeParallel } from "@core/orchestrator";
import type { LLMProvider } from "@core/types";
import type { Motion, Speech, DebateRecord, Vote, ParliamentaryResult, ParliamentaryConfig } from "./types";
import { DEFAULT_CONFIG } from "./types";

export async function run(
  input: Motion | { content: string },
  flags: Record<string, any> = {}
): Promise<ParliamentaryResult> {
  const motion: Motion = "motion" in input
    ? input
    : { motion: input.content || "", context: "" };

  const config: ParliamentaryConfig = { ...DEFAULT_CONFIG, ...(flags.config || {}) };
  if (flags.backbenchers) {
    config.parameters.backbenchCount = parseInt(flags.backbenchers, 10);
  }

  const providerName = flags.provider || "anthropic";
  const apiKey = getAPIKey(providerName);
  const provider = createProvider({ name: providerName, apiKey });

  const verbose = flags.verbose || false;

  if (verbose) console.log("\n🏛️  PARLIAMENTARY DEBATE\n");

  // Conduct debate
  const debate = await conductDebate(motion, config, provider, verbose);

  // Count votes
  const vote = await countVotes(motion, debate, config, provider, verbose);

  // Summarize
  const summary = await summarizeDebate(motion, debate, vote, config, provider, verbose);

  if (verbose) {
    console.log(`\nVote: ${vote.voteCounts.ayes} Ayes, ${vote.voteCounts.noes} Noes`);
    console.log(`Outcome: ${vote.outcome}\n`);
  }

  return {
    motion,
    debate,
    vote,
    summary,
    metadata: { timestamp: new Date().toISOString(), config },
  };
}

async function conductDebate(
  motion: Motion,
  config: ParliamentaryConfig,
  provider: LLMProvider,
  verbose: boolean
): Promise<DebateRecord> {
  if (verbose) console.log("Conducting parliamentary debate...\n");

  // Opening Government
  if (verbose) console.log("  Opening Government...");
  const openingGov = await deliverSpeech("Opening Government", "government", "for", motion, [], config, provider);

  // Opening Opposition
  if (verbose) console.log("  Opening Opposition...");
  const openingOpp = await deliverSpeech("Opening Opposition", "opposition", "against", motion, [openingGov], config, provider);

  // Backbench contributions (parallel)
  if (verbose) console.log("  Backbench contributions...");
  const backbenchTasks = Array.from({ length: config.parameters.backbenchCount }, (_, i) => async () => {
    const position = i % 2 === 0 ? "for" : "against";
    return deliverSpeech(`Backbencher ${i + 1}`, "backbench", position as "for" | "against", motion, [openingGov, openingOpp], config, provider);
  });
  const backbenchContributions = await executeParallel(backbenchTasks);

  // Closing Opposition
  if (verbose) console.log("  Closing Opposition...");
  const closingOpp = await deliverSpeech("Closing Opposition", "opposition", "against", motion, [openingGov, openingOpp, ...backbenchContributions], config, provider);

  // Closing Government
  if (verbose) console.log("  Closing Government...");
  const closingGov = await deliverSpeech("Closing Government", "government", "for", motion, [openingGov, openingOpp, ...backbenchContributions, closingOpp], config, provider);

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
  provider: LLMProvider
): Promise<Speech> {
  const previousDebate = previousSpeeches.length > 0
    ? `\n\nPREVIOUS SPEECHES:\n${previousSpeeches.map((s) => `${s.speaker} (${s.position}): ${s.keyPoints.join(", ")}`).join("\n")}`
    : "";

  const response = await provider.call({
    model: config.models.debater,
    temperature: config.parameters.temperature,
    messages: [{
      role: "user",
      content: `You are ${speaker} in a Parliamentary debate.

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
    }],
    maxTokens: 1536,
  });

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

  const response = await provider.call({
    model: config.models.speaker,
    temperature: config.parameters.temperature,
    messages: [{
      role: "user",
      content: `You are the Speaker presiding over the division (vote).

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
    }],
    maxTokens: 512,
  });

  return parseJSON<Vote>(response.content);
}

async function summarizeDebate(
  motion: Motion,
  debate: DebateRecord,
  vote: Vote,
  config: ParliamentaryConfig,
  provider: LLMProvider,
  verbose: boolean
): Promise<ParliamentaryResult["summary"]> {
  const response = await provider.call({
    model: config.models.speaker,
    temperature: config.parameters.temperature,
    messages: [{
      role: "user",
      content: `Summarize the parliamentary debate.

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
    }],
    maxTokens: 1024,
  });

  return parseJSON<ParliamentaryResult["summary"]>(response.content);
}

export * from "./types";
