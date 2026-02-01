import type { Scenario, WarGamingResult, WarGamingConfig, ForceDeployment, Turn, GameOutcome, StrategicInsight } from "./types";
import { DEFAULT_CONFIG } from "./types";
import { deployForces } from "./forces";
import { simulateTurn } from "./control";
import { generateInsights } from "./observer";

export async function runWarGaming(
  scenario: Scenario,
  config: WarGamingConfig = DEFAULT_CONFIG
): Promise<WarGamingResult> {
  const startTime = Date.now();

  console.log("\n" + "=".repeat(80));
  console.log("🎖️  WAR GAMING SIMULATION");
  console.log("=".repeat(80));
  console.log(`\n📋 Scenario: ${scenario.description}\n`);

  // Step 1: Deploy forces
  console.log("🎖️  Phase 1: Force Deployment");
  const forces = await deployForces(scenario, config);
  console.log(`   ✅ ${forces.length} forces deployed`);
  forces.forEach(f => console.log(`      • ${f.force.name}`));

  // Step 2: Simulate turns
  console.log(`\n🎖️  Phase 2: Simulation (${config.parameters.maxTurns} turns max)`);
  const turns: Turn[] = [];
  let gameComplete = false;

  for (let turnNum = 1; turnNum <= config.parameters.maxTurns && !gameComplete; turnNum++) {
    console.log(`\n   Turn ${turnNum}:`);
    const turn = await simulateTurn(scenario, forces, turns, turnNum, config);
    turns.push(turn);
    
    // Check for game end conditions
    if (turn.emergingThreats.includes("GAME_OVER") || turnNum === config.parameters.maxTurns) {
      gameComplete = true;
    }
  }

  // Step 3: Determine outcome
  console.log("\n🎖️  Phase 3: Outcome Analysis");
  const outcome = determineOutcome(forces, turns);
  console.log(`   ✅ Outcome: ${outcome.draw ? "Draw" : outcome.winner + " wins"}`);

  // Step 4: Generate strategic insights
  console.log("\n🎖️  Phase 4: Strategic Insights");
  const insights = await generateInsights(scenario, forces, turns, outcome, config);
  console.log(`   ✅ ${insights.length} strategic insights generated`);

  const duration = Date.now() - startTime;
  const costUSD = 0.0; // Placeholder

  console.log("\n" + "=".repeat(80));
  console.log(`🎯 SIMULATION COMPLETE`);
  console.log(`   Outcome: ${outcome.draw ? "DRAW" : outcome.winner?.toUpperCase() + " VICTORY"}`);
  console.log(`   Turns: ${turns.length}`);
  console.log(`   Insights: ${insights.length}`);
  console.log(`\n⏱️  Duration: ${(duration / 1000).toFixed(1)}s`);
  console.log("=".repeat(80) + "\n");

  return {
    scenario,
    forces,
    turns,
    outcome,
    insights,
    recommendations: insights.map(i => i.applicability),
    metadata: {
      timestamp: new Date().toISOString(),
      duration,
      costUSD,
      turnsSimulated: turns.length,
      modelUsage: config.models,
    },
  };
}

function determineOutcome(
  forces: ForceDeployment[],
  turns: Turn[]
): GameOutcome {
  // Simple outcome determination based on final turn
  const lastTurn = turns[turns.length - 1];
  
  // Check for decisive victory
  if (lastTurn.emergingThreats.includes("DECISIVE_VICTORY")) {
    const winner = lastTurn.forceActions[0]?.forceName || "unknown";
    return {
      winner,
      draw: false,
      finalState: "Decisive victory achieved",
      keyDecisions: turns.flatMap(t => t.forceActions.map(a => a.action)),
      turningPoints: lastTurn.emergingThreats.filter(t => t !== "GAME_OVER" && t !== "DECISIVE_VICTORY"),
    };
  }

  // Check for draw/stalemate
  if (lastTurn.emergingThreats.includes("STALEMATE") || turns.length >= 5) {
    return {
      draw: true,
      finalState: "Stalemate reached or maximum turns exceeded",
      keyDecisions: turns.flatMap(t => t.forceActions.map(a => a.action)),
      turningPoints: lastTurn.emergingThreats.filter(t => t !== "GAME_OVER" && t !== "STALEMATE"),
    };
  }

  // Default: assess based on last actions
  return {
    draw: true,
    finalState: "Simulation ended without clear resolution",
    keyDecisions: turns.flatMap(t => t.forceActions.map(a => a.action)),
    turningPoints: [],
  };
}
