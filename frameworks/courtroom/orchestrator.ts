import { FrameworkRunner, parseJSON } from "@core/orchestrator";
import type { LLMProvider } from "@core/types";
import type { Case, CourtroomResult, CourtroomConfig, Verdict } from "./types";
import { DEFAULT_CONFIG } from "./types";
import { buildProsecutionPrompt, parseProsecutionResponse } from "./prosecutor";
import { buildDefensePrompt, parseDefenseResponse } from "./defense";
import { buildJurorPrompt, parseJurorVerdict } from "./jury";
import { buildVerdictPrompt, parseVerdictResponse } from "./judge";

export async function runCourtroom(
  caseInput: Case,
  config: CourtroomConfig = DEFAULT_CONFIG,
  provider: LLMProvider
): Promise<CourtroomResult> {
  const startTime = Date.now();

  console.log("\n" + "=".repeat(80));
  console.log("🏛️  COURTROOM EVALUATION SYSTEM");
  console.log("=".repeat(80));
  console.log(`\n❓ Question: ${caseInput.question}\n`);

  const runner = new FrameworkRunner<Case, CourtroomResult>("courtroom", caseInput);

  // Step 1: Prosecutor builds case
  console.log("⚖️  Phase 1: Prosecution");
  const prosecutionPrompt = buildProsecutionPrompt(caseInput, config);
  const prosecutionResponse = await runner.runAgent(
    "prosecutor",
    provider,
    config.models.prosecutor,
    prosecutionPrompt,
    0.7,
    4096
  );
  const contextContent = caseInput.context.join("\n\n---\n\n");
  const prosecution = parseProsecutionResponse(
    prosecutionResponse.content,
    contextContent,
    config
  );
  console.log(`   ✅ Case built with ${prosecution.exhibits.length} exhibits`);

  // Step 2: Defense mounts rebuttal
  console.log("\n⚖️  Phase 2: Defense");
  const defensePrompt = buildDefensePrompt(caseInput, prosecution, config);
  const defenseResponse = await runner.runAgent(
    "defense",
    provider,
    config.models.defense,
    defensePrompt,
    0.7,
    4096
  );
  const defense = parseDefenseResponse(defenseResponse.content, prosecution);
  console.log(`   ✅ Rebuttal filed with ${defense.exhibitChallenges.length} challenges`);

  // Step 3: Jury deliberates (parallel)
  console.log("\n⚖️  Phase 3: Jury Deliberation");
  console.log(`\n🏛️  Jury deliberating (${config.parameters.jurySize} jurors in parallel)...`);

  const jurorAgents = Array.from(
    { length: config.parameters.jurySize },
    (_, i) => ({
      name: `juror-${i + 1}`,
      provider,
      model: config.models.jury,
      prompt: buildJurorPrompt(caseInput, prosecution, defense, config, i + 1),
      temperature: config.parameters.juryTemperature,
      maxTokens: 2048,
    })
  );

  const jurorResponses = await runner.runParallel(jurorAgents);

  const jurors = jurorResponses.map((response, i) =>
    parseJurorVerdict(response.content, i + 1)
  );

  // Tally votes
  let guiltyCount = 0;
  let notGuiltyCount = 0;
  let abstainCount = 0;

  for (const juror of jurors) {
    if (juror.vote === "guilty") guiltyCount++;
    else if (juror.vote === "not_guilty") notGuiltyCount++;
    else abstainCount++;
  }

  const proceedsToJudge = guiltyCount >= config.parameters.juryThreshold;

  console.log(`   Votes: ${guiltyCount} guilty, ${notGuiltyCount} not guilty, ${abstainCount} abstain`);
  console.log(`   ${proceedsToJudge ? "✅ Proceeds to judge" : "❌ Case dismissed"}`);

  const jury = {
    jurors,
    guiltyCount,
    notGuiltyCount,
    abstainCount,
    proceedsToJudge,
  };

  // Step 4: Judge renders verdict (only if jury threshold met)
  let verdict: Verdict;
  if (jury.proceedsToJudge) {
    console.log("\n⚖️  Phase 4: Judge's Verdict");
    console.log(`\n⚖️  Judge deliberating...`);
    const verdictPrompt = buildVerdictPrompt(caseInput, prosecution, defense, jury, config);
    const verdictResponse = await runner.runAgent(
      "judge",
      provider,
      config.models.judge,
      verdictPrompt,
      config.parameters.judgeTemperature,
      4096
    );
    verdict = parseVerdictResponse(verdictResponse.content);
    console.log(`   Decision: ${verdict.decision.toUpperCase()}`);
    console.log(`   Confidence: ${(verdict.confidence * 100).toFixed(0)}%`);
  } else {
    console.log("\n⚖️  Case dismissed by jury - no judge deliberation needed");
    verdict = {
      decision: "dismissed" as const,
      reasoning: `Jury did not reach threshold (${jury.guiltyCount}/${config.parameters.juryThreshold} guilty votes). Case dismissed.`,
      rationale: "Jury threshold not met",
      confidence: jury.guiltyCount / config.parameters.jurySize,
    };
  }

  const duration = Date.now() - startTime;

  const result: CourtroomResult = {
    case: caseInput,
    prosecution,
    defense,
    jury,
    verdict,
    metadata: {
      timestamp: new Date().toISOString(),
      duration,
      costUSD: 0, // will be replaced from auditLog
      modelUsage: {
        prosecutor: config.models.prosecutor,
        defense: config.models.defense,
        jury: config.models.jury,
        judge: config.models.judge,
      },
    },
  };

  const { auditLog } = await runner.finalize(result, "complete");
  result.metadata.costUSD = auditLog.metadata.totalCost;

  console.log("\n" + "=".repeat(80));
  console.log(`✅ VERDICT: ${verdict.decision.toUpperCase()}`);
  console.log(`📝 ${verdict.rationale}`);
  if (verdict.actions && verdict.actions.length > 0) {
    console.log(`\n📋 Actions:`);
    verdict.actions.forEach((action, i) => {
      console.log(`   ${i + 1}. ${action}`);
    });
  }
  console.log(`\n⏱️  Duration: ${(duration / 1000).toFixed(1)}s`);
  console.log("=".repeat(80) + "\n");

  return result;
}

// Re-export parseJSON for any consumers that imported it from orchestrator
export { parseJSON };
