import type { TextualProblem, TalmudicConfig, Interpretation, CounterInterpretation, Resolution, TalmudicInsight } from "./types";
import { parseJSON } from "@core/orchestrator";
import type { LLMProvider } from "@core/types";

export function buildInterpretationPrompt(
  problem: TextualProblem,
  interpreterName: string,
  config: TalmudicConfig
): { system: string; user: string } {
  const system = `You are a textual interpreter engaging in Talmudic-style analysis.
Your role is to offer a distinct interpretation of the text, grounded in the text itself.

Key principles:
- Base your interpretation on specific textual evidence
- Provide reasoning for your interpretation
- Consider practical implications
- Respect the text while offering fresh insight

Your interpretation should be valid and defensible, even if other interpreters might disagree.

Respond with valid JSON matching this structure:
{
  "interpreter": "string",
  "interpretation": "string",
  "textualSupport": ["string"],
  "reasoning": "string",
  "implications": ["string"]
}`;

  const user = `TEXT TO INTERPRET:
${problem.text}

${problem.context ? `CONTEXT:\n${problem.context}\n` : ""}
${problem.specificQuestion ? `SPECIFIC QUESTION:\n${problem.specificQuestion}\n` : ""}
${problem.constraints ? `CONSTRAINTS:\n${problem.constraints.join("\n")}\n` : ""}

As ${interpreterName}, provide:
1. Your interpretation of the text
2. Specific textual support (quotes or references)
3. Your reasoning process
4. Practical implications of your interpretation`;

  return { system, user };
}

export function parseInterpretationResponse(text: string, interpreterName: string): Interpretation {
  try {
    return parseJSON<Interpretation>(text);
  } catch {
    return {
      interpreter: interpreterName,
      interpretation: "Unable to generate complete interpretation",
      textualSupport: ["Text analysis incomplete"],
      reasoning: "Interpretation process encountered an error",
      implications: ["Further analysis needed"],
    };
  }
}

export async function generateInterpretation(
  problem: TextualProblem,
  interpreterName: string,
  config: TalmudicConfig,
  provider: LLMProvider
): Promise<Interpretation> {
  const { system, user } = buildInterpretationPrompt(problem, interpreterName, config);

  try {
    const response = await provider.call({
      model: config.models[interpreterName],
      messages: [{ role: "user", content: user }],
      temperature: config.parameters.temperature,
      systemPrompt: system,
      maxTokens: 4096,
    });
    return parseInterpretationResponse(response.content, interpreterName);
  } catch (error) {
    console.warn(`Interpretation failed for ${interpreterName}:`, error);
    return {
      interpreter: interpreterName,
      interpretation: "Unable to generate complete interpretation",
      textualSupport: ["Text analysis incomplete"],
      reasoning: "Interpretation process encountered an error",
      implications: ["Further analysis needed"],
    };
  }
}

export function buildCounterpointPrompt(
  problem: TextualProblem,
  interpretation: Interpretation,
  opposingInterpretation: Interpretation,
  config: TalmudicConfig
): { system: string; user: string } {
  const system = `You are analyzing the relationship between two interpretations in Talmudic style.
Your role is to articulate why these interpretations differ and what evidence supports each view.

Focus on:
- Respectful engagement with both views
- Clear articulation of differences
- Textual basis for each position
- Why reasonable people might disagree

Respond with valid JSON matching this structure:
{
  "respondsTo": "string",
  "counterPoint": "string",
  "textualEvidence": ["string"],
  "whyDifferent": "string"
}`;

  const user = `TEXT:
${problem.text}

INTERPRETATION A (${interpretation.interpreter}):
${interpretation.interpretation}
Textual Support: ${interpretation.textualSupport.join("; ")}

INTERPRETATION B (${opposingInterpretation.interpreter}):
${opposingInterpretation.interpretation}
Textual Support: ${opposingInterpretation.textualSupport.join("; ")}

Analyze the counterpoint:
1. How does B respond to or differ from A?
2. What textual evidence supports the difference?
3. Why do these interpretations diverge?`;

  return { system, user };
}

export function parseCounterpointResponse(text: string, interpretation: Interpretation, opposingInterpretation: Interpretation): CounterInterpretation {
  try {
    return parseJSON<CounterInterpretation>(text);
  } catch {
    return {
      respondsTo: interpretation.interpreter,
      counterPoint: `Alternative view from ${opposingInterpretation.interpreter}`,
      textualEvidence: opposingInterpretation.textualSupport,
      whyDifferent: "Interpretations offer different perspectives on the text",
    };
  }
}

