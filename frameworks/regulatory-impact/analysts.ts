import type { Policy, RegulatoryImpactConfig, EconomicImpact, SocialImpact, EnvironmentalImpact, StakeholderFeedback, RiskAssessment } from "./types";
import { generateObject } from "@institutional-reasoning/core";

export async function analyzeEconomic(
  policy: Policy,
  config: RegulatoryImpactConfig
): Promise<EconomicImpact> {
  const model = config.models.economic;
  
  const systemPrompt = `You are an economic analyst conducting a regulatory impact assessment.
Analyze the economic implications of the proposed policy comprehensively.

Consider:
- Implementation costs (one-time setup)
- Ongoing operational costs
- Compliance costs for businesses/citizens
- Direct and indirect benefits
- Market effects (competition, innovation, prices)
- Distributional effects (who bears costs vs. who benefits)

Be thorough and quantitative where possible.`;

  const userPrompt = `POLICY: ${policy.title}

DESCRIPTION:
${policy.description}

OBJECTIVES:
${policy.objectives.join("\n") || "Not specified"}

SCOPE: ${policy.scope}

Provide a comprehensive economic impact analysis including:
1. All cost categories (implementation, ongoing, compliance)
2. All benefit categories (direct, indirect, long-term)
3. Market effects
4. Distributional effects (equity considerations)`;

  try {
    return await generateObject<EconomicImpact>({
      model,
      system: systemPrompt,
      prompt: userPrompt,
      temperature: config.parameters.temperature,
    });
  } catch (error) {
    console.warn("Economic analysis failed:", error);
    return {
      costs: {
        implementation: "Unable to assess",
        ongoing: "Unable to assess",
        compliance: "Unable to assess",
      },
      benefits: {
        direct: "Unable to assess",
        indirect: "Unable to assess",
        longTerm: "Unable to assess",
      },
      marketEffects: [],
      distributionalEffects: [],
    };
  }
}

export async function analyzeSocial(
  policy: Policy,
  config: RegulatoryImpactConfig
): Promise<SocialImpact> {
  const model = config.models.social;
  
  const systemPrompt = `You are a social policy analyst conducting a regulatory impact assessment.
Analyze the social implications and equity effects of the proposed policy.

Consider:
- Which groups are affected (positively and negatively)
- Equity and fairness concerns
- Privacy implications
- Accessibility for different populations
- Social cohesion effects`;

  const userPrompt = `POLICY: ${policy.title}

DESCRIPTION:
${policy.description}

STAKEHOLDERS:
${policy.stakeholders.join("\n") || "Not specified"}

Provide a comprehensive social impact analysis including:
1. Affected groups and populations
2. Equity concerns and fairness issues
3. Privacy implications
4. Accessibility effects`;

  try {
    return await generateObject<SocialImpact>({
      model,
      system: systemPrompt,
      prompt: userPrompt,
      temperature: config.parameters.temperature,
    });
  } catch (error) {
    console.warn("Social analysis failed:", error);
    return {
      affectedGroups: [],
      equityConcerns: [],
      privacyImplications: [],
      accessibilityEffects: [],
    };
  }
}

export async function analyzeEnvironmental(
  policy: Policy,
  config: RegulatoryImpactConfig
): Promise<EnvironmentalImpact> {
  const model = config.models.environmental;
  
  const systemPrompt = `You are an environmental analyst conducting a regulatory impact assessment.
Analyze the environmental implications of the proposed policy.

Consider:
- Direct environmental effects
- Indirect and cumulative effects
- Sustainability considerations
- Carbon footprint and climate impact
- Resource usage implications`;

  const userPrompt = `POLICY: ${policy.title}

DESCRIPTION:
${policy.description}

Provide a comprehensive environmental impact analysis including:
1. Direct environmental effects
2. Indirect environmental effects
3. Sustainability considerations
4. Carbon footprint assessment`;

  try {
    return await generateObject<EnvironmentalImpact>({
      model,
      system: systemPrompt,
      prompt: userPrompt,
      temperature: config.parameters.temperature,
    });
  } catch (error) {
    console.warn("Environmental analysis failed:", error);
    return {
      directEffects: [],
      indirectEffects: [],
      sustainabilityConsiderations: [],
      carbonFootprint: "Unable to assess",
    };
  }
}

export async function gatherStakeholderFeedback(
  policy: Policy,
  config: RegulatoryImpactConfig
): Promise<StakeholderFeedback[]> {
  const model = config.models.stakeholder;
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
  const feedback: StakeholderFeedback[] = [];

  for (const stakeholder of selectedStakeholders) {
    const systemPrompt = `You are representing ${stakeholder} in a regulatory consultation.
Provide feedback on the proposed policy from this perspective.

Be authentic to the concerns and priorities of your stakeholder group.`;

    const userPrompt = `POLICY: ${policy.title}

DESCRIPTION:
${policy.description}

OBJECTIVES:
${policy.objectives.join("\n") || "Not specified"}

As ${stakeholder}, provide:
1. Your concerns about this policy
2. Aspects you support
3. Suggestions for improvement`;

    try {
      const result = await generateObject<StakeholderFeedback>({
        model,
        system: systemPrompt,
        prompt: userPrompt,
        temperature: config.parameters.temperature,
      });
      
      feedback.push({
        ...result,
        stakeholder,
      });
    } catch (error) {
      console.warn(`Failed to get feedback from ${stakeholder}:`, error);
      feedback.push({
        stakeholder,
        concerns: ["Unable to provide detailed feedback"],
        support: [],
        suggestions: ["Please provide more policy details"],
      });
    }
  }

  return feedback;
}

export async function assessRisks(
  policy: Policy,
  economic: EconomicImpact,
  social: SocialImpact,
  environmental: EnvironmentalImpact,
  config: RegulatoryImpactConfig
): Promise<RiskAssessment> {
  const model = config.models.risk;
  
  const systemPrompt = `You are a risk analyst conducting a regulatory impact assessment.
Identify and assess risks associated with the proposed policy.

For each risk, assess:
- Likelihood (low/medium/high)
- Impact severity (low/medium/high)
- Mitigation strategies

Be comprehensive and consider implementation risks, unintended consequences, and systemic effects.`;

  const userPrompt = `POLICY: ${policy.title}

DESCRIPTION:
${policy.description}

ECONOMIC IMPACT:
Costs: ${JSON.stringify(economic.costs)}
Benefits: ${JSON.stringify(economic.benefits)}
Market Effects: ${economic.marketEffects.join("; ")}

SOCIAL IMPACT:
Affected Groups: ${social.affectedGroups.join("; ")}
Equity Concerns: ${social.equityConcerns.join("; ")}

ENVIRONMENTAL IMPACT:
Direct Effects: ${environmental.directEffects.join("; ")}
Sustainability: ${environmental.sustainabilityConsiderations.join("; ")}

Identify 5-8 key risks associated with this policy, including:
1. Implementation risks
2. Unintended consequences
3. Compliance/enforcement challenges
4. Economic risks
5. Social/political risks

For each risk, provide likelihood, impact, and mitigation strategy.`;

  try {
    return await generateObject<RiskAssessment>({
      model,
      system: systemPrompt,
      prompt: userPrompt,
      temperature: config.parameters.temperature,
    });
  } catch (error) {
    console.warn("Risk assessment failed:", error);
    return {
      risks: [{
        description: "Assessment incomplete - unable to fully evaluate risks",
        likelihood: "medium",
        impact: "medium",
        mitigation: "Conduct detailed risk assessment before implementation",
      }],
    };
  }
}
