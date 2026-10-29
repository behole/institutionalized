/**
 * War Gaming Framework — engine port.
 *
 * Flow: sequential force deployment → turn loop (per-force actions + control
 * assessment) → outcome determination → optional observer insights.
 * Prompt/parse content lives in forces.ts/control.ts/observer.ts, untouched.
 * All provider/audit/logging concerns owned by the engine.
 */
import type { EventSink } from '@core/engine';
import { defineFramework } from '@core/engine';
import type { RunFlags } from '@core/types';
import type {
  Scenario,
  WarGamingResult,
  WarGamingConfig,
  ForceDeployment,
  Turn,
  ForceAction,
  GameOutcome,
  StrategicInsight,
} from './types';
import { DEFAULT_CONFIG } from './types';
import { buildForceDeploymentPrompt, parseForceDeploymentResponse } from './forces';
import {
  buildForceActionPrompt,
  parseForceActionResponse,
  buildControlAssessmentPrompt,
  parseControlAssessmentResponse,
} from './control';
import { buildObserverPrompt, parseObserverResponse } from './observer';

export const warGaming = defineFramework<Scenario | { content: string }, WarGamingResult>({
  name: 'war-gaming',
  description:
    'Military-style scenario testing: force deployment, turn-based simulation with control assessment, outcome and insights',
  normalize(raw) {
    if (typeof raw === 'object' && raw !== null && 'description' in raw) {
      return raw as Scenario;
    }
    const content = (raw as { content?: string })?.content ?? '';
    return { description: content, context: [] };
  },
  async run(scenarioInput, session) {
    const scenario = scenarioInput as Scenario;
    const config: WarGamingConfig = {
      ...DEFAULT_CONFIG,
      ...(session.flags.config as Partial<WarGamingConfig> | undefined),
    };

    // Engine model override wins over legacy per-role config models.
    const explicitModel = session.models.override;
    if (explicitModel) {
      for (const key of Object.keys(config.models)) {
        config.models[key] = explicitModel;
      }
    }

    // Phase 1: Force deployment
    session.phase('Force Deployment');
    const forceNames = Object.keys(config.models).filter(
      (k) => k !== 'control' && k !== 'observer'
    );
    const forces: ForceDeployment[] = [];

    for (const forceName of forceNames) {
      const { system, user } = buildForceDeploymentPrompt(scenario, forceName, config);
      try {
        const response = await session.step({
          name: `deploy-${forceName}`,
          prompt: user,
          model: config.models[forceName],
          temperature: config.parameters.temperature,
          maxTokens: 4096,
          systemPrompt: system,
        });
        forces.push(parseForceDeploymentResponse(response.content, forceName));
      } catch (error) {
        session.note(
          `Failed to deploy ${forceName}: ${error instanceof Error ? error.message : String(error)}`
        );
        forces.push({
          force: {
            name: forceName,
            strategy: 'Adaptive defense with opportunistic offense',
            resources: ['Standard equipment', 'Personnel', 'Intelligence'],
            constraints: ['Limited resources', 'Time pressure'],
          },
          initialPosition: 'Defensive stance',
          openingMoves: ['Assess situation', 'Secure position'],
        });
      }
    }
    session.note(`${forces.length} forces deployed: ${forces.map((f) => f.force.name).join(', ')}`);

    // Phase 2: Simulation turns
    session.phase('Simulation', `${config.parameters.maxTurns} turns max`);
    const turns: Turn[] = [];
    let gameComplete = false;

    for (let turnNum = 1; turnNum <= config.parameters.maxTurns && !gameComplete; turnNum++) {
      // Get actions from each force
      const forceActions: ForceAction[] = [];
      for (const force of forces) {
        const { system, user } = buildForceActionPrompt(scenario, force, turns, turnNum, config);
        const model = config.models[force.force.name] || config.models.control;
        try {
          const response = await session.step({
            name: `turn-${turnNum}-${force.force.name}`,
            prompt: user,
            model,
            temperature: config.parameters.temperature,
            maxTokens: 4096,
            systemPrompt: system,
          });
          forceActions.push(parseForceActionResponse(response.content, force));
        } catch (error) {
          session.note(
            `Failed to get action for ${force.force.name}: ${error instanceof Error ? error.message : String(error)}`
          );
          forceActions.push({
            forceName: force.force.name,
            action: 'Maintain current position',
            rationale: 'Conservative approach due to uncertainty',
            expectedOutcome: 'Preserve current state',
          });
        }
      }

      // Control assessment
      const { system: controlSystem, user: controlUser } = buildControlAssessmentPrompt(
        scenario,
        forceActions,
        turns,
        turnNum,
        config
      );
      try {
        const controlResponse = await session.step({
          name: `turn-${turnNum}-control`,
          prompt: controlUser,
          model: config.models.control,
          temperature: 0.5,
          maxTokens: 4096,
          systemPrompt: controlSystem,
        });
        const turn = parseControlAssessmentResponse(controlResponse.content, turnNum, forceActions);
        turns.push(turn);

        // Check for game end conditions
        if (turn.emergingThreats.includes('GAME_OVER') || turnNum === config.parameters.maxTurns) {
          gameComplete = true;
        }
      } catch (error) {
        session.note(
          `Control assessment failed for turn ${turnNum}: ${error instanceof Error ? error.message : String(error)}`
        );
        turns.push({
          turnNumber: turnNum,
          forceActions,
          controlAssessment: 'Assessment unavailable',
          emergingThreats: [],
        });
      }
    }

    // Phase 3: Outcome analysis
    session.phase('Outcome Analysis');
    const outcome = determineOutcome(forces, turns);
    session.note(`Outcome: ${outcome.draw ? 'Draw' : `${outcome.winner} wins`}`);

    // Phase 4: Strategic insights (conditional observer)
    session.phase('Strategic Insights');
    let insights: StrategicInsight[] = [];
    if (config.parameters.enableObserver) {
      const { system, user } = buildObserverPrompt(scenario, forces, turns, outcome, config);
      try {
        const observerResponse = await session.step({
          name: 'observer',
          prompt: user,
          model: config.models.observer,
          temperature: 0.6,
          maxTokens: 4096,
          systemPrompt: system,
        });
        insights = parseObserverResponse(observerResponse.content);
      } catch (error) {
        session.note(
          `Failed to generate insights: ${error instanceof Error ? error.message : String(error)}`
        );
        insights = [
          {
            insight: 'Simulation completed successfully',
            evidence: ['All turns executed without errors'],
            applicability: 'Framework is operational for strategic testing',
          },
        ];
      }
    }
    session.note(`${insights.length} strategic insights generated`);

    return {
      scenario,
      forces,
      turns,
      outcome,
      insights,
      recommendations: insights.map((i) => i.applicability),
      metadata: {
        timestamp: new Date().toISOString(),
        duration: 0, // engine records duration; audit log carries timings
        costUSD: 0, // replaced from audit log below
        turnsSimulated: turns.length,
        modelUsage: config.models,
        decision: 'unclear',
      },
    };
  },
});

