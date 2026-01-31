/**
 * Devil's Advocate Framework
 * Formal challenge to test proposals
 */

import { createProvider } from "@core/providers";
import { getAPIKey } from "@core/config";
import { parseJSON } from "@core/orchestrator";
import type { LLMProvider } from "@core/types";
import type { Proposal, DevilsAdvocateConfig, DevilsAdvocateResult, Opposition, Rebuttal, Verdict } from "./types";
import { DEFAULT_CONFIG } from "./types";

export async function run(
  input: Proposal | { content: string },
  flags: Record<string, any> = {}
): Promise<DevilsAdvocateResult> {
  const proposal: Proposal = "description" in input
    ? input
    : { description: input.content || "", rationale: [], benefits: [] };

  const config: DevilsAdvocateConfig = { ...DEFAULT_CONFIG, ...(flags.config || {}) };
  const providerName = flags.provider || "anthropic";
  const apiKey = getAPIKey(providerName);
  const provider = createProvider({ name: providerName, apiKey });

  const verbose = flags.verbose || false;

  if (verbose) console.log("\n😈 DEVIL'S ADVOCATE\n");

  // Phase 1: Opposition
  if (verbose) console.log("Phase 1: Challenging the proposal...");
  const opposition = await challengeProposal(proposal, config, provider);

  // Phase 2: Rebuttal
  if (verbose) console.log("Phase 2: Proposer responds...");
  const rebuttal = await rebut(proposal, opposition, config, provider);

  // Phase 3: Verdict
  if (verbose) console.log("Phase 3: Arbiter decides...\n");
  const verdict = await decide(proposal, opposition, rebuttal, config, provider);

  if (verbose) {
    console.log(`Decision: ${verdict.decision.toUpperCase()}`);
    console.log(`Verdict: ${verdict.verdict}\n`);
  }

  return {
    proposal,
    opposition,
    rebuttal,
    verdict,
    metadata: { timestamp: new Date().toISOString(), config },
  };
}

async function challengeProposal(
  proposal: Proposal,
  config: DevilsAdvocateConfig,
  provider: LLMProvider
): Promise<Opposition> {
  const response = await provider.call({
    model: config.models.advocate,
    temperature: config.parameters.advocateTemperature,
    messages: [{
      role: "user",
      content: `You are the Devil's Advocate. Challenge this proposal:

${proposal.description}

Rationale: ${proposal.rationale.join("; ")}
Benefits: ${proposal.benefits.join("; ")}

Provide JSON:
{
  "objections": ["objection 1", ...],
  "counterArguments": ["counter 1", ...],
  "alternativeProposals": ["alternative 1", ...],
  "questionsNotAnswered": ["question 1", ...]
}`
    }],
    maxTokens: 2048,
  });

  return parseJSON<Opposition>(response.content);
}

async function rebut(
  proposal: Proposal,
  opposition: Opposition,
  config: DevilsAdvocateConfig,
  provider: LLMProvider
): Promise<Rebuttal> {
  const response = await provider.call({
    model: config.models.proposer,
    temperature: 0.6,
    messages: [{
      role: "user",
      content: `Respond to these objections to your proposal:

PROPOSAL: ${proposal.description}

OBJECTIONS:
${opposition.objections.map((o, i) => `${i + 1}. ${o}`).join("\n")}

Provide JSON:
{
  "addressedObjections": [{"objection": "...", "response": "..."}, ...],
  "strengthenedCase": "...",
  "concessions": ["concession 1", ...]
}`
    }],
    maxTokens: 2048,
  });

  return parseJSON<Rebuttal>(response.content);
}

async function decide(
  proposal: Proposal,
  opposition: Opposition,
  rebuttal: Rebuttal,
  config: DevilsAdvocateConfig,
  provider: LLMProvider
): Promise<Verdict> {
  const response = await provider.call({
    model: config.models.arbiter,
    temperature: config.parameters.arbiterTemperature,
    messages: [{
      role: "user",
      content: `As arbiter, decide on this proposal after seeing opposition and rebuttal.

PROPOSAL: ${proposal.description}
OBJECTIONS: ${opposition.objections.length}
REBUTTAL: ${rebuttal.strengthenedCase}

Provide JSON:
{
  "decision": "approved" | "approved-with-conditions" | "rejected",
  "reasoning": "...",
  "conditions": ["condition 1", ...],
  "verdict": "one sentence summary"
}`
    }],
    maxTokens: 2048,
  });

  return parseJSON<Verdict>(response.content);
}

export * from "./types";
