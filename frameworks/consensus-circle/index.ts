/**
 * Consensus Circle Framework
 * Quaker-inspired consensus building without voting
 */

import { createProvider } from "@core/providers";
import { getAPIKey } from "@core/config";
import { parseJSON, executeParallel } from "@core/orchestrator";
import type { LLMProvider } from "@core/types";
import type { Proposal, ParticipantVoice, ConsensusRound, ConsensusDecision, ConsensusCircleConfig, ConsensusCircleResult } from "./types";
import { DEFAULT_CONFIG } from "./types";

export async function run(
  input: Proposal | { content: string },
  flags: Record<string, any> = {}
): Promise<ConsensusCircleResult> {
  const proposal: Proposal = "question" in input
    ? input
    : { question: input.content || "", context: "" };

  const config: ConsensusCircleConfig = { ...DEFAULT_CONFIG, ...(flags.config || {}) };
  if (flags.participants) {
    config.parameters.participantCount = parseInt(flags.participants, 10);
  }

  const providerName = flags.provider || "anthropic";
  const apiKey = getAPIKey(providerName);
  const provider = createProvider({ name: providerName, apiKey });

  const verbose = flags.verbose || false;

  if (verbose) console.log("\n🕊️  CONSENSUS CIRCLE\n");

  const rounds: ConsensusRound[] = [];
  let consensusAchieved = false;

  for (let round = 1; round <= config.parameters.maxRounds && !consensusAchieved; round++) {
    if (verbose) console.log(`\nRound ${round}: Gathering voices...`);

    const previousRound = rounds[rounds.length - 1];
    const voices = await gatherVoices(proposal, round, previousRound, config, provider, verbose);
    const roundSummary = await synthesizeRound(proposal, voices, round, config, provider, verbose);

    rounds.push(roundSummary);
    consensusAchieved = roundSummary.blockingConcerns.length === 0;

    if (verbose && consensusAchieved) {
      console.log("  ✨ Consensus achieved!");
    }
  }

  const decision = await formulateDecision(proposal, rounds, config, provider, verbose);

  if (verbose) {
    console.log(`\nConsensus Achieved: ${decision.consensusAchieved ? "Yes" : "No"}`);
    console.log(`Addressed Concerns: ${decision.addressedConcerns.length}\n`);
  }

  return {
    proposal,
    rounds,
    decision,
    metadata: { timestamp: new Date().toISOString(), config },
  };
}

async function gatherVoices(
  proposal: Proposal,
  round: number,
  previousRound: ConsensusRound | undefined,
  config: ConsensusCircleConfig,
  provider: LLMProvider,
  verbose: boolean
): Promise<ParticipantVoice[]> {
  const perspectives = [
    "Pragmatic implementer",
    "Values guardian",
    "Systems thinker",
    "Affected community member",
    "Future-oriented planner",
  ].slice(0, config.parameters.participantCount);

  const tasks = perspectives.map((perspective, i) => async () => {
    let prompt = `You are a participant in a Consensus Circle (Quaker-style decision making) with the perspective of: ${perspective}.

PROPOSAL:
${proposal.question}

CONTEXT:
${proposal.context}

${proposal.options ? `OPTIONS:\n${proposal.options.map((o) => `- ${o}`).join("\n")}\n` : ""}`;

    if (previousRound) {
      prompt += `\nPREVIOUS ROUND SUMMARY:
Emerging Direction: ${previousRound.emergingDirection}
Areas of Agreement: ${previousRound.areasOfAgreement.join(", ")}
Blocking Concerns: ${previousRound.blockingConcerns.join(", ")}

You may refine your voice based on the emerging consensus.`;
    }

    prompt += `\n\nShare your voice in JSON (Round ${round}):
{
  "perspective": "${perspective}",
  "concerns": ["concern 1", ...],
  "supportedAspects": ["what you support", ...],
  "blockingConcerns": ["fundamental objections", ...],
  "suggestions": ["suggestion for unity", ...]
}

In Quaker consensus, all voices are valued equally. Express concerns honestly. Only list blockingConcerns if they represent fundamental moral or practical objections.`;

    const response = await provider.call({
      model: config.models.participant,
      temperature: config.parameters.temperature,
      messages: [{ role: "user", content: prompt }],
      maxTokens: 1024,
    });

    const parsed = parseJSON<Omit<ParticipantVoice, "participantId">>(response.content);
    return {
      participantId: `p${i + 1}`,
      ...parsed,
    };
  });

  return executeParallel(tasks);
}

async function synthesizeRound(
  proposal: Proposal,
  voices: ParticipantVoice[],
  round: number,
  config: ConsensusCircleConfig,
  provider: LLMProvider,
  verbose: boolean
): Promise<ConsensusRound> {
  const voicesText = voices.map((v) =>
    `${v.perspective}:\nConcerns: ${v.concerns.join(", ")}\nSupports: ${v.supportedAspects.join(", ")}\nBlocking: ${v.blockingConcerns.join(", ")}\nSuggestions: ${v.suggestions.join(", ")}`
  ).join("\n\n");

  const response = await provider.call({
    model: config.models.clerk,
    temperature: config.parameters.temperature,
    messages: [{
      role: "user",
      content: `You are the Clerk synthesizing this round of consensus building.

PROPOSAL: ${proposal.question}

VOICES:
${voicesText}

Synthesize this round in JSON:
{
  "emergingDirection": "where consensus is forming",
  "blockingConcerns": ["fundamental objection 1", ...],
  "areasOfAgreement": ["agreement 1", ...]
}

Only include concerns that are truly blocking (fundamental objections), not minor reservations.`,
    }],
    maxTokens: 1024,
  });

  const parsed = parseJSON<Omit<ConsensusRound, "round" | "voices">>(response.content);
  return {
    round,
    voices,
    ...parsed,
  };
}

async function formulateDecision(
  proposal: Proposal,
  rounds: ConsensusRound[],
  config: ConsensusCircleConfig,
  provider: LLMProvider,
  verbose: boolean
): Promise<ConsensusDecision> {
  if (verbose) console.log("\nClerk formulating decision...\n");

  const roundsText = rounds.map((r) =>
    `Round ${r.round}:\nEmerging: ${r.emergingDirection}\nBlocking: ${r.blockingConcerns.join(", ")}\nAgreement: ${r.areasOfAgreement.join(", ")}`
  ).join("\n\n");

  const response = await provider.call({
    model: config.models.clerk,
    temperature: config.parameters.temperature,
    messages: [{
      role: "user",
      content: `You are the Clerk formulating the final decision from the consensus process.

PROPOSAL: ${proposal.question}

ROUNDS:
${roundsText}

Formulate the decision in JSON:
{
  "decision": "the emerged decision statement",
  "consensusAchieved": <boolean>,
  "unitySummary": "how unity was achieved",
  "addressedConcerns": [
    {"concern": "...", "resolution": "how it was addressed"},
    ...
  ],
  "remainingReservations": ["reservation 1", ...],
  "commitments": ["commitment for implementation", ...]
}`,
    }],
    maxTokens: 1536,
  });

  return parseJSON<ConsensusDecision>(response.content);
}

export * from "./types";
