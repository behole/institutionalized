/**
 * Six Thinking Hats Framework
 * Multi-perspective analysis using Edward de Bono's method
 */

import { createProvider } from "@core/providers";
import { getAPIKey } from "@core/config";
import { parseJSON, FrameworkRunner } from "@core/orchestrator";
import type { LLMProvider, RunFlags } from "@core/types";
import type { Analysis, HatPerspective, SixHatsConfig, SixHatsResult } from "./types";
import { DEFAULT_CONFIG } from "./types";

const HATS = [
  {
    color: "white" as const,
    name: "White Hat - Facts & Information",
    prompt: "Focus on data, facts, and information. What do we know? What don't we know? What information is missing? Be objective and neutral.",
  },
  {
    color: "red" as const,
    name: "Red Hat - Emotions & Intuition",
    prompt: "Express emotions, feelings, hunches, and intuition about this. What does your gut say? How do you feel about it? No need to justify.",
  },
  {
    color: "black" as const,
    name: "Black Hat - Critical Judgment",
    prompt: "Identify risks, problems, weaknesses, and dangers. What could go wrong? Why might this fail? What are the downsides? Be cautious and critical.",
  },
  {
    color: "yellow" as const,
    name: "Yellow Hat - Optimistic View",
    prompt: "Explore benefits, values, and opportunities. What are the best-case scenarios? Why will this work? What are the advantages? Be positive and constructive.",
  },
  {
    color: "green" as const,
    name: "Green Hat - Creative Alternatives",
    prompt: "Generate creative ideas, alternatives, and possibilities. Think outside the box. What are unconventional approaches? What if we did something completely different?",
  },
  {
    color: "blue" as const,
    name: "Blue Hat - Process Control",
    prompt: "Think about the thinking process itself. What have we covered? What's missing? How should we organize our thoughts? What's the big picture?",
  },
] as const;

export async function run(
  input: Analysis | { content: string },
  flags: RunFlags = {}
): Promise<SixHatsResult> {
  const analysis: Analysis = "question" in input
    ? input
    : { question: input.content || "" };

  const config: SixHatsConfig = { ...DEFAULT_CONFIG, ...(flags.config || {}) };
  const providerName = flags.provider || "anthropic";
  const apiKey = getAPIKey(providerName);
  const provider = createProvider({ name: providerName, apiKey });

  const verbose = flags.debug ?? false;

  if (verbose) console.log("\n🎩 SIX THINKING HATS ANALYSIS\n");

  const runner = new FrameworkRunner<Analysis, SixHatsResult>("six-hats", analysis);

  // Phase 1: All hats think in parallel
  const perspectives = await gatherPerspectives(analysis, config, provider, runner, verbose);

  // Phase 2: Facilitator synthesizes
  const synthesis = await synthesize(analysis, perspectives, config, provider, runner, verbose);

  if (verbose) {
    console.log(`\nPerspectives: ${perspectives.length}`);
    console.log(`Key Insights: ${synthesis.keyInsights.length}\n`);
  }

  const result: SixHatsResult = {
    analysis,
    perspectives,
    synthesis,
    metadata: { timestamp: new Date().toISOString(), config },
  };

  const { auditLog } = await runner.finalize(result, "complete");

  return {
    ...result,
    metadata: { ...result.metadata, costUSD: auditLog.metadata.totalCost },
  };
}

async function gatherPerspectives(
  analysis: Analysis,
  config: SixHatsConfig,
  provider: LLMProvider,
  runner: FrameworkRunner<Analysis, SixHatsResult>,
  verbose: boolean
): Promise<HatPerspective[]> {
  if (verbose) console.log("Phase 1: Gathering perspectives from all six hats...\n");

  const responses = await runner.runParallel(
    HATS.map((hat) => ({
      name: `hat-${hat.color}`,
      provider,
      model: config.models.hat,
      prompt: `You are wearing the ${hat.name} in Edward de Bono's Six Thinking Hats method.

${hat.prompt}

QUESTION/DECISION TO ANALYZE:
${analysis.question}

${analysis.context ? `CONTEXT:\n${analysis.context}\n` : ""}

Provide your analysis from this hat's perspective (2-4 paragraphs).`,
      temperature: config.parameters.temperature,
      maxTokens: 1024,
    }))
  );

  return responses.map((response, i) => ({
    hat: HATS[i].color,
    name: HATS[i].name,
    analysis: response.content.trim(),
  }));
}

async function synthesize(
  analysis: Analysis,
  perspectives: HatPerspective[],
  config: SixHatsConfig,
  provider: LLMProvider,
  runner: FrameworkRunner<Analysis, SixHatsResult>,
  verbose: boolean
): Promise<SixHatsResult["synthesis"]> {
  if (verbose) console.log("\nPhase 2: Facilitator synthesizing all perspectives...\n");

  const perspectivesText = perspectives.map(
    (p) => `${p.name}:\n${p.analysis}\n`
  ).join("\n---\n\n");

  const response = await runner.runAgent(
    "facilitator",
    provider,
    config.models.facilitator,
    `You are the Blue Hat facilitator in a Six Thinking Hats session.

QUESTION ANALYZED:
${analysis.question}

ALL PERSPECTIVES:
${perspectivesText}

Synthesize all perspectives into a comprehensive analysis in JSON:
{
  "summary": "overall synthesis paragraph",
  "keyInsights": ["insight 1", "insight 2", ...],
  "recommendation": "recommended path forward",
  "considerations": {
    "facts": ["key fact 1", ...],
    "risks": ["risk 1", ...],
    "benefits": ["benefit 1", ...],
    "alternatives": ["alternative 1", ...],
    "emotions": ["emotional factor 1", ...]
  }
}`,
    config.parameters.temperature,
    2048
  );

  return parseJSON<SixHatsResult["synthesis"]>(response.content);
}

export * from "./types";