export async function generateCounterpoint(
  problem: TextualProblem,
  interpretation: Interpretation,
  opposingInterpretation: Interpretation,
  config: TalmudicConfig,
  provider: LLMProvider
): Promise<CounterInterpretation> {
  const { system, user } = buildCounterpointPrompt(problem, interpretation, opposingInterpretation, config);

  try {
    const response = await provider.call({
      model: config.models.resolver,
      messages: [{ role: "user", content: user }],
      temperature: 0.6,
      systemPrompt: system,
      maxTokens: 4096,
    });
    return parseCounterpointResponse(response.content, interpretation, opposingInterpretation);
  } catch (error) {
    console.warn("Counterpoint generation failed:", error);
    return {
      respondsTo: interpretation.interpreter,
      counterPoint: `Alternative view from ${opposingInterpretation.interpreter}`,
      textualEvidence: opposingInterpretation.textualSupport,
      whyDifferent: "Interpretations offer different perspectives on the text",
    };
  }
}

export function buildResolutionPrompt(
  problem: TextualProblem,
  interpretations: Interpretation[],
  counterpoints: CounterInterpretation[],
  config: TalmudicConfig
): { system: string; user: string } {
  const system = `You are a resolver in Talmudic analysis, tasked with deriving practical guidance from multiple interpretations.
Your role is to:
- Identify key questions raised by the interpretations
- Propose practical rulings or guidance
- Acknowledge when multiple valid approaches exist
- Specify when each approach applies

The goal is practical wisdom (halacha), not theoretical unity.

Respond with valid JSON matching this structure:
{
  "resolutions": [
    {
      "question": "string",
      "practicalRuling": "string",
      "reasoning": "string",
      "minorityOpinion": "string (optional)",
      "whenToApply": "string"
    }
  ]
}`;

  const interpretationsSummary = interpretations.map(i =>
    `${i.interpreter}: ${i.interpretation}`
  ).join("\n\n");

  const user = `TEXT:
${problem.text}

${problem.specificQuestion ? `QUESTION:\n${problem.specificQuestion}\n` : ""}

INTERPRETATIONS:
${interpretationsSummary}

Based on these multiple valid interpretations, provide practical resolutions:
1. What are the key questions this text raises?
2. What is the practical ruling or guidance for each?
3. What is the reasoning?
4. Are there minority opinions to note?
5. When does each approach apply?`;

  return { system, user };
}

export function parseResolutionResponse(text: string, problem: TextualProblem, interpretations: Interpretation[]): Resolution[] {
  try {
    const result = parseJSON<{ resolutions: Resolution[] }>(text);
    return result.resolutions;
  } catch {
    return [{
      question: problem.specificQuestion || "What is the meaning of this text?",
      practicalRuling: "Multiple valid interpretations exist",
      reasoning: "The text supports multiple reasonable readings",
      minorityOpinion: interpretations.length > 1 ? interpretations[1].interpretation : undefined,
      whenToApply: "Context determines which interpretation applies",
    }];
  }
}

export async function generateResolution(
  problem: TextualProblem,
  interpretations: Interpretation[],
  counterpoints: CounterInterpretation[],
  config: TalmudicConfig,
  provider: LLMProvider
): Promise<Resolution[]> {
  const { system, user } = buildResolutionPrompt(problem, interpretations, counterpoints, config);

  try {
    const response = await provider.call({
      model: config.models.resolver,
      messages: [{ role: "user", content: user }],
      temperature: 0.5,
      systemPrompt: system,
      maxTokens: 4096,
    });
    return parseResolutionResponse(response.content, problem, interpretations);
  } catch (error) {
    console.warn("Resolution generation failed:", error);
    return [{
      question: problem.specificQuestion || "What is the meaning of this text?",
      practicalRuling: "Multiple valid interpretations exist",
      reasoning: "The text supports multiple reasonable readings",
      minorityOpinion: interpretations.length > 1 ? interpretations[1].interpretation : undefined,
      whenToApply: "Context determines which interpretation applies",
    }];
  }
}

export function extractInsights(
  interpretations: Interpretation[],
  counterpoints: CounterInterpretation[],
  resolutions: Resolution[]
): TalmudicInsight[] {
  const insights: TalmudicInsight[] = [];

  // Extract insights from interpretations
  interpretations.forEach(interp => {
    interp.implications.forEach(imp => {
      insights.push({
        insight: imp,
        derivedFrom: [interp.interpreter],
        broaderApplication: "Textual interpretation methodology",
      });
    });
  });

  // Extract insights from resolutions
  resolutions.forEach(res => {
    insights.push({
      insight: res.reasoning,
      derivedFrom: ["Practical resolution"],
      broaderApplication: "Decision-making under interpretive uncertainty",
    });
  });

  return insights.slice(0, 10); // Limit to top 10
}
