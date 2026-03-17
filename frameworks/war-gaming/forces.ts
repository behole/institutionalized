import type { Scenario, WarGamingConfig, ForceDeployment } from "./types";
import { parseJSON } from "@core/orchestrator";
import type { LLMProvider } from "@core/types";

export function buildForceDeploymentPrompt(
  scenario: Scenario,
  forceName: string,
  config: WarGamingConfig
): { system: string; user: string } {
  const system = `You are a military strategist deploying forces for a war game simulation.
Your task is to define a ${forceName} with clear strategy, resources, and constraints.

Be creative but grounded. Consider the scenario context and define a force that would create interesting strategic dynamics.

Respond with valid JSON matching this structure:
{
  "force": {
    "name": "string",
    "strategy": "string",
    "resources": ["string"],
    "constraints": ["string"]
  },
  "initialPosition": "string",
  "openingMoves": ["string"]
}`;

  const user = `SCENARIO: ${scenario.description}

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

  return { system, user };
}

export function parseForceDeploymentResponse(text: string, forceName: string): ForceDeployment {
  try {
    return parseJSON<ForceDeployment>(text);
  } catch {
    return {
      force: {
        name: forceName,
        strategy: "Adaptive defense with opportunistic offense",
        resources: ["Standard equipment", "Personnel", "Intelligence"],
        constraints: ["Limited resources", "Time pressure"],
      },
      initialPosition: "Defensive stance",
      openingMoves: ["Assess situation", "Secure position"],
    };
  }
}

export async function deployForces(
  scenario: Scenario,
  config: WarGamingConfig,
  provider: LLMProvider
): Promise<ForceDeployment[]> {
  const forceNames = Object.keys(config.models).filter(k => k !== "control" && k !== "observer");
  const deployments: ForceDeployment[] = [];

  for (const forceName of forceNames) {
    const { system, user } = buildForceDeploymentPrompt(scenario, forceName, config);

    try {
      const response = await provider.call({
        model: config.models[forceName],
        messages: [{ role: "user", content: user }],
        temperature: config.parameters.temperature,
        systemPrompt: system,
        maxTokens: 4096,
      });

      deployments.push(parseForceDeploymentResponse(response.content, forceName));
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
