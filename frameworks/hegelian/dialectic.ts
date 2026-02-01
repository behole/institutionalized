import type { DialecticalProblem, HegelianConfig, Thesis, Antithesis, Synthesis } from "./types";
import { generateObject } from "@institutional-reasoning/core";

export async function generateThesis(
  problem: DialecticalProblem,
  config: HegelianConfig
): Promise<Thesis> {
  const model = config.models.thesis;
  
  const systemPrompt = `You are developing a THESIS in a Hegelian dialectic.
Your role is to articulate a coherent, well-reasoned position on the given problem.

Develop the thesis thoroughly:
- State the position clearly
- Provide strong rationale
- Identify supporting arguments
- Surface underlying assumptions

This should be a genuine, defensible position - not a strawman.`;

  const userPrompt = `PROBLEM CONTEXT:
${problem.context}

INITIAL THESIS:
${problem.thesis}

${problem.constraints ? `CONSTRAINTS:\n${problem.constraints.join("\n")}` : ""}

${problem.objectives ? `OBJECTIVES:\n${problem.objectives.join("\n")}` : ""}

Develop a comprehensive thesis position including:
1. Clear statement of position
2. Detailed rationale
3. Supporting arguments (3-5)
4. Underlying assumptions (2-3)`;

  try {
    return await generateObject<Thesis>({
      model,
      system: systemPrompt,
      prompt: userPrompt,
      temperature: config.parameters.temperature,
    });
  } catch (error) {
    console.warn("Thesis generation failed:", error);
    return {
      position: problem.thesis,
      rationale: "Unable to fully develop thesis",
      supportingArguments: ["Initial position stated"],
      underlyingAssumptions: ["Assumptions not fully explored"],
    };
  }
}

export async function generateAntithesis(
  problem: DialecticalProblem,
  thesis: Thesis,
  config: HegelianConfig
): Promise<Antithesis> {
  const model = config.models.antithesis;
  
  const systemPrompt = `You are developing an ANTITHESIS in a Hegelian dialectic.
Your role is to provide genuine, substantive opposition to the thesis.

This is NOT about being contrarian - it's about identifying:
- What the thesis misses or overlooks
- Valid counter-arguments
- Internal contradictions or tensions
- Alternative perspectives that have merit

The antithesis should be as intellectually rigorous as the thesis.`;

  const userPrompt = `PROBLEM CONTEXT:
${problem.context}

THESIS TO OPPOSE:
Position: ${thesis.position}
Rationale: ${thesis.rationale}
Supporting Arguments:
${thesis.supportingArguments.map((a, i) => `${i + 1}. ${a}`).join("\n")}

Underlying Assumptions:
${thesis.underlyingAssumptions.map((a, i) => `${i + 1}. ${a}`).join("\n")}

Develop a substantive antithesis including:
1. Clear opposing position
2. Rationale for opposition
3. Counter-arguments to each thesis point (3-5)
4. Contradictions or tensions identified in the thesis (2-4)`;

  try {
    return await generateObject<Antithesis>({
      model,
      system: systemPrompt,
      prompt: userPrompt,
      temperature: config.parameters.temperature,
    });
  } catch (error) {
    console.warn("Antithesis generation failed:", error);
    return {
      position: `Alternative to: ${thesis.position}`,
      rationale: "Opposition could not be fully developed",
      counterArguments: ["Thesis has limitations"],
      contradictionsIdentified: ["Some assumptions may be questionable"],
    };
  }
}

export async function generateSynthesis(
  problem: DialecticalProblem,
  thesis: Thesis,
  antithesis: Antithesis,
  config: HegelianConfig
): Promise<Synthesis> {
  const model = config.models.synthesis;
  
  const systemPrompt = `You are developing a SYNTHESIS in a Hegelian dialectic.
Your role is to achieve a higher-order integration of thesis and antithesis.

The synthesis should:
- Preserve what is valid from both thesis and antithesis
- Resolve the apparent contradiction between them
- Transcend both to reach a new, more comprehensive understanding
- Not be a mere compromise, but a genuine integration

This is the creative, integrative phase of dialectical reasoning.`;

  const userPrompt = `PROBLEM CONTEXT:
${problem.context}

THESIS:
Position: ${thesis.position}
Rationale: ${thesis.rationale}
Supporting Arguments: ${thesis.supportingArguments.join("; ")}

ANTITHESIS:
Position: ${antithesis.position}
Rationale: ${antithesis.rationale}
Counter-Arguments: ${antithesis.counterArguments.join("; ")}
Contradictions Identified: ${antithesis.contradictionsIdentified.join("; ")}

Develop a synthesis that:
1. States the integrated, higher-order position
2. Explains HOW it resolves the thesis-antithesis tension
3. Lists what it preserves from the thesis (2-3 elements)
4. Lists what it preserves from the antithesis (2-3 elements)
5. Identifies what new insights transcend both (2-4 elements)`;

  try {
    return await generateObject<Synthesis>({
      model,
      system: systemPrompt,
      prompt: userPrompt,
      temperature: config.parameters.temperature,
    });
  } catch (error) {
    console.warn("Synthesis generation failed:", error);
    return {
      integratedPosition: "Integration requires further development",
      howItResolves: "Thesis and antithesis both have valid points that need reconciliation",
      preservesFromThesis: thesis.supportingArguments.slice(0, 2),
      preservesFromAntithesis: antithesis.counterArguments.slice(0, 2),
      transcendsBoth: ["Both perspectives contain partial truths"],
    };
  }
}
