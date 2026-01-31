/**
 * Six Thinking Hats Framework
 * Multi-perspective analysis using Edward de Bono's method
 */

import { createProvider } from "@core/providers";
import { getAPIKey } from "@core/config";
import { parseJSON, executeParallel } from "@core/orchestrator";
import type { LLMProvider } from "@core/types";
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
  flags: Record<string, any> = {}
): Promise<SixHatsResult> {
  const analysis: Analysis = "question" in input
    ? input
    : { question: input.content || "" };

  const config: SixHatsConfig = { ...DEFAULT_CONFIG, ...(flags.config || {}) };
  const providerName = flags.provider || "anthropic";
  const apiKey = getAPIKey(providerName);
  const provider = createProvider({ name: providerName, apiKey });

  const verbose = flags.verbose || false;

  if (verbose) console.log("\n🎩 SIX THINKING HATS ANALYSIS\n");

  // Phase 1: All hats think in parallel
  const perspectives = await gatherPerspectives(analysis, config, provider, verbose);

  // Phase 2: Facilitator synthesizes
  const synthesis = await synthesize(analysis, perspectives, config, provider, verbose);

  if (verbose) {
    console.log(`\nPerspectives: ${perspectives.length}`);
    console.log(`Key Insights: ${synthesis.keyInsights.length}\n`);
  }

  return {
    analysis,
    perspectives,
    synthesis,
    metadata: { timestamp: new Date().toISOString(), config },
  };
}

async function gatherPerspectives(
  analysis: Analysis,
  config: SixHatsConfig,
  provider: LLMProvider,
  verbose: boolean
): Promise<HatPerspective[]> {
  if (verbose) console.log("Phase 1: Gathering perspectives from all six hats...\n");

  const tasks = HATS.map((hat) => async () => {
    if (verbose) console.log(`  ${hat.name}...`);

    const response = await provider.call({
      model: config.models.hat,
      temperature: config.parameters.temperature,
      messages: [{
        role: "user",
        content: `You are wearing the ${hat.name} in Edward de Bono's Six Thinking Hats method.

${hat.prompt}

QUESTION/DECISION TO ANALYZE:
${analysis.question}

${analysis.context ? `CONTEXT:\n${analysis.context}\n` : ""}

Provide your analysis from this hat's perspective (2-4 paragraphs).`,
      }],
      maxTokens: 1024,
    });

    return {
      hat: hat.color,
      name: hat.name,
      analysis: response.content.trim(),
    };
  });

  return executeParallel(tasks);
}

async function synthesize(
  analysis: Analysis,
  perspectives: HatPerspective[],
  config: SixHatsConfig,
  provider: LLMProvider,
  verbose: boolean
): Promise<SixHatsResult["synthesis"]> {
  if (verbose) console.log("\nPhase 2: Facilitator synthesizing all perspectives...\n");

  const perspectivesText = perspectives.map(
    (p) => `${p.name}:\n${p.analysis}\n`
  ).join("\n---\n\n");

  const response = await provider.call({
    model: config.models.facilitator,
    temperature: config.parameters.temperature,
    messages: [{
      role: "user",
      content: `You are the Blue Hat facilitator in a Six Thinking Hats session.

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
    }],
    maxTokens: 2048,
  });

  return parseJSON<SixHatsResult["synthesis"]>(response.content);
}

export * from "./types";