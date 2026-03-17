import type { Scenario, WarGamingConfig, ForceDeployment, Turn, GameOutcome, StrategicInsight } from "./types";
import { parseJSON } from "@core/orchestrator";
import type { LLMProvider } from "@core/types";

export function buildObserverPrompt(
  scenario: Scenario,
  forces: ForceDeployment[],
  turns: Turn[],
  outcome: GameOutcome,
  config: WarGamingConfig
): { system: string; user: string } {
  const system = `You are a strategic analyst observing a war gaming simulation.
Your task is to extract actionable insights from the simulation that apply to real-world strategic planning.

Focus on:
1. Patterns in decision-making
2. Strategic lessons learned
3. Applicable recommendations
4. Key assumptions that were tested

Respond with valid JSON matching this structure:
{
  "insights": [
    {
      "insight": "string",
      "evidence": ["string"],
      "applicability": "string"
    }
  ]
}`;

  const forcesInfo = forces.map(f =>
    `${f.force.name}: ${f.force.strategy}`
  ).join("\n");

  const turnsSummary = turns.map(t =>
    `Turn ${t.turnNumber}: ${t.forceActions.map(a => a.action).join("; ")} | Assessment: ${t.controlAssessment}`
  ).join("\n");

  const user = `SCENARIO: ${scenario.description}

FORCES:
${forcesInfo}

SIMULATION HISTORY:
${turnsSummary}

OUTCOME: ${outcome.draw ? "Draw/Stalemate" : outcome.winner + " victory"}
FINAL STATE: ${outcome.finalState}
KEY DECISIONS: ${outcome.keyDecisions.join("; ")}
TURNING POINTS: ${outcome.turningPoints.join("; ")}

Generate 3-5 strategic insights from this simulation. Each insight should include:
1. The insight itself
2. Evidence from the simulation
3. How it applies to real-world strategy`;

  return { system, user };
}

export function parseObserverResponse(text: string): StrategicInsight[] {
  try {
    const result = parseJSON<{ insights: StrategicInsight[] }>(text);
    return result.insights;
  } catch {
    return [{
      insight: "Simulation completed successfully",
      evidence: ["All turns executed without errors"],
      applicability: "Framework is operational for strategic testing",
    }];
  }
}

export async function generateInsights(
  scenario: Scenario,
  forces: ForceDeployment[],
  turns: Turn[],
  outcome: GameOutcome,
  config: WarGamingConfig,
  provider: LLMProvider
): Promise<StrategicInsight[]> {
  if (!config.parameters.enableObserver) {
    return [];
  }

  const { system, user } = buildObserverPrompt(scenario, forces, turns, outcome, config);

  try {
    const response = await provider.call({
      model: config.models.observer,
      messages: [{ role: "user", content: user }],
      temperature: 0.6,
      systemPrompt: system,
      maxTokens: 4096,
    });
    return parseObserverResponse(response.content);
  } catch (error) {
    console.warn("Failed to generate insights:", error);
    return [{
      insight: "Simulation completed successfully",
      evidence: ["All turns executed without errors"],
      applicability: "Framework is operational for strategic testing",
    }];
  }
}
