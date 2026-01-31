/**
 * SWOT Analysis Framework
 * Strategic situational assessment
 */

import { createProvider } from "@core/providers";
import { getAPIKey } from "@core/config";
import { parseJSON } from "@core/orchestrator";
import type { LLMProvider } from "@core/types";
import type { Situation, InternalAnalysis, ExternalAnalysis, StrategicRecommendations, SWOTConfig, SWOTResult } from "./types";
import { DEFAULT_CONFIG } from "./types";

export async function run(
  input: Situation | { content: string },
  flags: Record<string, any> = {}
): Promise<SWOTResult> {
  const situation: Situation = "entity" in input
    ? input
    : { entity: "Unnamed Entity", description: input.content || "" };

  const config: SWOTConfig = { ...DEFAULT_CONFIG, ...(flags.config || {}) };

  const providerName = flags.provider || "anthropic";
  const apiKey = getAPIKey(providerName);
  const provider = createProvider({ name: providerName, apiKey });

  const verbose = flags.verbose || false;

  if (verbose) console.log("\n📊 SWOT ANALYSIS\n");

  // Phase 1: Internal analysis (Strengths & Weaknesses)
  const internal = await analyzeInternal(situation, config, provider, verbose);

  // Phase 2: External analysis (Opportunities & Threats)
  const external = await analyzeExternal(situation, config, provider, verbose);

  // Phase 3: Strategic synthesis
  const strategies = await synthesizeStrategies(situation, internal, external, config, provider, verbose);

  if (verbose) {
    console.log(`\nStrengths: ${internal.strengths.length}`);
    console.log(`Weaknesses: ${internal.weaknesses.length}`);
    console.log(`Opportunities: ${external.opportunities.length}`);
    console.log(`Threats: ${external.threats.length}`);
    console.log(`Strategic Priorities: ${strategies.priorities.length}\n`);
  }

  return {
    situation,
    internal,
    external,
    strategies,
    metadata: { timestamp: new Date().toISOString(), config },
  };
}

async function analyzeInternal(
  situation: Situation,
  config: SWOTConfig,
  provider: LLMProvider,
  verbose: boolean
): Promise<InternalAnalysis> {
  if (verbose) console.log("Phase 1: Internal analysis (Strengths & Weaknesses)...\n");

  const response = await provider.call({
    model: config.models.internalAnalyst,
    temperature: config.parameters.temperature,
    messages: [{
      role: "user",
      content: `You are an internal analyst conducting a SWOT analysis.

ENTITY: ${situation.entity}

DESCRIPTION:
${situation.description}

${situation.currentState ? `CURRENT STATE:\n${situation.currentState}\n` : ""}
${situation.goals ? `GOALS:\n${situation.goals.map((g) => `- ${g}`).join("\n")}\n` : ""}

Analyze internal factors in JSON:
{
  "strengths": ["strength 1", ...],
  "weaknesses": ["weakness 1", ...],
  "internalFactors": ["factor 1", ...],
  "coreCompetencies": ["competency 1", ...],
  "gaps": ["gap 1", ...]
}

Focus on controllable, internal attributes of the entity.`,
    }],
    maxTokens: 2048,
  });

  return parseJSON<InternalAnalysis>(response.content);
}

async function analyzeExternal(
  situation: Situation,
  config: SWOTConfig,
  provider: LLMProvider,
  verbose: boolean
): Promise<ExternalAnalysis> {
  if (verbose) console.log("\nPhase 2: External analysis (Opportunities & Threats)...\n");

  const response = await provider.call({
    model: config.models.externalAnalyst,
    temperature: config.parameters.temperature,
    messages: [{
      role: "user",
      content: `You are an external analyst conducting a SWOT analysis.

ENTITY: ${situation.entity}

DESCRIPTION:
${situation.description}

${situation.currentState ? `CURRENT STATE:\n${situation.currentState}\n` : ""}
${situation.goals ? `GOALS:\n${situation.goals.map((g) => `- ${g}`).join("\n")}\n` : ""}

Analyze external factors in JSON:
{
  "opportunities": ["opportunity 1", ...],
  "threats": ["threat 1", ...],
  "marketTrends": ["trend 1", ...],
  "competitiveLandscape": ["competitor insight 1", ...],
  "externalForces": ["force 1", ...]
}

Focus on external environment, market, competition, and uncontrollable factors.`,
    }],
    maxTokens: 2048,
  });

  return parseJSON<ExternalAnalysis>(response.content);
}

async function synthesizeStrategies(
  situation: Situation,
  internal: InternalAnalysis,
  external: ExternalAnalysis,
  config: SWOTConfig,
  provider: LLMProvider,
  verbose: boolean
): Promise<StrategicRecommendations> {
  if (verbose) console.log("\nPhase 3: Strategic synthesis...\n");

  const response = await provider.call({
    model: config.models.strategist,
    temperature: config.parameters.temperature,
    messages: [{
      role: "user",
      content: `You are a strategist synthesizing SWOT analysis.

ENTITY: ${situation.entity}

STRENGTHS:
${internal.strengths.map((s) => `- ${s}`).join("\n")}

WEAKNESSES:
${internal.weaknesses.map((w) => `- ${w}`).join("\n")}

OPPORTUNITIES:
${external.opportunities.map((o) => `- ${o}`).join("\n")}

THREATS:
${external.threats.map((t) => `- ${t}`).join("\n")}

Develop strategies in JSON:
{
  "soStrategies": ["strategy leveraging strength + opportunity", ...],
  "woStrategies": ["strategy overcoming weakness to capture opportunity", ...],
  "stStrategies": ["strategy using strength to mitigate threat", ...],
  "wtStrategies": ["defensive strategy for weakness + threat", ...],
  "priorities": [
    {
      "strategy": "...",
      "priority": "critical" | "high" | "medium" | "low",
      "rationale": "why this priority"
    },
    ...
  ],
  "actionPlan": ["concrete action 1", ...]
}

Use the SWOT matrix to develop comprehensive strategies.`,
    }],
    maxTokens: 2048,
  });

  return parseJSON<StrategicRecommendations>(response.content);
}

export * from "./types";
