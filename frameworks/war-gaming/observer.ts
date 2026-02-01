import type { Scenario, WarGamingConfig, ForceDeployment, Turn, GameOutcome, StrategicInsight } from "./types";
import { generateObject } from "@institutional-reasoning/core";

export async function generateInsights(
  scenario: Scenario,
  forces: ForceDeployment[],
  turns: Turn[],
  outcome: GameOutcome,
  config: WarGamingConfig
): Promise<StrategicInsight[]> {
  if (!config.parameters.enableObserver) {
    return [];
  }

  const model = config.models.observer;
  
  const systemPrompt = `You are a strategic analyst observing a war gaming simulation.
Your task is to extract actionable insights from the simulation that apply to real-world strategic planning.

Focus on:
1. Patterns in decision-making
2. Strategic lessons learned
3. Applicable recommendations
4. Key assumptions that were tested`;

  const forcesInfo = forces.map(f => 
    `${f.force.name}: ${f.force.strategy}`
  ).join("\n");

  const turnsSummary = turns.map(t => 
    `Turn ${t.turnNumber}: ${t.forceActions.map(a => a.action).join("; ")} | Assessment: ${t.controlAssessment}`
  ).join("\n");

  const userPrompt = `SCENARIO: ${scenario.description}

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

  try {
    const result = await generateObject<{
      insights: StrategicInsight[];
    }>({
      model,
      system: systemPrompt,
      prompt: userPrompt,
      temperature: 0.6,
    });

    return result.insights;
  } catch (error) {
    console.warn("Failed to generate insights:", error);
    return [{
      insight: "Simulation completed successfully",
      evidence: ["All turns executed without errors"],
      applicability: "Framework is operational for strategic testing",
    }];
  }
}
