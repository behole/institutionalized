import type { TextualProblem, TalmudicConfig, Interpretation, CounterInterpretation, Resolution, TalmudicInsight } from "./types";
import { generateObject } from "@institutional-reasoning/core";

export async function generateInterpretation(
  problem: TextualProblem,
  interpreterName: string,
  config: TalmudicConfig
): Promise<Interpretation> {
  const model = config.models[interpreterName];
  
  const systemPrompt = `You are a textual interpreter engaging in Talmudic-style analysis.
Your role is to offer a distinct interpretation of the text, grounded in the text itself.

Key principles:
- Base your interpretation on specific textual evidence
- Provide reasoning for your interpretation
- Consider practical implications
- Respect the text while offering fresh insight

Your interpretation should be valid and defensible, even if other interpreters might disagree.`;

  const userPrompt = `TEXT TO INTERPRET:
${problem.text}

${problem.context ? `CONTEXT:\n${problem.context}\n` : ""}
${problem.specificQuestion ? `SPECIFIC QUESTION:\n${problem.specificQuestion}\n` : ""}
${problem.constraints ? `CONSTRAINTS:\n${problem.constraints.join("\n")}\n` : ""}

As ${interpreterName}, provide:
1. Your interpretation of the text
2. Specific textual support (quotes or references)
3. Your reasoning process
4. Practical implications of your interpretation`;

  try {
    return await generateObject<Interpretation>({
      model,
      system: systemPrompt,
      prompt: userPrompt,
      temperature: config.parameters.temperature,
    });
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

export async function generateCounterpoint(
  problem: TextualProblem,
  interpretation: Interpretation,
  opposingInterpretation: Interpretation,
  config: TalmudicConfig
): Promise<CounterInterpretation> {
  const model = config.models.resolver;
  
  const systemPrompt = `You are analyzing the relationship between two interpretations in Talmudic style.
Your role is to articulate why these interpretations differ and what evidence supports each view.

Focus on:
- Respectful engagement with both views
- Clear articulation of differences
- Textual basis for each position
- Why reasonable people might disagree`;

  const userPrompt = `TEXT:
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

  try {
    return await generateObject<CounterInterpretation>({
      model,
      system: systemPrompt,
      prompt: userPrompt,
      temperature: 0.6,
    });
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

export async function generateResolution(
  problem: TextualProblem,
  interpretations: Interpretation[],
  counterpoints: CounterInterpretation[],
  config: TalmudicConfig
): Promise<Resolution[]> {
  const model = config.models.resolver;
  
  const systemPrompt = `You are a resolver in Talmudic analysis, tasked with deriving practical guidance from multiple interpretations.
Your role is to:
- Identify key questions raised by the interpretations
- Propose practical rulings or guidance
- Acknowledge when multiple valid approaches exist
- Specify when each approach applies

The goal is practical wisdom (halacha), not theoretical unity.`;

  const interpretationsSummary = interpretations.map(i => 
    `${i.interpreter}: ${i.interpretation}`
  ).join("\n\n");

  const userPrompt = `TEXT:
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

  try {
    const result = await generateObject<{
      resolutions: Resolution[];
    }>({
      model,
      system: systemPrompt,
      prompt: userPrompt,
      temperature: 0.5,
    });

    return result.resolutions;
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
