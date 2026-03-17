import { FrameworkRunner } from "@core/orchestrator";
import type { LLMProvider } from "@core/types";
import type { Policy, RegulatoryImpactResult, RegulatoryImpactConfig, EconomicImpact, SocialImpact, EnvironmentalImpact, StakeholderFeedback, RiskAssessment } from "./types";
import { DEFAULT_CONFIG } from "./types";
import {
  buildEconomicPrompt, parseEconomicResponse,
  buildSocialPrompt, parseSocialResponse,
  buildEnvironmentalPrompt, parseEnvironmentalResponse,
  buildStakeholderPrompt, parseStakeholderResponse,
  buildRiskPrompt, parseRiskResponse
} from "./analysts";

export async function runAssessment(
  policy: Policy,
  config: RegulatoryImpactConfig = DEFAULT_CONFIG,
  provider: LLMProvider
): Promise<RegulatoryImpactResult> {
  const startTime = Date.now();

  console.log("\n" + "=".repeat(80));
  console.log("📋 REGULATORY IMPACT ASSESSMENT");
  console.log("=".repeat(80));
  console.log(`\n📋 Policy: ${policy.title}`);
  console.log(`   Scope: ${policy.scope}`);
  console.log(`   Objectives: ${policy.objectives.join("; ") || "Not specified"}`);
  console.log();

  const runner = new FrameworkRunner<Policy, RegulatoryImpactResult>("regulatory-impact", policy);

  // Step 1: Multi-dimensional analysis (parallel)
  console.log("📋 Phase 1: Multi-Dimensional Analysis");

  const { system: econSystem, user: econUser } = buildEconomicPrompt(policy, config);
  const { system: socialSystem, user: socialUser } = buildSocialPrompt(policy, config);
  const { system: envSystem, user: envUser } = buildEnvironmentalPrompt(policy, config);

  const [econResponse, socialResponse, envResponse] = await runner.runParallel([
    {
      name: "economic-analyst",
      provider,
      model: config.models.economic,
      prompt: econUser,
      temperature: config.parameters.temperature,
      maxTokens: 4096,
      systemPrompt: econSystem,
    },
    {
      name: "social-analyst",
      provider,
      model: config.models.social,
      prompt: socialUser,
      temperature: config.parameters.temperature,
      maxTokens: 4096,
      systemPrompt: socialSystem,
    },
    {
      name: "environmental-analyst",
      provider,
      model: config.models.environmental,
      prompt: envUser,
      temperature: config.parameters.temperature,
      maxTokens: 4096,
      systemPrompt: envSystem,
    },
  ]);

  const economic = parseEconomicResponse(econResponse.content);
  const social = parseSocialResponse(socialResponse.content);
  const environmental = parseEnvironmentalResponse(envResponse.content);

  console.log(`   ✅ Economic impact analyzed`);
  console.log(`   ✅ Social impact analyzed`);
  console.log(`   ✅ Environmental impact analyzed`);

  // Step 2: Stakeholder feedback (sequential -- each represents a distinct voice)
  console.log("\n📋 Phase 2: Stakeholder Feedback");
  const stakeholderTypes = [
    "Industry/Business Representatives",
    "Consumer Advocates",
    "Civil Liberties Groups",
    "Environmental Organizations",
    "Labor Unions",
    "Small Business Owners",
    "Technology Companies",
    "Public Interest Groups",
  ];
  const selectedStakeholders = stakeholderTypes.slice(0, config.parameters.stakeholderCount);
  const stakeholderFeedback: StakeholderFeedback[] = [];

  for (const stakeholder of selectedStakeholders) {
    const { system, user } = buildStakeholderPrompt(policy, stakeholder, config);
    try {
      const response = await runner.runAgent(
        `stakeholder-${stakeholder.replace(/\s+/g, "-").toLowerCase()}`,
        provider,
        config.models.stakeholder,
        user,
        config.parameters.temperature,
        4096,
        system
      );
      stakeholderFeedback.push(parseStakeholderResponse(response.content, stakeholder));
    } catch (error) {
      console.warn(`Failed to get feedback from ${stakeholder}:`, error);
      stakeholderFeedback.push({
        stakeholder,
        concerns: ["Unable to provide detailed feedback"],
        support: [],
        suggestions: ["Please provide more policy details"],
      });
    }
  }
  console.log(`   ✅ ${stakeholderFeedback.length} stakeholder perspectives gathered`);

  // Step 3: Risk assessment
  console.log("\n📋 Phase 3: Risk Assessment");
  const { system: riskSystem, user: riskUser } = buildRiskPrompt(policy, economic, social, environmental, config);
  const riskResponse = await runner.runAgent(
    "risk-analyst",
    provider,
    config.models.risk,
    riskUser,
    config.parameters.temperature,
    4096,
    riskSystem
  );
  const risks = parseRiskResponse(riskResponse.content);
  console.log(`   ✅ ${risks.risks.length} risks identified`);

  // Step 4: Synthesize recommendation
  console.log("\n📋 Phase 4: Recommendation");
  const recommendation = synthesizeRecommendation(economic, social, environmental, stakeholderFeedback, risks);
  console.log(`   ✅ Recommendation: ${recommendation.decision.toUpperCase()}`);

  const duration = Date.now() - startTime;

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

  const result: RegulatoryImpactResult = {
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
      costUSD: 0, // will be replaced from auditLog
      modelUsage: config.models,
    },
  };

  const { auditLog } = await runner.finalize(result, "complete");
  result.metadata.costUSD = auditLog.metadata.totalCost;

  return result;
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
