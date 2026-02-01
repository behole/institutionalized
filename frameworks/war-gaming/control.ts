import type { Scenario, WarGamingConfig, ForceDeployment, Turn, ForceAction } from "./types";
import { generateObject } from "@institutional-reasoning/core";

export async function simulateTurn(
  scenario: Scenario,
  forces: ForceDeployment[],
  previousTurns: Turn[],
  turnNumber: number,
  config: WarGamingConfig
): Promise<Turn> {
  const model = config.models.control;
  
  // First, get actions from each force
  const forceActions: ForceAction[] = [];
  
  for (const force of forces) {
    const action = await getForceAction(scenario, force, previousTurns, turnNumber, config);
    forceActions.push(action);
  }

  // Then, have control assess the turn
  const systemPrompt = `You are the Game Control for a war gaming simulation.
Your role is to:
1. Assess the current state of play after all forces have acted
2. Identify emerging threats and opportunities
3. Determine if the game should continue or end

Be objective and strategic in your assessment.`;

  const previousContext = previousTurns.length > 0 
    ? `PREVIOUS TURNS:\n${previousTurns.map(t => `Turn ${t.turnNumber}: ${t.controlAssessment}`).join("\n")}`
    : "This is the first turn.";

  const userPrompt = `SCENARIO: ${scenario.description}

${previousContext}

CURRENT TURN ${turnNumber}:
${forceActions.map(a => `${a.forceName}: ${a.action} (${a.rationale})`).join("\n")}

Assess the current state:
1. What is the overall situation?
2. What new threats are emerging?
3. Should the game continue or end (include GAME_OVER if decisive)?`;

  try {
    const assessment = await generateObject<{
      controlAssessment: string;
      emergingThreats: string[];
    }>({
      model,
      system: systemPrompt,
      prompt: userPrompt,
      temperature: 0.5,
    });

    return {
      turnNumber,
      forceActions,
      controlAssessment: assessment.controlAssessment,
      emergingThreats: assessment.emergingThreats,
    };
  } catch (error) {
    console.warn(`Control assessment failed for turn ${turnNumber}:`, error);
    return {
      turnNumber,
      forceActions,
      controlAssessment: "Assessment unavailable",
      emergingThreats: [],
    };
  }
}

async function getForceAction(
  scenario: Scenario,
  force: ForceDeployment,
  previousTurns: Turn[],
  turnNumber: number,
  config: WarGamingConfig
): Promise<ForceAction> {
  const model = config.models[force.force.name] || config.models.control;
  
  const systemPrompt = `You are ${force.force.name} in a war gaming simulation.
Your strategy: ${force.force.strategy}
Your resources: ${force.force.resources.join(", ")}
Your constraints: ${force.force.constraints.join(", ")}

Make strategic decisions that align with your capabilities and objectives.`;

  const turnHistory = previousTurns.length > 0
    ? `PREVIOUS ACTIONS:\n${previousTurns.map(t => 
        `Turn ${t.turnNumber}: ${t.forceActions.map(a => `${a.forceName}: ${a.action}`).join("; ")}`
      ).join("\n")}`
    : "No previous actions.";

  const userPrompt = `SCENARIO: ${scenario.description}

YOUR FORCE: ${force.force.name}
INITIAL POSITION: ${force.initialPosition}
OPENING MOVES: ${force.openingMoves.join(", ")}

${turnHistory}

CURRENT TURN: ${turnNumber}

What action do you take this turn? Provide:
1. The specific action
2. Your strategic rationale
3. Your expected outcome`;

  try {
    return await generateObject<ForceAction>({
      model,
      system: systemPrompt,
      prompt: userPrompt,
      temperature: config.parameters.temperature,
    });
  } catch (error) {
    console.warn(`Failed to get action for ${force.force.name}:`, error);
    return {
      forceName: force.force.name,
      action: "Maintain current position",
      rationale: "Conservative approach due to uncertainty",
      expectedOutcome: "Preserve current state",
    };
  }
}
