import type { DissertationWork, DissertationCommitteeResult, DissertationCommitteeConfig, CommitteeMember, StageReview, CommitteeConsensus, DevelopmentPlan } from "./types";
import { DEFAULT_CONFIG } from "./types";
import { conductReview, formCommittee } from "./committee";

export async function runCommitteeReview(
  work: DissertationWork,
  config: DissertationCommitteeConfig = DEFAULT_CONFIG
): Promise<DissertationCommitteeResult> {
  const startTime = Date.now();

  console.log("\n" + "=".repeat(80));
  console.log("🎓 DISSERTATION COMMITTEE REVIEW");
  console.log("=".repeat(80));
  console.log(`\n📚 Title: ${work.title}`);
  console.log(`   Field: ${work.field}`);
  console.log(`   Stage: ${work.stage}`);
  console.log(`   Abstract: ${work.abstract.substring(0, 100)}${work.abstract.length > 100 ? "..." : ""}`);
  console.log();

  // Step 1: Form committee
  console.log("🎓 Phase 1: Committee Formation");
  const committee = formCommittee(work, config);
  console.log(`   ✅ Committee formed (${committee.length} members):`);
  committee.forEach(m => console.log(`      • ${m.name} (${m.role}) - ${m.specialty}`));

  // Step 2: Individual reviews (parallel)
  console.log("\n🎓 Phase 2: Individual Reviews");
  const stageReviews: StageReview[] = [];
  
  for (const member of committee) {
    console.log(`   📝 ${member.name} reviewing...`);
    const review = await conductReview(work, member, config);
    stageReviews.push(review);
    console.log(`   ✅ ${member.name}: ${review.verdict.toUpperCase()}`);
    if (review.requiredChanges && review.requiredChanges.length > 0) {
      console.log(`      Required changes: ${review.requiredChanges.length}`);
    }
  }

  // Step 3: Committee consensus
  console.log("\n🎓 Phase 3: Committee Consensus");
  const consensus = determineConsensus(stageReviews, config);
  console.log(`   ✅ Consensus: ${consensus.overallVerdict.toUpperCase()}`);
  console.log(`   Unanimous: ${consensus.unanimous ? "Yes" : "No"}`);
  if (consensus.conditions && consensus.conditions.length > 0) {
    console.log(`   Conditions: ${consensus.conditions.length}`);
  }

  // Step 4: Development plan
  console.log("\n🎓 Phase 4: Development Plan");
  const developmentPlan = generateDevelopmentPlan(work, stageReviews, consensus);
  console.log(`   ✅ Plan generated`);
  console.log(`   Immediate actions: ${developmentPlan.immediateActions.length}`);
  console.log(`   Milestones: ${developmentPlan.milestones.length}`);

  const duration = Date.now() - startTime;
  const costUSD = 0.0; // Placeholder

  console.log("\n" + "=".repeat(80));
  console.log(`🎯 COMMITTEE REVIEW COMPLETE`);
  console.log(`   Verdict: ${consensus.overallVerdict.toUpperCase()}`);
  console.log(`   Reviews: ${stageReviews.length}`);
  console.log(`   Unanimous: ${consensus.unanimous ? "Yes" : "No"}`);
  console.log(`\n⏱️  Duration: ${(duration / 1000).toFixed(1)}s`);
  console.log("=".repeat(80) + "\n");

  // Display summary
  console.log("📊 COMMITTEE SUMMARY\n");
  console.log("Individual Verdicts:");
  stageReviews.forEach(r => {
    const emoji = r.verdict === "approve" ? "✓" : r.verdict === "revise" ? "~" : "✗";
    console.log(`  ${emoji} ${r.reviewer}: ${r.verdict.toUpperCase()}`);
  });
  console.log(`\nOverall: ${consensus.overallVerdict.toUpperCase()}`);
  if (consensus.conditions && consensus.conditions.length > 0) {
    console.log("\nConditions for Approval:");
    consensus.conditions.forEach(c => console.log(`  • ${c}`));
  }
  console.log("\nImmediate Actions Required:");
  developmentPlan.immediateActions.forEach(a => console.log(`  → ${a}`));
  console.log();

  return {
    work,
    committee,
    stageReviews,
    consensus,
    developmentPlan,
    metadata: {
      timestamp: new Date().toISOString(),
      duration,
      costUSD,
      modelUsage: config.models,
    },
  };
}

