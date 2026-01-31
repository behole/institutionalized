/**
 * Intelligence Analysis (Competing Hypotheses) Framework
 * Systematic diagnostic reasoning based on CIA methods
 */

import { createProvider } from "@core/providers";
import { getAPIKey } from "@core/config";
import { parseJSON } from "@core/orchestrator";
import type { LLMProvider } from "@core/types";
import type { Problem, Hypothesis, EvidenceEvaluation, Analysis, IntelligenceAnalysisConfig, IntelligenceAnalysisResult } from "./types";
import { DEFAULT_CONFIG } from "./types";

export async function run(
  input: Problem | { content: string },
  flags: Record<string, any> = {}
): Promise<IntelligenceAnalysisResult> {
  const problem: Problem = "question" in input
    ? input
    : { question: input.content || "", evidence: [] };

  const config: IntelligenceAnalysisConfig = { ...DEFAULT_CONFIG, ...(flags.config || {}) };

  const providerName = flags.provider || "anthropic";
  const apiKey = getAPIKey(providerName);
  const provider = createProvider({ name: providerName, apiKey });

  const verbose = flags.verbose || false;

  if (verbose) console.log("\n🔍 INTELLIGENCE ANALYSIS - COMPETING HYPOTHESES\n");

  // Phase 1: Generate competing hypotheses
  const hypotheses = await generateHypotheses(problem, config, provider, verbose);

  // Phase 2: Evaluate evidence against hypotheses
  const evidenceEvaluation = await evaluateEvidence(problem, hypotheses, config, provider, verbose);

  // Phase 3: Rank hypotheses and synthesize
  const analysis = await synthesizeAnalysis(problem, hypotheses, evidenceEvaluation, config, provider, verbose);

  if (verbose) {
    console.log(`\nHypotheses Generated: ${hypotheses.length}`);
    console.log(`Most Likely: ${analysis.mostLikely}`);
    console.log(`Confidence: ${analysis.rankedHypotheses[0]?.confidence || "N/A"}\n`);
  }

  return {
    problem,
    hypotheses,
    evidenceEvaluation,
    analysis,
    metadata: { timestamp: new Date().toISOString(), config },
  };
}

async function generateHypotheses(
  problem: Problem,
  config: IntelligenceAnalysisConfig,
  provider: LLMProvider,
  verbose: boolean
): Promise<Hypothesis[]> {
  if (verbose) console.log("Phase 1: Generating competing hypotheses...\n");

  const response = await provider.call({
    model: config.models.analyst,
    temperature: config.parameters.temperature,
    messages: [{
      role: "user",
      content: `You are an intelligence analyst using the Analysis of Competing Hypotheses (ACH) method.

QUESTION/PROBLEM:
${problem.question}

${problem.context ? `CONTEXT:\n${problem.context}\n` : ""}

AVAILABLE EVIDENCE:
${problem.evidence.map((e, i) => `${i + 1}. ${e}`).join("\n")}

Generate at least ${config.parameters.minHypotheses} competing hypotheses that could explain the situation. Include both likely and unlikely alternatives. Return in JSON:
{
  "hypotheses": [
    {
      "id": "h1",
      "hypothesis": "hypothesis statement",
      "plausibility": <0-10>,
      "supportingEvidence": ["evidence 1", ...],
      "contradictingEvidence": ["evidence 1", ...],
      "assumptions": ["assumption 1", ...]
    },
    ...
  ]
}`,
    }],
    maxTokens: 3072,
  });

  const parsed = parseJSON<{ hypotheses: Hypothesis[] }>(response.content);
  return parsed.hypotheses;
}

async function evaluateEvidence(
  problem: Problem,
  hypotheses: Hypothesis[],
  config: IntelligenceAnalysisConfig,
  provider: LLMProvider,
  verbose: boolean
): Promise<EvidenceEvaluation[]> {
  if (verbose) console.log("\nPhase 2: Evaluating evidence against hypotheses...\n");

  const hypothesesText = hypotheses.map((h) => `${h.id}: ${h.hypothesis}`).join("\n");

  const response = await provider.call({
    model: config.models.evaluator,
    temperature: config.parameters.temperature,
    messages: [{
      role: "user",
      content: `Evaluate each piece of evidence for its discriminating power.

HYPOTHESES:
${hypothesesText}

EVIDENCE:
${problem.evidence.map((e, i) => `E${i + 1}: ${e}`).join("\n")}

For each piece of evidence, assess in JSON:
{
  "evaluations": [
    {
      "evidence": "evidence text",
      "discriminatingPower": <0-10>,
      "supportedHypotheses": ["h1", ...],
      "contradictedHypotheses": ["h2", ...],
      "reliability": <0-10>,
      "analysis": "why this evidence matters"
    },
    ...
  ]
}

Focus on evidence that helps distinguish between hypotheses.`,
    }],
    maxTokens: 2048,
  });

  const parsed = parseJSON<{ evaluations: EvidenceEvaluation[] }>(response.content);
  return parsed.evaluations;
}

async function synthesizeAnalysis(
  problem: Problem,
  hypotheses: Hypothesis[],
  evidenceEvaluation: EvidenceEvaluation[],
  config: IntelligenceAnalysisConfig,
  provider: LLMProvider,
  verbose: boolean
): Promise<Analysis> {
  if (verbose) console.log("\nPhase 3: Synthesizing analysis and ranking hypotheses...\n");

  const hypothesesText = hypotheses.map((h) =>
    `${h.id}: ${h.hypothesis}\nPlausibility: ${h.plausibility}\nSupporting: ${h.supportingEvidence.join(", ")}\nContradicting: ${h.contradictingEvidence.join(", ")}`
  ).join("\n\n");

  const evidenceText = evidenceEvaluation.map((e) =>
    `Evidence: ${e.evidence}\nDiscriminating Power: ${e.discriminatingPower}\nSupports: ${e.supportedHypotheses.join(", ")}\nContradicts: ${e.contradictedHypotheses.join(", ")}`
  ).join("\n\n");

  const response = await provider.call({
    model: config.models.evaluator,
    temperature: config.parameters.temperature,
    messages: [{
      role: "user",
      content: `Synthesize the analysis and rank hypotheses by likelihood.

PROBLEM: ${problem.question}

HYPOTHESES:
${hypothesesText}

EVIDENCE EVALUATION:
${evidenceText}

Provide final analysis in JSON:
{
  "rankedHypotheses": [
    {
      "hypothesisId": "...",
      "hypothesis": "...",
      "likelihood": <0-100>,
      "confidence": "low" | "medium" | "high",
      "rationale": "why this ranking"
    },
    ...
  ],
  "mostLikely": "hypothesis statement",
  "discriminatingEvidence": ["key evidence 1", ...],
  "remainingUncertainties": ["uncertainty 1", ...],
  "recommendations": ["next step 1", ...],
  "summary": "overall analysis summary"
}

Rank from most to least likely. Identify which evidence was most discriminating.`,
    }],
    maxTokens: 2048,
  });

  return parseJSON<Analysis>(response.content);
}

export * from "./types";
