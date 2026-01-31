/**
 * Tumor Board / MDT Framework
 * Multi-disciplinary consensus for complex decisions
 */

import { createProvider } from "@core/providers";
import { getAPIKey } from "@core/config";
import { parseJSON, executeParallel } from "@core/orchestrator";
import type { LLMProvider } from "@core/types";
import type { Case, SpecialistInput, TeamDiscussion, Recommendation, TumorBoardConfig, TumorBoardResult } from "./types";
import { DEFAULT_CONFIG } from "./types";

export async function run(
  input: Case | { content: string },
  flags: Record<string, any> = {}
): Promise<TumorBoardResult> {
  const caseData: Case = "caseId" in input
    ? input
    : {
        caseId: "case-1",
        summary: input.content || "",
      };

  const config: TumorBoardConfig = { ...DEFAULT_CONFIG, ...(flags.config || {}) };
  if (flags.specialties) {
    config.specialties = flags.specialties.split(",");
  }

  const providerName = flags.provider || "anthropic";
  const apiKey = getAPIKey(providerName);
  const provider = createProvider({ name: providerName, apiKey });

  const verbose = flags.verbose || false;

  if (verbose) console.log("\n🏥 MULTIDISCIPLINARY TEAM BOARD\n");

  // Phase 1: Specialist inputs
  const specialistInputs = await gatherSpecialistInputs(caseData, config, provider, verbose);

  // Phase 2: Team discussion
  const discussion = await facilitateDiscussion(caseData, specialistInputs, config, provider, verbose);

  // Phase 3: Consensus recommendation
  const recommendation = await formulateRecommendation(caseData, specialistInputs, discussion, config, provider, verbose);

  if (verbose) {
    console.log(`\nSpecialists Consulted: ${specialistInputs.length}`);
    console.log(`Consensus Points: ${discussion.consensusPoints.length}`);
    console.log(`Primary Recommendation: ${recommendation.primaryRecommendation}\n`);
  }

  return {
    case: caseData,
    specialistInputs,
    discussion,
    recommendation,
    metadata: { timestamp: new Date().toISOString(), config },
  };
}

async function gatherSpecialistInputs(
  caseData: Case,
  config: TumorBoardConfig,
  provider: LLMProvider,
  verbose: boolean
): Promise<SpecialistInput[]> {
  if (verbose) console.log("Phase 1: Gathering specialist inputs...\n");

  const tasks = config.specialties.map((specialty) => async () => {
    if (verbose) console.log(`  ${specialty} reviewing...`);

    const response = await provider.call({
      model: config.models.specialist,
      temperature: config.parameters.temperature,
      messages: [{
        role: "user",
        content: `You are a ${specialty} specialist in a multidisciplinary team meeting.

CASE: ${caseData.caseId}

SUMMARY:
${caseData.summary}

${caseData.patientFactors ? `PATIENT FACTORS:\n${caseData.patientFactors.map((f) => `- ${f}`).join("\n")}\n` : ""}
${caseData.constraints ? `CONSTRAINTS:\n${caseData.constraints.map((c) => `- ${c}`).join("\n")}\n` : ""}
${caseData.options ? `OPTIONS:\n${caseData.options.map((o) => `- ${o}`).join("\n")}\n` : ""}

Provide your specialist input in JSON:
{
  "specialty": "${specialty}",
  "assessment": "your assessment from this specialty's perspective",
  "recommendations": ["recommendation 1", ...],
  "concerns": ["concern 1", ...],
  "contraindications": ["contraindication 1", ...]
}`,
      }],
      maxTokens: 1536,
    });

    return parseJSON<SpecialistInput>(response.content);
  });

  return executeParallel(tasks);
}

async function facilitateDiscussion(
  caseData: Case,
  specialistInputs: SpecialistInput[],
  config: TumorBoardConfig,
  provider: LLMProvider,
  verbose: boolean
): Promise<TeamDiscussion> {
  if (verbose) console.log("\nPhase 2: Facilitating team discussion...\n");

  const inputsText = specialistInputs.map((input) =>
    `${input.specialty}:\nAssessment: ${input.assessment}\nRecommendations: ${input.recommendations.join(", ")}\nConcerns: ${input.concerns.join(", ")}`
  ).join("\n\n");

  const response = await provider.call({
    model: config.models.chair,
    temperature: config.parameters.temperature,
    messages: [{
      role: "user",
      content: `You are chairing a multidisciplinary team discussion.

CASE: ${caseData.caseId}

SPECIALIST INPUTS:
${inputsText}

Synthesize the team discussion in JSON:
{
  "consensusPoints": ["point of agreement 1", ...],
  "disagreements": [
    {
      "point": "point of disagreement",
      "perspectives": ["perspective 1", "perspective 2", ...]
    },
    ...
  ],
  "criticalFactors": ["critical factor 1", ...]
}`,
    }],
    maxTokens: 1536,
  });

  return parseJSON<TeamDiscussion>(response.content);
}

async function formulateRecommendation(
  caseData: Case,
  specialistInputs: SpecialistInput[],
  discussion: TeamDiscussion,
  config: TumorBoardConfig,
  provider: LLMProvider,
  verbose: boolean
): Promise<Recommendation> {
  if (verbose) console.log("\nPhase 3: Formulating consensus recommendation...\n");

  const inputsText = specialistInputs.map((input) =>
    `${input.specialty}: ${input.recommendations.join(", ")}`
  ).join("\n");

  const response = await provider.call({
    model: config.models.chair,
    temperature: config.parameters.temperature,
    messages: [{
      role: "user",
      content: `Formulate the multidisciplinary team's consensus recommendation.

CASE: ${caseData.caseId}

CONSENSUS POINTS:
${discussion.consensusPoints.map((p) => `- ${p}`).join("\n")}

DISAGREEMENTS:
${discussion.disagreements.map((d) => `${d.point}: ${d.perspectives.join(", ")}`).join("\n")}

SPECIALIST RECOMMENDATIONS:
${inputsText}

Provide consensus recommendation in JSON:
{
  "primaryRecommendation": "the team's primary recommendation",
  "rationale": "why this recommendation",
  "alternativeOptions": ["alternative 1", ...],
  "riskConsiderations": ["risk 1", ...],
  "patientCenteredFactors": ["patient factor 1", ...],
  "followUpPlan": ["follow-up step 1", ...],
  "contingencies": ["if X happens, then Y", ...]
}`,
    }],
    maxTokens: 2048,
  });

  return parseJSON<Recommendation>(response.content);
}

export * from "./types";