function formCommittee(work: DissertationWork, config: DissertationCommitteeConfig): CommitteeMember[] {
  const committee: CommitteeMember[] = [
    {
      name: "Primary Advisor",
      specialty: work.field,
      role: "advisor",
    },
    {
      name: "Specialist 1",
      specialty: `${work.field} - Theoretical Foundations`,
      role: "specialist",
    },
    {
      name: "Specialist 2",
      specialty: `${work.field} - Applied Research`,
      role: "specialist",
    },
    {
      name: "Methodologist",
      specialty: "Research Methodology",
      role: "methodologist",
    },
  ];

  return committee.slice(0, config.parameters.committeeSize);
}

function determineConsensus(
  stageReviews: StageReview[],
  config: DissertationCommitteeConfig
): CommitteeConsensus {
  const verdicts = stageReviews.map(r => r.verdict);
  const approveCount = verdicts.filter(v => v === "approve").length;
  const reviseCount = verdicts.filter(v => v === "revise").length;
  const rejectCount = verdicts.filter(v => v === "reject").length;

  let overallVerdict: "approve" | "revise" | "reject" = "revise";
  let unanimous = false;

  if (rejectCount > 0) {
    overallVerdict = "reject";
  } else if (approveCount === verdicts.length) {
    overallVerdict = "approve";
    unanimous = true;
  } else if (approveCount > verdicts.length / 2) {
    overallVerdict = "approve";
  }

  // Collect all required changes as conditions
  const conditions = stageReviews
    .flatMap(r => r.requiredChanges || [])
    .filter((v, i, a) => a.indexOf(v) === i); // dedupe

  // Collect dissenting views
  const dissentingViews = stageReviews
    .filter(r => r.verdict !== overallVerdict)
    .map(r => `${r.reviewer}: ${r.assessment.weaknesses.join("; ")}`);

  return {
    overallVerdict,
    unanimous,
    ...(dissentingViews.length > 0 && { dissentingViews }),
    ...(conditions.length > 0 && { conditions }),
  };
}

function generateDevelopmentPlan(
  work: DissertationWork,
  stageReviews: StageReview[],
  consensus: CommitteeConsensus
): DevelopmentPlan {
  // Collect all required changes
  const immediateActions = stageReviews
    .flatMap(r => r.requiredChanges || [])
    .filter((v, i, a) => a.indexOf(v) === i);

  // Collect all suggestions
  const allSuggestions = stageReviews
    .flatMap(r => r.suggestions || [])
    .filter((v, i, a) => a.indexOf(v) === i);

  // Determine timeline based on stage
  const timeline = work.stage === "proposal" 
    ? "6-12 months to completion"
    : work.stage === "chapters"
    ? "3-6 months to completion"
    : work.stage === "draft"
    ? "1-3 months to completion"
    : "Final revisions only";

  // Generate milestones
  const milestones = [
    `Address all required changes from ${work.stage} review`,
    ...(work.stage !== "final" ? ["Complete next stage of work"] : []),
    ...(work.stage !== "final" ? ["Submit for next committee review"] : []),
    "Prepare for final defense/submission",
  ];

  // Resources
  const resources = [
    "Committee feedback and guidance",
    ...(work.methodology ? ["Methodology refinement resources"] : []),
    "Writing and revision support",
    "Peer review from colleagues",
  ];

  return {
    immediateActions: immediateActions.length > 0 ? immediateActions : allSuggestions.slice(0, 5),
    timeline,
    milestones,
    resources,
  };
}
