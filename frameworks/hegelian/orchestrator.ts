import { FrameworkRunner } from "@core/orchestrator";
import type { LLMProvider } from "@core/types";
import type { DialecticalProblem, HegelianResult, HegelianConfig, Thesis, Antithesis, Synthesis, DialecticalInsight } from "./types";
import { DEFAULT_CONFIG } from "./types";
import { buildThesisPrompt, parseThesisResponse, buildAntithesisPrompt, parseAntithesisResponse, buildSynthesisPrompt, parseSynthesisResponse } from "./dialectic";

export async function runDialectic(
  problem: DialecticalProblem,
  config: HegelianConfig = DEFAULT_CONFIG,
  provider: LLMProvider
): Promise<HegelianResult> {
  const startTime = Date.now();

  console.log("\n" + "=".repeat(80));
  console.log("⚖️  HEGELIAN DIALECTIC");
  console.log("=".repeat(80));
  console.log(`\n📋 Context: ${problem.context}`);
  console.log(`   Initial Thesis: ${problem.thesis}`);
  console.log();

  const runner = new FrameworkRunner<DialecticalProblem, HegelianResult>("hegelian", problem);

  // Step 1: Develop the Thesis
  console.log("⚖️  Phase 1: Thesis");
  const { system: thesisSystem, user: thesisUser } = buildThesisPrompt(problem, config);
  const thesisResponse = await runner.runAgent(
    "thesis",
    provider,
    config.models.thesis,
    thesisUser,
    config.parameters.temperature,
    4096,
    thesisSystem
  );
  const thesis = parseThesisResponse(thesisResponse.content);
  console.log(`   ✅ Thesis developed`);
  console.log(`      Position: ${thesis.position.substring(0, 60)}...`);
  console.log(`      Arguments: ${thesis.supportingArguments.length}`);

  // Step 2: Generate genuine opposition (Antithesis)
  console.log("\n⚖️  Phase 2: Antithesis");
  const { system: antithesisSystem, user: antithesisUser } = buildAntithesisPrompt(problem, thesis, config);
  const antithesisResponse = await runner.runAgent(
    "antithesis",
    provider,
    config.models.antithesis,
    antithesisUser,
    config.parameters.temperature,
    4096,
    antithesisSystem
  );
  const antithesis = parseAntithesisResponse(antithesisResponse.content);
  console.log(`   ✅ Antithesis generated`);
  console.log(`      Position: ${antithesis.position.substring(0, 60)}...`);
  console.log(`      Contradictions: ${antithesis.contradictionsIdentified.length}`);

  // Step 3: Synthesize into higher-order resolution
  console.log("\n⚖️  Phase 3: Synthesis");
  const { system: synthesisSystem, user: synthesisUser } = buildSynthesisPrompt(problem, thesis, antithesis, config);
  const synthesisResponse = await runner.runAgent(
    "synthesis",
    provider,
    config.models.synthesis,
    synthesisUser,
    config.parameters.temperature,
    4096,
    synthesisSystem
  );
  const synthesis = parseSynthesisResponse(synthesisResponse.content);
  console.log(`   ✅ Synthesis achieved`);
  console.log(`      Integrated Position: ${synthesis.integratedPosition.substring(0, 60)}...`);
  console.log(`      Transcends Both: ${synthesis.transcendsBoth.length} new insights`);

  // Step 4: Extract insights
  const insights = extractInsights(thesis, antithesis, synthesis);

  const duration = Date.now() - startTime;

  console.log("\n" + "=".repeat(80));
  console.log(`🎯 DIALECTIC COMPLETE`);
  console.log(`   Insights: ${insights.length}`);
  console.log(`\n⏱️  Duration: ${(duration / 1000).toFixed(1)}s`);
  console.log("=".repeat(80) + "\n");

  // Display synthesis
  console.log("📊 SYNTHESIS\n");
  console.log("How it resolves the contradiction:");
  console.log(`  ${synthesis.howItResolves}\n`);
  console.log("Preserves from Thesis:");
  synthesis.preservesFromThesis.forEach(p => console.log(`  ✓ ${p}`));
  console.log("\nPreserves from Antithesis:");
  synthesis.preservesFromAntithesis.forEach(p => console.log(`  ✓ ${p}`));
  console.log("\nTranscends Both (New Insights):");
  synthesis.transcendsBoth.forEach(t => console.log(`  → ${t}`));
  console.log();

  const result: HegelianResult = {
    problem,
    thesis,
    antithesis,
    synthesis,
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

function extractInsights(
  thesis: Thesis,
  antithesis: Antithesis,
  synthesis: Synthesis
): DialecticalInsight[] {
  const insights: DialecticalInsight[] = [];

  // Extract insights from thesis
  thesis.supportingArguments.forEach((arg, i) => {
    if (i < 2) {
      insights.push({
        insight: arg,
        source: "thesis",
        application: "Valid consideration that synthesis preserves",
      });
    }
  });

  // Extract insights from antithesis
  antithesis.counterArguments.forEach((arg, i) => {
    if (i < 2) {
      insights.push({
        insight: arg,
        source: "antithesis",
        application: "Valid critique that synthesis addresses",
      });
    }
  });

  // Extract insights from synthesis
  synthesis.transcendsBoth.forEach(insight => {
    insights.push({
      insight,
      source: "synthesis",
      application: "Higher-order understanding emerging from dialectic",
    });
  });

  return insights;
}
