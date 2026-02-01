import type { Policy, RegulatoryImpactResult, RegulatoryImpactConfig, EconomicImpact, SocialImpact, EnvironmentalImpact, StakeholderFeedback, RiskAssessment } from "./types";
import { DEFAULT_CONFIG } from "./types";
import { analyzeEconomic, analyzeSocial, analyzeEnvironmental, gatherStakeholderFeedback, assessRisks } from "./analysts";

export async function runAssessment(
  policy: Policy,
  config: RegulatoryImpactConfig = DEFAULT_CONFIG
): Promise<RegulatoryImpactResult> {
  const startTime = Date.now();

  console.log("\n" + "=".repeat(80));
  console.log("📋 REGULATORY IMPACT ASSESSMENT");
  console.log("=".repeat(80));
  console.log(`\n📋 Policy: ${policy.title}`);
  console.log(`   Scope: ${policy.scope}`);
  console.log(`   Objectives: ${policy.objectives.join("; ") || "Not specified"}`);
  console.log();

  // Step 1: Multi-dimensional analysis (parallel)
  console.log("📋 Phase 1: Multi-Dimensional Analysis");
  
  const [economic, social, environmental] = await Promise.all([
    analyzeEconomic(policy, config),
    analyzeSocial(policy, config),
    analyzeEnvironmental(policy, config),
  ]);

  console.log(`   ✅ Economic impact analyzed`);
  console.log(`   ✅ Social impact analyzed`);
  console.log(`   ✅ Environmental impact analyzed`);

  // Step 2: Stakeholder feedback
  console.log("\n📋 Phase 2: Stakeholder Feedback");
  const stakeholderFeedback = await gatherStakeholderFeedback(policy, config);
  console.log(`   ✅ ${stakeholderFeedback.length} stakeholder perspectives gathered`);

  // Step 3: Risk assessment
  console.log("\n📋 Phase 3: Risk Assessment");
  const risks = await assessRisks(policy, economic, social, environmental, config);
  console.log(`   ✅ ${risks.risks.length} risks identified`);

  // Step 4: Synthesize recommendation
  console.log("\n📋 Phase 4: Recommendation");
  const recommendation = synthesizeRecommendation(economic, social, environmental, stakeholderFeedback, risks);
  console.log(`   ✅ Recommendation: ${recommendation.decision.toUpperCase()}`);

  const duration = Date.now() - startTime;
  const costUSD = 0.0; // Placeholder

  console.log("\n" + "=".repeat(80));
  console.log(`🎯 ASSESSMENT COMPLETE`);
  console.log(`   Recommendation: ${recommendation.decision.toUpperCase()}`);
  console.log(`   Economic Costs: ${economic.costs.implementation}`);
  console.log(`   Economic Benefits: ${economic.benefits.direct}`);
  console.log(`   Risks Identified: ${risks.risks.length}`);
  console.log(`\n⏱️  Duration: ${(duration / 1000).toFixed(1)}s`);
  console.log("=".repeat(80) + "\n");

  // Display summary
  console.log("📊 IMPACT SUMMARY\n");
  console.log("Economic Impact:");
  console.log(`  Implementation Cost: ${economic.costs.implementation}`);
  console.log(`  Direct Benefits: ${economic.benefits.direct}`);
  console.log(`  Market Effects: ${economic.marketEffects.length} identified`);
  console.log("\nSocial Impact:");
  console.log(`  Affected Groups: ${social.affectedGroups.join(", ") || "None specified"}`);
  console.log(`  Equity Concerns: ${social.equityConcerns.length} identified`);
  console.log("\nEnvironmental Impact:");
  console.log(`  Direct Effects: ${environmental.directEffects.length} identified`);
  console.log(`  Sustainability: ${environmental.sustainabilityConsiderations.length} considerations`);
  console.log("\nRecommendation:");
  console.log(`  Decision: ${recommendation.decision.toUpperCase()}`);
  console.log(`  Rationale: ${recommendation.rationale}`);
  if (recommendation.conditions) {
    console.log("  Conditions:");
    recommendation.conditions.forEach(c => console.log(`    • ${c}`));
  }
  console.log();

  return {
    policy,
    economic,
    social,
    environmental,
    stakeholderFeedback,
    risks,
    recommendation,
    metadata: {
      timestamp: new Date().toISOString(),
      duration,
      costUSD,
      modelUsage: config.models,
    },
  };
}

function synthesizeRecommendation(
  economic: EconomicImpact,
  social: SocialImpact,
  environmental: EnvironmentalImpact,
  stakeholderFeedback: StakeholderFeedback[],
  risks: RiskAssessment
): { decision: "proceed" | "revise" | "reject"; rationale: string; conditions?: string[] } {
  // Count high risks
  const highRisks = risks.risks.filter(r => r.likelihood === "high" && r.impact === "high").length;
  const mediumRisks = risks.risks.filter(r => 
    (r.likelihood === "high" || r.impact === "high") && 
    !(r.likelihood === "high" && r.impact === "high")
  ).length;

  // Count stakeholder concerns vs support
  const totalConcerns = stakeholderFeedback.reduce((sum, s) => sum + s.concerns.length, 0);
  const totalSupport = stakeholderFeedback.reduce((sum, s) => sum + s.support.length, 0);

  // Determine decision
  let decision: "proceed" | "revise" | "reject" = "proceed";
  let rationale = "";
  let conditions: string[] = [];

  if (highRisks >= 3 || totalConcerns > totalSupport * 2) {
    decision = "reject";
    rationale = `Assessment reveals ${highRisks} high-severity risks and significant stakeholder opposition (${totalConcerns} concerns vs ${totalSupport} points of support). The policy poses unacceptable risks without adequate mitigation strategies.`;
  } else if (highRisks >= 1 || mediumRisks >= 3 || totalConcerns > totalSupport) {
    decision = "revise";
    rationale = `Policy shows promise but requires revision to address ${highRisks > 0 ? "critical risks" : "significant concerns"}. Stakeholder feedback indicates areas needing improvement before implementation.`;
    conditions = [
      "Address high-priority risks identified in assessment",
      "Incorporate stakeholder suggestions for improvement",
      "Develop detailed implementation plan with mitigation strategies",
      "Re-assess after revisions before final approval",
    ];
  } else {
    decision = "proceed";
    rationale = `Policy demonstrates favorable risk profile with manageable concerns. Economic benefits justify implementation costs, and stakeholder feedback is generally supportive.`;
    conditions = [
      "Monitor implementation against identified risks",
      "Establish feedback mechanisms for affected groups",
      "Review effectiveness after initial rollout",
    ];
  }

  return { decision, rationale, conditions };
}