/** Backward-compatible entry returning the bare result. */
export async function run(
  input: Scenario | { content: string },
  flags: RunFlags = {},
  sinks: EventSink[] = []
): Promise<WarGamingResult> {
  const { result, auditLog } = await warGaming(input, flags, sinks);
  result.metadata.costUSD = auditLog.metadata.totalCost;
  return result;
}

export { runWarGaming } from './orchestrator';
export * from './types';

function determineOutcome(forces: ForceDeployment[], turns: Turn[]): GameOutcome {
  // Simple outcome determination based on final turn
  const lastTurn = turns[turns.length - 1];

  // Check for decisive victory
  if (lastTurn.emergingThreats.includes('DECISIVE_VICTORY')) {
    const winner = lastTurn.forceActions[0]?.forceName || 'unknown';
    return {
      winner,
      draw: false,
      finalState: 'Decisive victory achieved',
      keyDecisions: turns.flatMap((t) => t.forceActions.map((a) => a.action)),
      turningPoints: lastTurn.emergingThreats.filter(
        (t) => t !== 'GAME_OVER' && t !== 'DECISIVE_VICTORY'
      ),
    };
  }

  // Check for draw/stalemate
  if (lastTurn.emergingThreats.includes('STALEMATE') || turns.length >= 5) {
    return {
      draw: true,
      finalState: 'Stalemate reached or maximum turns exceeded',
      keyDecisions: turns.flatMap((t) => t.forceActions.map((a) => a.action)),
      turningPoints: lastTurn.emergingThreats.filter((t) => t !== 'GAME_OVER' && t !== 'STALEMATE'),
    };
  }

  // Default: assess based on last actions
  return {
    draw: true,
    finalState: 'Simulation ended without clear resolution',
    keyDecisions: turns.flatMap((t) => t.forceActions.map((a) => a.action)),
    turningPoints: [],
  };
}
