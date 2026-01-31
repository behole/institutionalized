/**
 * Differential Diagnosis Framework
 * Systematic elimination and diagnostic reasoning
 */

import { createProvider } from "@core/providers";
import { getAPIKey } from "@core/config";
import { parseJSON } from "@core/orchestrator";
import type { LLMProvider } from "@core/types";
import type { Symptoms, Diagnosis, DiagnosticTest, FinalDiagnosis, DifferentialDiagnosisConfig, DifferentialDiagnosisResult } from "./types";
import { DEFAULT_CONFIG } from "./types";

export async function run(
  input: Symptoms | { content: string },
  flags: Record<string, any> = {}
): Promise<DifferentialDiagnosisResult> {
  const symptoms: Symptoms = "presenting" in input
    ? input
    : { presenting: input.content || "", symptoms: [] };

  const config: DifferentialDiagnosisConfig = { ...DEFAULT_CONFIG, ...(flags.config || {}) };

  const providerName = flags.provider || "anthropic";
  const apiKey = getAPIKey(providerName);
  const provider = createProvider({ name: providerName, apiKey });

  const verbose = flags.verbose || false;

  if (verbose) console.log("\n🩺 DIFFERENTIAL DIAGNOSIS\n");

  // Phase 1: Generate differential diagnoses
  const differentials = await generateDifferentials(symptoms, config, provider, verbose);

  // Phase 2: Recommend diagnostic tests
  const recommendedTests = await recommendTests(symptoms, differentials, config, provider, verbose);

  // Phase 3: Synthesize final diagnosis
  const finalDiagnosis = await synthesizeDiagnosis(symptoms, differentials, recommendedTests, config, provider, verbose);

  if (verbose) {
    console.log(`\nDifferentials Generated: ${differentials.length}`);
    console.log(`Most Likely: ${finalDiagnosis.mostLikely}`);
    console.log(`Confidence: ${finalDiagnosis.confidence}\n`);
  }

  return {
    symptoms,
    differentials,
    recommendedTests,
    finalDiagnosis,
    metadata: { timestamp: new Date().toISOString(), config },
  };
}

async function generateDifferentials(
  symptoms: Symptoms,
  config: DifferentialDiagnosisConfig,
  provider: LLMProvider,
  verbose: boolean
): Promise<Diagnosis[]> {
  if (verbose) console.log("Phase 1: Generating differential diagnoses...\n");

  const response = await provider.call({
    model: config.models.diagnostician,
    temperature: config.parameters.temperature,
    messages: [{
      role: "user",
      content: `You are a diagnostician using systematic differential diagnosis.

PRESENTING PROBLEM:
${symptoms.presenting}

SYMPTOMS:
${symptoms.symptoms.map((s, i) => `${i + 1}. ${s}`).join("\n")}

${symptoms.history ? `HISTORY:\n${symptoms.history}\n` : ""}
${symptoms.context ? `CONTEXT:\n${symptoms.context}\n` : ""}

Generate up to ${config.parameters.maxDifferentials} differential diagnoses, ordered by likelihood. Include both common and serious conditions. Return in JSON:
{
  "diagnoses": [
    {
      "diagnosis": "condition name",
      "likelihood": <0-100>,
      "supportingSymptoms": ["symptom 1", ...],
      "contradictingSymptoms": ["symptom 1", ...],
      "testingStrategy": ["test 1", ...],
      "reasoning": "why this is in the differential"
    },
    ...
  ]
}`,
    }],
    maxTokens: 3072,
  });

  const parsed = parseJSON<{ diagnoses: Diagnosis[] }>(response.content);
  return parsed.diagnoses;
}

async function recommendTests(
  symptoms: Symptoms,
  differentials: Diagnosis[],
  config: DifferentialDiagnosisConfig,
  provider: LLMProvider,
  verbose: boolean
): Promise<DiagnosticTest[]> {
  if (verbose) console.log("\nPhase 2: Recommending diagnostic tests...\n");

  const differentialsText = differentials.map((d) =>
    `${d.diagnosis} (${d.likelihood}%): ${d.reasoning}`
  ).join("\n");

  const response = await provider.call({
    model: config.models.diagnostician,
    temperature: config.parameters.temperature,
    messages: [{
      role: "user",
      content: `Recommend diagnostic tests to distinguish between these differentials.

PRESENTING: ${symptoms.presenting}

DIFFERENTIALS:
${differentialsText}

Recommend tests with high discriminating power in JSON:
{
  "tests": [
    {
      "test": "test name",
      "purpose": "what it distinguishes",
      "expectedFindings": {"diagnosis1": "finding", "diagnosis2": "finding", ...},
      "discriminatingPower": <0-10>
    },
    ...
  ]
}

Prioritize tests that help rule in/out multiple differentials.`,
    }],
    maxTokens: 2048,
  });

  const parsed = parseJSON<{ tests: DiagnosticTest[] }>(response.content);
  return parsed.tests;
}

async function synthesizeDiagnosis(
  symptoms: Symptoms,
  differentials: Diagnosis[],
  tests: DiagnosticTest[],
  config: DifferentialDiagnosisConfig,
  provider: LLMProvider,
  verbose: boolean
): Promise<FinalDiagnosis> {
  if (verbose) console.log("\nPhase 3: Synthesizing final diagnosis...\n");

  const differentialsText = differentials.map((d) =>
    `${d.diagnosis} (${d.likelihood}%): Supporting: ${d.supportingSymptoms.join(", ")} | Contradicting: ${d.contradictingSymptoms.join(", ")}`
  ).join("\n");

  const testsText = tests.map((t) =>
    `${t.test}: ${t.purpose} (discriminating power: ${t.discriminatingPower})`
  ).join("\n");

  const response = await provider.call({
    model: config.models.specialist,
    temperature: config.parameters.temperature,
    messages: [{
      role: "user",
      content: `Synthesize the diagnostic workup.

PRESENTING: ${symptoms.presenting}

DIFFERENTIALS:
${differentialsText}

RECOMMENDED TESTS:
${testsText}

Provide final assessment in JSON:
{
  "mostLikely": "most likely diagnosis",
  "confidence": "low" | "medium" | "high" | "definitive",
  "differentials": [
    {"diagnosis": "...", "likelihood": <0-100>, "reasoning": "..."},
    ...
  ],
  "criticalTests": ["test 1", ...],
  "treatmentRecommendations": ["recommendation 1", ...],
  "monitoringPlan": ["monitor 1", ...]
}`,
    }],
    maxTokens: 2048,
  });

  return parseJSON<FinalDiagnosis>(response.content);
}

export * from "./types";
