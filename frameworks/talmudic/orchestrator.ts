import { FrameworkRunner } from "@core/orchestrator";
import type { LLMProvider } from "@core/types";
import type { TextualProblem, TalmudicResult, TalmudicConfig, Interpretation, CounterInterpretation, Resolution, TalmudicInsight } from "./types";
import { DEFAULT_CONFIG } from "./types";
import {
  buildInterpretationPrompt, parseInterpretationResponse,
  buildCounterpointPrompt, parseCounterpointResponse,
  buildResolutionPrompt, parseResolutionResponse,
  extractInsights
} from "./interpreters";

export async function runTalmudicAnalysis(
  problem: TextualProblem,
  config: TalmudicConfig = DEFAULT_CONFIG,
  provider: LLMProvider
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

  const runner = new FrameworkRunner<TextualProblem, TalmudicResult>("talmudic", problem);

  // Step 1: Generate multiple interpretations
  console.log("📜 Phase 1: Multiple Interpretations");
  const interpretations: Interpretation[] = [];
  const interpreterNames = Object.keys(config.models).filter(k => k.startsWith("interpreter"));

  for (let i = 0; i < config.parameters.interpreterCount && i < interpreterNames.length; i++) {
    const interpreterName = interpreterNames[i];
    console.log(`   📖 ${interpreterName} interpreting...`);
    const { system, user } = buildInterpretationPrompt(problem, interpreterName, config);
    const response = await runner.runAgent(
      interpreterName,
      provider,
      config.models[interpreterName],
      user,
      config.parameters.temperature,
      4096,
      system
    );
    const interpretation = parseInterpretationResponse(response.content, interpreterName);
    interpretations.push(interpretation);
    console.log(`   ✅ ${interpreterName}: ${interpretation.interpretation.substring(0, 50)}...`);
  }

  // Step 2: Generate counterpoints between interpretations
  console.log("\n📜 Phase 2: Counterpoints and Debate");
  const counterpoints: CounterInterpretation[] = [];

  for (let i = 0; i < interpretations.length; i++) {
    for (let j = 0; j < interpretations.length; j++) {
      if (i !== j) {
        const { system, user } = buildCounterpointPrompt(
          problem,
          interpretations[i],
          interpretations[j],
          config
        );
        const agentName = `counterpoint-${interpretations[i].interpreter}-vs-${interpretations[j].interpreter}`;
        const response = await runner.runAgent(
          agentName,
          provider,
          config.models.resolver,
          user,
          0.6,
          4096,
          system
        );
        const counterpoint = parseCounterpointResponse(response.content, interpretations[i], interpretations[j]);
        counterpoints.push(counterpoint);
      }
    }
  }
  console.log(`   ✅ ${counterpoints.length} counterpoints generated`);

  // Step 3: Generate practical resolutions
  console.log("\n📜 Phase 3: Practical Resolutions");
  const { system: resolverSystem, user: resolverUser } = buildResolutionPrompt(problem, interpretations, counterpoints, config);
  const resolverResponse = await runner.runAgent(
    "resolver",
    provider,
    config.models.resolver,
    resolverUser,
    0.5,
    4096,
    resolverSystem
  );
  const resolutions = parseResolutionResponse(resolverResponse.content, problem, interpretations);
  console.log(`   ✅ ${resolutions.length} resolutions proposed`);

  // Step 4: Extract insights
  const insights = extractInsights(interpretations, counterpoints, resolutions);

  const duration = Date.now() - startTime;

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

  const result: TalmudicResult = {
    problem,
    interpretations,
    counterpoints,
    resolutions,
    insights,
    metadata: {
      timestamp: new Date().toISOString(),
      duration,
      costUSD: 0, // will be replaced from auditLog
      modelUsage: config.models,
    },
  };

  const { auditLog } = await runner.finalize(result, "complete");
  result.metadata.costUSD = auditLog.metadata.totalCost;

  return result;
}
