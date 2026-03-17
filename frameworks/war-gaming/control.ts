import type { Scenario, WarGamingConfig, ForceDeployment, Turn, ForceAction } from "./types";
import { parseJSON } from "@core/orchestrator";
import type { LLMProvider } from "@core/types";

export function buildForceActionPrompt(
  scenario: Scenario,
  force: ForceDeployment,
  previousTurns: Turn[],
  turnNumber: number,
  config: WarGamingConfig
): { system: string; user: string } {
  const system = `You are ${force.force.name} in a war gaming simulation.
Your strategy: ${force.force.strategy}
Your resources: ${force.force.resources.join(", ")}
Your constraints: ${force.force.constraints.join(", ")}

Make strategic decisions that align with your capabilities and objectives.

Respond with valid JSON matching this structure:
{
  "forceName": "string",
  "action": "string",
  "rationale": "string",
  "expectedOutcome": "string"
}`;

  const turnHistory = previousTurns.length > 0
    ? `PREVIOUS ACTIONS:\n${previousTurns.map(t =>
        `Turn ${t.turnNumber}: ${t.forceActions.map(a => `${a.forceName}: ${a.action}`).join("; ")}`
      ).join("\n")}`
    : "No previous actions.";

  const user = `SCENARIO: ${scenario.description}

YOUR FORCE: ${force.force.name}
INITIAL POSITION: ${force.initialPosition}
OPENING MOVES: ${force.openingMoves.join(", ")}

${turnHistory}

CURRENT TURN: ${turnNumber}

What action do you take this turn? Provide:
1. The specific action
2. Your strategic rationale
3. Your expected outcome`;

  return { system, user };
}

export function parseForceActionResponse(text: string, force: ForceDeployment): ForceAction {
  try {
    return parseJSON<ForceAction>(text);
  } catch {
    return {
      forceName: force.force.name,
      action: "Maintain current position",
      rationale: "Conservative approach due to uncertainty",
      expectedOutcome: "Preserve current state",
    };
  }
}

export function buildControlAssessmentPrompt(
  scenario: Scenario,
  forceActions: ForceAction[],
  previousTurns: Turn[],
  turnNumber: number,
  config: WarGamingConfig
): { system: string; user: string } {
  const system = `You are the Game Control for a war gaming simulation.
Your role is to:
1. Assess the current state of play after all forces have acted
2. Identify emerging threats and opportunities
3. Determine if the game should continue or end

Be objective and strategic in your assessment.

Respond with valid JSON matching this structure:
{
  "controlAssessment": "string",
  "emergingThreats": ["string"]
}`;

  const previousContext = previousTurns.length > 0
    ? `PREVIOUS TURNS:\n${previousTurns.map(t => `Turn ${t.turnNumber}: ${t.controlAssessment}`).join("\n")}`
    : "This is the first turn.";

  const user = `SCENARIO: ${scenario.description}

${previousContext}

CURRENT TURN ${turnNumber}:
${forceActions.map(a => `${a.forceName}: ${a.action} (${a.rationale})`).join("\n")}

Assess the current state:
1. What is the overall situation?
2. What new threats are emerging?
3. Should the game continue or end (include GAME_OVER if decisive)?`;

  return { system, user };
}

export function parseControlAssessmentResponse(
  text: string,
  turnNumber: number,
  forceActions: ForceAction[]
): Turn {
  try {
    const assessment = parseJSON<{ controlAssessment: string; emergingThreats: string[] }>(text);
    return {
      turnNumber,
      forceActions,
      controlAssessment: assessment.controlAssessment,
      emergingThreats: assessment.emergingThreats,
    };
  } catch {
    return {
      turnNumber,
      forceActions,
      controlAssessment: "Assessment unavailable",
      emergingThreats: [],
    };
  }
}

export async function simulateTurn(
  scenario: Scenario,
  forces: ForceDeployment[],
  previousTurns: Turn[],
  turnNumber: number,
  config: WarGamingConfig,
  provider: LLMProvider
): Promise<Turn> {
  // First, get actions from each force
  const forceActions: ForceAction[] = [];

  for (const force of forces) {
    const { system, user } = buildForceActionPrompt(scenario, force, previousTurns, turnNumber, config);
    const model = config.models[force.force.name] || config.models.control;

    try {
      const response = await provider.call({
        model,
        messages: [{ role: "user", content: user }],
        temperature: config.parameters.temperature,
        systemPrompt: system,
        maxTokens: 4096,
      });
      forceActions.push(parseForceActionResponse(response.content, force));
    } catch (error) {
      console.warn(`Failed to get action for ${force.force.name}:`, error);
      forceActions.push({
        forceName: force.force.name,
        action: "Maintain current position",
        rationale: "Conservative approach due to uncertainty",
        expectedOutcome: "Preserve current state",
      });
    }
  }

  // Then, have control assess the turn
  const { system, user } = buildControlAssessmentPrompt(scenario, forceActions, previousTurns, turnNumber, config);

  try {
    const response = await provider.call({
      model: config.models.control,
      messages: [{ role: "user", content: user }],
      temperature: 0.5,
      systemPrompt: system,
      maxTokens: 4096,
    });
    return parseControlAssessmentResponse(response.content, turnNumber, forceActions);
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
