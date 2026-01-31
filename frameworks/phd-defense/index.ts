/**
 * PhD Defense Framework
 * Rigorous proposal validation through doctoral examination
 */

import { createProvider } from "@core/providers";
import { getAPIKey } from "@core/config";
import { parseJSON, executeParallel } from "@core/orchestrator";
import type { LLMProvider } from "@core/types";
import type { Proposal, CommitteeMember, DefenseResult, PhDDefenseConfig, PhDDefenseOutput } from "./types";
import { DEFAULT_CONFIG } from "./types";

export async function run(
  input: Proposal | { content: string },
  flags: Record<string, any> = {}
): Promise<PhDDefenseOutput> {
  const proposal: Proposal = "title" in input
    ? input
    : {
        title: "Untitled Proposal",
        abstract: "",
        document: input.content || "",
      };

  const config: PhDDefenseConfig = { ...DEFAULT_CONFIG, ...(flags.config || {}) };
  if (flags.committee) {
    config.parameters.committeeSize = parseInt(flags.committee, 10);
  }
  if (flags.specialties) {
    config.specialties = flags.specialties.split(",");
  }

  const providerName = flags.provider || "anthropic";
  const apiKey = getAPIKey(providerName);
  const provider = createProvider({ name: providerName, apiKey });

  const verbose = flags.verbose || false;

  if (verbose) console.log("\n🎓 PhD DEFENSE\n");

  // Phase 1: Committee members examine proposal
  const committee = await examineProposal(proposal, config, provider, verbose);

  // Phase 2: Chair synthesizes decision
  const defense = await renderDecision(proposal, committee, config, provider, verbose);

  if (verbose) {
    console.log(`\nDecision: ${defense.decision.toUpperCase()}`);
    console.log(`Required Revisions: ${defense.requiredRevisions.length}\n`);
  }

  return {
    proposal,
    committee,
    defense,
    metadata: { timestamp: new Date().toISOString(), config },
  };
}

async function examineProposal(
  proposal: Proposal,
  config: PhDDefenseConfig,
  provider: LLMProvider,
  verbose: boolean
): Promise<CommitteeMember[]> {
  if (verbose) console.log("Phase 1: Committee examination...\n");

  const specialties = config.specialties.slice(0, config.parameters.committeeSize);

  const tasks = specialties.map((specialty) => async () => {
    if (verbose) console.log(`  ${specialty} specialist examining...`);

    const response = await provider.call({
      model: config.models.committee,
      temperature: config.parameters.temperature,
      messages: [{
        role: "user",
        content: `You are a PhD committee member with expertise in: ${specialty}

PROPOSAL TITLE: ${proposal.title}

ABSTRACT:
${proposal.abstract || "N/A"}

${proposal.methodology ? `METHODOLOGY:\n${proposal.methodology}\n` : ""}

${proposal.contributions ? `CONTRIBUTIONS:\n${proposal.contributions}\n` : ""}

FULL DOCUMENT:
${proposal.document}

As an expert in ${specialty}, examine this proposal and provide your assessment in JSON:
{
  "specialty": "${specialty}",
  "questions": ["probing question 1", "question 2", ...],
  "assessment": "overall assessment paragraph",
  "concerns": ["concern 1", "concern 2", ...]
}

Be rigorous and thorough. Ask hard questions that test the depth of understanding.`,
      }],
      maxTokens: 2048,
    });

    return parseJSON<CommitteeMember>(response.content);
  });

  return executeParallel(tasks);
}

async function renderDecision(
  proposal: Proposal,
  committee: CommitteeMember[],
  config: PhDDefenseConfig,
  provider: LLMProvider,
  verbose: boolean
): Promise<DefenseResult> {
  if (verbose) console.log("\nPhase 2: Chair rendering decision...\n");

  const committeeText = committee.map((member, idx) =>
    `Committee Member ${idx + 1} (${member.specialty}):\nQuestions: ${member.questions.join(", ")}\nAssessment: ${member.assessment}\nConcerns: ${member.concerns.join(", ")}\n`
  ).join("\n---\n\n");

  const response = await provider.call({
    model: config.models.chair,
    temperature: config.parameters.temperature,
    messages: [{
      role: "user",
      content: `You are the PhD defense committee chair.

PROPOSAL: ${proposal.title}

COMMITTEE ASSESSMENTS:
${committeeText}

Based on all committee feedback, render your decision in JSON:
{
  "decision": "pass" | "pass_with_revisions" | "major_revisions" | "fail",
  "summary": "decision summary paragraph",
  "strengths": ["strength 1", ...],
  "weaknesses": ["weakness 1", ...],
  "requiredRevisions": ["revision 1", ...],
  "recommendations": ["recommendation 1", ...]
}

Standards:
- "pass": No revisions needed, ready to proceed
- "pass_with_revisions": Minor clarifications required
- "major_revisions": Significant work needed, re-defense may be required
- "fail": Fundamental issues, proposal not viable`,
    }],
    maxTokens: 2048,
  });

  return parseJSON<DefenseResult>(response.content);
}

export * from "./types";
