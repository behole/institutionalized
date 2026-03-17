/**
 * Consensus Circle Framework
 * Quaker-inspired consensus building without voting
 */

import { createProvider } from "@core/providers";
import { getAPIKey } from "@core/config";
import { parseJSON, FrameworkRunner } from "@core/orchestrator";
import type { LLMProvider, RunFlags } from "@core/types";
import type { Proposal, ParticipantVoice, ConsensusRound, ConsensusDecision, ConsensusCircleConfig, ConsensusCircleResult } from "./types";
import { DEFAULT_CONFIG } from "./types";

export async function run(
  input: Proposal | { content: string },
  flags: RunFlags = {}
): Promise<ConsensusCircleResult> {
  const proposal: Proposal = "question" in input
    ? input
    : { question: input.content || "", context: "" };

  const config: ConsensusCircleConfig = { ...DEFAULT_CONFIG, ...(flags.config || {}) };
  const cliFlags = flags as Record<string, unknown>;
  if (cliFlags.participants) {
    config.parameters.participantCount = parseInt(String(cliFlags.participants), 10);
  }

  const providerName = flags.provider || "anthropic";
  const apiKey = getAPIKey(providerName);
  const provider = createProvider({ name: providerName, apiKey });

  const verbose = flags.debug ?? false;

  if (verbose) console.log("\n🕊️  CONSENSUS CIRCLE\n");

  const runner = new FrameworkRunner<Proposal, ConsensusCircleResult>("consensus-circle", proposal);

  const rounds: ConsensusRound[] = [];
  let consensusAchieved = false;

  for (let round = 1; round <= config.parameters.maxRounds && !consensusAchieved; round++) {
    if (verbose) console.log(`\nRound ${round}: Gathering voices...`);

    const previousRound = rounds[rounds.length - 1];
    const voices = await gatherVoices(proposal, round, previousRound, config, provider, runner, verbose);
    const roundSummary = await synthesizeRound(proposal, voices, round, config, provider, runner, verbose);

    rounds.push(roundSummary);
    consensusAchieved = roundSummary.blockingConcerns.length === 0;

    if (verbose && consensusAchieved) {
      console.log("  ✨ Consensus achieved!");
    }
  }

  const decision = await formulateDecision(proposal, rounds, config, provider, runner, verbose);

  if (verbose) {
    console.log(`\nConsensus Achieved: ${decision.consensusAchieved ? "Yes" : "No"}`);
    console.log(`Addressed Concerns: ${decision.addressedConcerns.length}\n`);
  }

  const result: ConsensusCircleResult = {
    proposal,
    rounds,
    decision,
    metadata: { timestamp: new Date().toISOString(), config },
  };

  const { auditLog } = await runner.finalize(result, "complete");

  return {
    ...result,
    metadata: { ...result.metadata, costUSD: auditLog.metadata.totalCost },
  };
}

async function gatherVoices(
  proposal: Proposal,
  round: number,
  previousRound: ConsensusRound | undefined,
  config: ConsensusCircleConfig,
  provider: LLMProvider,
  runner: FrameworkRunner<Proposal, ConsensusCircleResult>,
  verbose: boolean
): Promise<ParticipantVoice[]> {
  const perspectives = [
    "Pragmatic implementer",
    "Values guardian",
    "Systems thinker",
    "Affected community member",
    "Future-oriented planner",
  ].slice(0, config.parameters.participantCount);

  const responses = await runner.runParallel(
    perspectives.map((perspective, i) => {
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

      return {
        name: `participant-${i + 1}`,
        provider,
        model: config.models.participant,
        prompt,
        temperature: config.parameters.temperature,
        maxTokens: 1024,
      };
    })
  );

  return responses.map((response, i) => {
    const parsed = parseJSON<Omit<ParticipantVoice, "participantId">>(response.content);
    return {
      participantId: `p${i + 1}`,
      ...parsed,
    };
  });
}

async function synthesizeRound(
  proposal: Proposal,
  voices: ParticipantVoice[],
  round: number,
  config: ConsensusCircleConfig,
  provider: LLMProvider,
  runner: FrameworkRunner<Proposal, ConsensusCircleResult>,
  verbose: boolean
): Promise<ConsensusRound> {
  const voicesText = voices.map((v) =>
    `${v.perspective}:\nConcerns: ${v.concerns.join(", ")}\nSupports: ${v.supportedAspects.join(", ")}\nBlocking: ${v.blockingConcerns.join(", ")}\nSuggestions: ${v.suggestions.join(", ")}`
  ).join("\n\n");

  const response = await runner.runAgent(
    `clerk-round-${round}`,
    provider,
    config.models.clerk,
    `You are the Clerk synthesizing this round of consensus building.

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
    config.parameters.temperature,
    1024
  );

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
  runner: FrameworkRunner<Proposal, ConsensusCircleResult>,
  verbose: boolean
): Promise<ConsensusDecision> {
  if (verbose) console.log("\nClerk formulating decision...\n");

  const roundsText = rounds.map((r) =>
    `Round ${r.round}:\nEmerging: ${r.emergingDirection}\nBlocking: ${r.blockingConcerns.join(", ")}\nAgreement: ${r.areasOfAgreement.join(", ")}`
  ).join("\n\n");

  const response = await runner.runAgent(
    "clerk-final",
    provider,
    config.models.clerk,
    `You are the Clerk formulating the final decision from the consensus process.

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
    config.parameters.temperature,
    1536
  );

  return parseJSON<ConsensusDecision>(response.content);
}

export * from "./types";
