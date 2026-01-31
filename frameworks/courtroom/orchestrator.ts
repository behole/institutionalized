import type { Case, CourtroomResult, CourtroomConfig } from "./types";
import { DEFAULT_CONFIG } from "./types";
import { prosecute } from "./prosecutor";
import { defend } from "./defense";
import { deliberate } from "./jury";
import { renderVerdict } from "./judge";

export async function runCourtroom(
  caseInput: Case,
  config: CourtroomConfig = DEFAULT_CONFIG
): Promise<CourtroomResult> {
  const startTime = Date.now();

  console.log("\n" + "=".repeat(80));
  console.log("🏛️  COURTROOM EVALUATION SYSTEM");
  console.log("=".repeat(80));
  console.log(`\n❓ Question: ${caseInput.question}\n`);

  // Step 1: Prosecutor builds case
  console.log("⚖️  Phase 1: Prosecution");
  const prosecution = await prosecute(caseInput, config);
  console.log(`   ✅ Case built with ${prosecution.exhibits.length} exhibits`);

  // Step 2: Defense mounts rebuttal
  console.log("\n⚖️  Phase 2: Defense");
  const defense = await defend(caseInput, prosecution, config);
  console.log(`   ✅ Rebuttal filed with ${defense.exhibitChallenges.length} challenges`);

  // Step 3: Jury deliberates (parallel)
  console.log("\n⚖️  Phase 3: Jury Deliberation");
  const jury = await deliberate(caseInput, prosecution, defense, config);

  // Step 4: Judge renders verdict (only if jury threshold met)
  let verdict;
  if (jury.proceedsToJudge) {
    console.log("\n⚖️  Phase 4: Judge's Verdict");
    verdict = await renderVerdict(caseInput, prosecution, defense, jury, config);
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

  // TODO: Calculate actual cost from API usage
  const costUSD = 0.0; // Placeholder

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

  return {
    case: caseInput,
    prosecution,
    defense,
    jury,
    verdict,
    metadata: {
      timestamp: new Date().toISOString(),
      duration,
      costUSD,
      modelUsage: {
        prosecutor: config.models.prosecutor,
        defense: config.models.defense,
        jury: config.models.jury,
        judge: config.models.judge,
      },
    },
  };
}
