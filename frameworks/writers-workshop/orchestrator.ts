import { FrameworkRunner } from "@core/orchestrator";
import type { LLMProvider } from "@core/types";
import type { Manuscript, WritersWorkshopResult, WritersWorkshopConfig, PeerReview, DiscussionPoint, WorkshopSummary } from "./types";
import { DEFAULT_CONFIG } from "./types";
import { buildPeerReviewPrompt, parsePeerReviewResponse } from "./peer";
import { buildFacilitatorPrompt, parseFacilitatorResponse } from "./facilitator";

export async function runWorkshop(
  manuscript: Manuscript,
  config: WritersWorkshopConfig = DEFAULT_CONFIG,
  provider: LLMProvider
): Promise<WritersWorkshopResult> {
  const startTime = Date.now();

  console.log("\n" + "=".repeat(80));
  console.log("✍️  WRITERS' WORKSHOP");
  console.log("=".repeat(80));
  console.log(`\n📖 Manuscript: ${manuscript.title}`);
  if (manuscript.genre) console.log(`   Genre: ${manuscript.genre}`);
  if (manuscript.wordCount) console.log(`   Word Count: ${manuscript.wordCount}`);
  console.log();

  const runner = new FrameworkRunner<Manuscript, WritersWorkshopResult>("writers-workshop", manuscript);

  // Step 1: Peer reviews (sequential -- the structure IS the value)
  console.log("✍️  Phase 1: Peer Reviews");
  const peerReviews: PeerReview[] = [];
  const peerNames = Object.keys(config.models).filter(k => k.startsWith("peer"));

  for (let i = 0; i < config.parameters.peerCount && i < peerNames.length; i++) {
    const peerName = peerNames[i];
    console.log(`   📝 ${peerName} reviewing...`);
    const { system, user } = buildPeerReviewPrompt(manuscript, peerName, config);
    const response = await runner.runAgent(
      peerName,
      provider,
      config.models[peerName],
      user,
      config.parameters.temperature,
      4096,
      system
    );
    const review = parsePeerReviewResponse(response.content, peerName);
    peerReviews.push(review);
    console.log(`   ✅ ${peerName} complete`);
  }

  // Step 2: Facilitated discussion
  let discussion: DiscussionPoint[] = [];
  if (config.parameters.enableDiscussion && peerReviews.length > 1) {
    console.log("\n✍️  Phase 2: Facilitated Discussion");
    const { system, user } = buildFacilitatorPrompt(manuscript, peerReviews, config);
    const facilitatorResponse = await runner.runAgent(
      "facilitator",
      provider,
      config.models.facilitator,
      user,
      0.5,
      4096,
      system
    );
    discussion = parseFacilitatorResponse(facilitatorResponse.content);
    console.log(`   ✅ ${discussion.length} discussion points synthesized`);
  }

  // Step 3: Generate summary
  console.log("\n✍️  Phase 3: Workshop Summary");
  const summary = generateSummary(peerReviews, discussion);
  console.log(`   ✅ Summary generated`);

  const duration = Date.now() - startTime;

  console.log("\n" + "=".repeat(80));
  console.log(`🎯 WORKSHOP COMPLETE`);
  console.log(`   Reviews: ${peerReviews.length}`);
  console.log(`   Discussion Points: ${discussion.length}`);
  console.log(`   Key Strengths: ${summary.overallStrengths.length}`);
  console.log(`   Areas for Focus: ${summary.recommendedFocus.length}`);
  console.log(`\n⏱️  Duration: ${(duration / 1000).toFixed(1)}s`);
  console.log("=".repeat(80) + "\n");

  // Display summary
  console.log("📊 WORKSHOP SUMMARY\n");
  console.log("Overall Strengths:");
  summary.overallStrengths.forEach(s => console.log(`  ✓ ${s}`));
  console.log("\nCommon Concerns:");
  summary.commonConcerns.forEach(c => console.log(`  ⚠ ${c}`));
  console.log("\nRecommended Focus Areas:");
  summary.recommendedFocus.forEach(f => console.log(`  → ${f}`));
  console.log("\nNext Steps:");
  summary.nextSteps.forEach(s => console.log(`  • ${s}`));
  console.log();

  const result: WritersWorkshopResult = {
    manuscript,
    peerReviews,
    discussion,
    summary,
    metadata: {
      timestamp: new Date().toISOString(),
      duration,
      costUSD: 0, // will be replaced from auditLog
      peerCount: peerReviews.length,
      modelUsage: config.models,
    },
  };

  const { auditLog } = await runner.finalize(result, "complete");
  result.metadata.costUSD = auditLog.metadata.totalCost;

  return result;
}

function generateSummary(
  peerReviews: PeerReview[],
  discussion: DiscussionPoint[]
): WorkshopSummary {
  // Extract all strengths
  const allStrengths = peerReviews.flatMap(r => r.positive.strengths);
  const strengthCounts = countOccurrences(allStrengths);
  const overallStrengths = Object.entries(strengthCounts)
    .filter(([_, count]) => count > 1)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([strength]) => strength);

  // Extract common concerns
  const allConcerns = peerReviews.flatMap(r => r.constructive.craftConcerns);
  const concernCounts = countOccurrences(allConcerns);
  const commonConcerns = Object.entries(concernCounts)
    .filter(([_, count]) => count > 1)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([concern]) => concern);

  // Generate focus areas from suggestions
  const allSuggestions = peerReviews.flatMap(r => r.constructive.suggestions);
  const recommendedFocus = [...new Set(allSuggestions)].slice(0, 5);

  // Generate next steps
  const nextSteps = [
    "Address common concerns raised by multiple reviewers",
    "Leverage identified strengths in revision",
    "Consider discussion points for deeper revision",
    "Review specific suggestions from peer feedback",
  ];

  return {
    overallStrengths: overallStrengths.length > 0 ? overallStrengths : allStrengths.slice(0, 3),
    commonConcerns: commonConcerns.length > 0 ? commonConcerns : allConcerns.slice(0, 3),
    recommendedFocus,
    nextSteps,
  };
}

function countOccurrences(items: string[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const item of items) {
    counts[item] = (counts[item] || 0) + 1;
  }
  return counts;
}
