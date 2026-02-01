import type { Scenario, WarGamingConfig, ForceDeployment, Force } from "./types";
import { generateObject } from "@institutional-reasoning/core";

export async function deployForces(
  scenario: Scenario,
  config: WarGamingConfig
): Promise<ForceDeployment[]> {
  const forceNames = Object.keys(config.models).filter(k => k !== "control" && k !== "observer");
  const deployments: ForceDeployment[] = [];

  for (const forceName of forceNames) {
    const model = config.models[forceName];
    
    const systemPrompt = `You are a military strategist deploying forces for a war game simulation.
Your task is to define a ${forceName} with clear strategy, resources, and constraints.

Be creative but grounded. Consider the scenario context and define a force that would create interesting strategic dynamics.`;

    const userPrompt = `SCENARIO: ${scenario.description}

CONTEXT:
${scenario.context?.join("\n") || "No additional context provided"}

CONSTRAINTS:
${scenario.constraints?.join("\n") || "No specific constraints"}

OBJECTIVES:
${scenario.objectives?.join("\n") || "Achieve strategic advantage"}

Define the ${forceName} deployment:
1. What is their overall strategy?
2. What resources do they have?
3. What constraints limit them?
4. What is their initial position?
5. What are their opening moves?`;

    try {
      const deployment = await generateObject<ForceDeployment>({
        model,
        system: systemPrompt,
        prompt: userPrompt,
        temperature: config.parameters.temperature,
      });

      deployments.push(deployment);
    } catch (error) {
      console.warn(`Failed to deploy ${forceName}:`, error);
      // Fallback deployment
      deployments.push({
        force: {
          name: forceName,
          strategy: "Adaptive defense with opportunistic offense",
          resources: ["Standard equipment", "Personnel", "Intelligence"],
          constraints: ["Limited resources", "Time pressure"],
        },
        initialPosition: "Defensive stance",
        openingMoves: ["Assess situation", "Secure position"],
      });
    }
  }

  return deployments;
}
