import type { TextualProblem, TalmudicResult, TalmudicConfig, Interpretation, CounterInterpretation, Resolution, TalmudicInsight } from "./types";
import { DEFAULT_CONFIG } from "./types";
import { generateInterpretation, generateCounterpoint, generateResolution, extractInsights } from "./interpreters";

export async function runTalmudicAnalysis(
  problem: TextualProblem,
  config: TalmudicConfig = DEFAULT_CONFIG
): Promise<TalmudicResult> {
  const startTime = Date.now();

  console.log("\n" + "=".repeat(80));
  console.log("📜 TALMUDIC DIALECTIC");
  console.log("=".repeat(80));
  console.log(`\n📜 Text: ${problem.text.substring(0, 100)}${problem.text.length > 100 ? "..." : ""}`);
  if (problem.specificQuestion) {
    console.log(`   Question: ${problem.specificQuestion}`);
  }
  console.log();

  // Step 1: Generate multiple interpretations
  console.log("📜 Phase 1: Multiple Interpretations");
  const interpretations: Interpretation[] = [];
  const interpreterNames = Object.keys(config.models).filter(k => k.startsWith("interpreter"));
  
  for (let i = 0; i < config.parameters.interpreterCount && i < interpreterNames.length; i++) {
    const interpreterName = interpreterNames[i];
    console.log(`   📖 ${interpreterName} interpreting...`);
    const interpretation = await generateInterpretation(problem, interpreterName, config);
    interpretations.push(interpretation);
    console.log(`   ✅ ${interpreterName}: ${interpretation.interpretation.substring(0, 50)}...`);
  }

  // Step 2: Generate counterpoints between interpretations
  console.log("\n📜 Phase 2: Counterpoints and Debate");
  const counterpoints: CounterInterpretation[] = [];
  
  for (let i = 0; i < interpretations.length; i++) {
    for (let j = 0; j < interpretations.length; j++) {
      if (i !== j) {
        const counterpoint = await generateCounterpoint(
          problem,
          interpretations[i],
          interpretations[j],
          config
        );
        counterpoints.push(counterpoint);
      }
    }
  }
  console.log(`   ✅ ${counterpoints.length} counterpoints generated`);

  // Step 3: Generate practical resolutions
  console.log("\n📜 Phase 3: Practical Resolutions");
  const resolutions = await generateResolution(problem, interpretations, counterpoints, config);
  console.log(`   ✅ ${resolutions.length} resolutions proposed`);

  // Step 4: Extract insights
  const insights = extractInsights(interpretations, counterpoints, resolutions);

  const duration = Date.now() - startTime;
  const costUSD = 0.0; // Placeholder

  console.log("\n" + "=".repeat(80));
  console.log(`🎯 ANALYSIS COMPLETE`);
  console.log(`   Interpretations: ${interpretations.length}`);
  console.log(`   Counterpoints: ${counterpoints.length}`);
  console.log(`   Resolutions: ${resolutions.length}`);
  console.log(`   Insights: ${insights.length}`);
  console.log(`\n⏱️  Duration: ${(duration / 1000).toFixed(1)}s`);
  console.log("=".repeat(80) + "\n");

  // Display interpretations
  console.log("📊 INTERPRETATIONS\n");
  interpretations.forEach((interp, i) => {
    console.log(`${i + 1}. ${interp.interpreter}:`);
    console.log(`   ${interp.interpretation}`);
    console.log(`   Textual Support: ${interp.textualSupport.length} points`);
    console.log();
  });

  // Display resolutions
  console.log("📊 PRACTICAL RESOLUTIONS\n");
  resolutions.forEach((res, i) => {
    console.log(`${i + 1}. ${res.question}`);
    console.log(`   Ruling: ${res.practicalRuling}`);
    console.log(`   Reasoning: ${res.reasoning}`);
    if (res.minorityOpinion) {
      console.log(`   Minority View: ${res.minorityOpinion}`);
    }
    console.log();
  });

  return {
    problem,
    interpretations,
    counterpoints,
    resolutions,
    insights,
    metadata: {
      timestamp: new Date().toISOString(),
      duration,
      costUSD,
      modelUsage: config.models,
    },
  };
}
