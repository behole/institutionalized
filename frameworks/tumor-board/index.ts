/**
 * Tumor Board / MDT Framework
 * Multi-disciplinary consensus for complex decisions
 */

import { createProvider } from "@core/providers";
import { getAPIKey } from "@core/config";
import { parseJSON, FrameworkRunner } from "@core/orchestrator";
import type { LLMProvider, RunFlags } from "@core/types";
import type { Case, SpecialistInput, TeamDiscussion, Recommendation, TumorBoardConfig, TumorBoardResult } from "./types";
import { DEFAULT_CONFIG } from "./types";

export async function run(
  input: Case | { content: string },
  flags: RunFlags = {}
): Promise<TumorBoardResult> {
  const caseData: Case = "caseId" in input
    ? input
    : {
        caseId: "case-1",
        summary: input.content || "",
      };

  const config: TumorBoardConfig = { ...DEFAULT_CONFIG, ...(flags.config || {}) };
  const cliFlags = flags as Record<string, unknown>;
  if (cliFlags.specialties) {
    config.specialties = String(cliFlags.specialties).split(",");
  }

  const providerName = flags.provider || "anthropic";
  const apiKey = getAPIKey(providerName);
  const provider = createProvider({ name: providerName, apiKey });

  const verbose = flags.debug ?? false;

  if (verbose) console.log("\n🏥 MULTIDISCIPLINARY TEAM BOARD\n");

  const runner = new FrameworkRunner<Case, TumorBoardResult>("tumor-board", caseData);

  // Phase 1: Specialist inputs
  const specialistInputs = await gatherSpecialistInputs(caseData, config, provider, runner, verbose);

  // Phase 2: Team discussion
  const discussion = await facilitateDiscussion(caseData, specialistInputs, config, provider, runner, verbose);

  // Phase 3: Consensus recommendation
  const recommendation = await formulateRecommendation(caseData, specialistInputs, discussion, config, provider, runner, verbose);

  if (verbose) {
    console.log(`\nSpecialists Consulted: ${specialistInputs.length}`);
    console.log(`Consensus Points: ${discussion.consensusPoints.length}`);
    console.log(`Primary Recommendation: ${recommendation.primaryRecommendation}\n`);
  }

  const result: TumorBoardResult = {
    case: caseData,
    specialistInputs,
    discussion,
    recommendation,
    metadata: { timestamp: new Date().toISOString(), config },
  };

  const { auditLog } = await runner.finalize(result, "complete");

  return {
    ...result,
    metadata: { ...result.metadata, costUSD: auditLog.metadata.totalCost },
  };
}

async function gatherSpecialistInputs(
  caseData: Case,
  config: TumorBoardConfig,
  provider: LLMProvider,
  runner: FrameworkRunner<Case, TumorBoardResult>,
  verbose: boolean
): Promise<SpecialistInput[]> {
  if (verbose) console.log("Phase 1: Gathering specialist inputs...\n");

  const responses = await runner.runParallel(
    config.specialties.map((specialty) => {
      if (verbose) console.log(`  ${specialty} reviewing...`);
      return {
        name: `specialist-${specialty.toLowerCase().replace(/\s+/g, "-")}`,
        provider,
        model: config.models.specialist,
        prompt: `You are a ${specialty} specialist in a multidisciplinary team meeting.

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
        temperature: config.parameters.temperature,
        maxTokens: 1536,
      };
    })
  );

  return responses.map((response) => parseJSON<SpecialistInput>(response.content));
}

async function facilitateDiscussion(
  caseData: Case,
  specialistInputs: SpecialistInput[],
  config: TumorBoardConfig,
  provider: LLMProvider,
  runner: FrameworkRunner<Case, TumorBoardResult>,
  verbose: boolean
): Promise<TeamDiscussion> {
  if (verbose) console.log("\nPhase 2: Facilitating team discussion...\n");

  const inputsText = specialistInputs.map((input) =>
    `${input.specialty}:\nAssessment: ${input.assessment}\nRecommendations: ${input.recommendations.join(", ")}\nConcerns: ${input.concerns.join(", ")}`
  ).join("\n\n");

  const response = await runner.runAgent(
    "chair-discussion",
    provider,
    config.models.chair,
    `You are chairing a multidisciplinary team discussion.

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
    config.parameters.temperature,
    1536
  );

  return parseJSON<TeamDiscussion>(response.content);
}

async function formulateRecommendation(
  caseData: Case,
  specialistInputs: SpecialistInput[],
  discussion: TeamDiscussion,
  config: TumorBoardConfig,
  provider: LLMProvider,
  runner: FrameworkRunner<Case, TumorBoardResult>,
  verbose: boolean
): Promise<Recommendation> {
  if (verbose) console.log("\nPhase 3: Formulating consensus recommendation...\n");

  const inputsText = specialistInputs.map((input) =>
    `${input.specialty}: ${input.recommendations.join(", ")}`
  ).join("\n");

  const response = await runner.runAgent(
    "chair-recommendation",
    provider,
    config.models.chair,
    `Formulate the multidisciplinary team's consensus recommendation.

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
    config.parameters.temperature,
    2048
  );

  return parseJSON<Recommendation>(response.content);
}

export * from "./types";
