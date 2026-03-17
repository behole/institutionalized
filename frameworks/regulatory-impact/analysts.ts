import type { Policy, RegulatoryImpactConfig, EconomicImpact, SocialImpact, EnvironmentalImpact, StakeholderFeedback, RiskAssessment } from "./types";
import { parseJSON } from "@core/orchestrator";
import type { LLMProvider } from "@core/types";

export function buildEconomicPrompt(policy: Policy, config: RegulatoryImpactConfig): { system: string; user: string } {
  const system = `You are an economic analyst conducting a regulatory impact assessment.
Analyze the economic implications of the proposed policy comprehensively.

Consider:
- Implementation costs (one-time setup)
- Ongoing operational costs
- Compliance costs for businesses/citizens
- Direct and indirect benefits
- Market effects (competition, innovation, prices)
- Distributional effects (who bears costs vs. who benefits)

Be thorough and quantitative where possible.

Respond with valid JSON matching this structure:
{
  "costs": {
    "implementation": "string",
    "ongoing": "string",
    "compliance": "string"
  },
  "benefits": {
    "direct": "string",
    "indirect": "string",
    "longTerm": "string"
  },
  "marketEffects": ["string"],
  "distributionalEffects": ["string"]
}`;

  const user = `POLICY: ${policy.title}

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

  return { system, user };
}

export function parseEconomicResponse(text: string): EconomicImpact {
  return parseJSON<EconomicImpact>(text);
}

export async function analyzeEconomic(
  policy: Policy,
  config: RegulatoryImpactConfig,
  provider: LLMProvider
): Promise<EconomicImpact> {
  const { system, user } = buildEconomicPrompt(policy, config);

  try {
    const response = await provider.call({
      model: config.models.economic,
      messages: [{ role: "user", content: user }],
      temperature: config.parameters.temperature,
      systemPrompt: system,
      maxTokens: 4096,
    });
    return parseEconomicResponse(response.content);
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

export function buildSocialPrompt(policy: Policy, config: RegulatoryImpactConfig): { system: string; user: string } {
  const system = `You are a social policy analyst conducting a regulatory impact assessment.
Analyze the social implications and equity effects of the proposed policy.

Consider:
- Which groups are affected (positively and negatively)
- Equity and fairness concerns
- Privacy implications
- Accessibility for different populations
- Social cohesion effects

Respond with valid JSON matching this structure:
{
  "affectedGroups": ["string"],
  "equityConcerns": ["string"],
  "privacyImplications": ["string"],
  "accessibilityEffects": ["string"]
}`;

  const user = `POLICY: ${policy.title}

DESCRIPTION:
${policy.description}

STAKEHOLDERS:
${policy.stakeholders.join("\n") || "Not specified"}

Provide a comprehensive social impact analysis including:
1. Affected groups and populations
2. Equity concerns and fairness issues
3. Privacy implications
4. Accessibility effects`;

  return { system, user };
}

export function parseSocialResponse(text: string): SocialImpact {
  return parseJSON<SocialImpact>(text);
}

export async function analyzeSocial(
  policy: Policy,
  config: RegulatoryImpactConfig,
  provider: LLMProvider
): Promise<SocialImpact> {
  const { system, user } = buildSocialPrompt(policy, config);

  try {
    const response = await provider.call({
      model: config.models.social,
      messages: [{ role: "user", content: user }],
      temperature: config.parameters.temperature,
      systemPrompt: system,
      maxTokens: 4096,
    });
    return parseSocialResponse(response.content);
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

export function buildEnvironmentalPrompt(policy: Policy, config: RegulatoryImpactConfig): { system: string; user: string } {
  const system = `You are an environmental analyst conducting a regulatory impact assessment.
Analyze the environmental implications of the proposed policy.

Consider:
- Direct environmental effects
- Indirect and cumulative effects
- Sustainability considerations
- Carbon footprint and climate impact
- Resource usage implications

Respond with valid JSON matching this structure:
{
  "directEffects": ["string"],
  "indirectEffects": ["string"],
  "sustainabilityConsiderations": ["string"],
  "carbonFootprint": "string"
}`;

  const user = `POLICY: ${policy.title}

DESCRIPTION:
${policy.description}

Provide a comprehensive environmental impact analysis including:
1. Direct environmental effects
2. Indirect environmental effects
3. Sustainability considerations
4. Carbon footprint assessment`;

  return { system, user };
}

export function parseEnvironmentalResponse(text: string): EnvironmentalImpact {
  return parseJSON<EnvironmentalImpact>(text);
}

export async function analyzeEnvironmental(
  policy: Policy,
  config: RegulatoryImpactConfig,
  provider: LLMProvider
): Promise<EnvironmentalImpact> {
  const { system, user } = buildEnvironmentalPrompt(policy, config);

  try {
    const response = await provider.call({
      model: config.models.environmental,
      messages: [{ role: "user", content: user }],
      temperature: config.parameters.temperature,
      systemPrompt: system,
      maxTokens: 4096,
    });
    return parseEnvironmentalResponse(response.content);
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

export function buildStakeholderPrompt(
  policy: Policy,
  stakeholder: string,
  config: RegulatoryImpactConfig
): { system: string; user: string } {
  const system = `You are representing ${stakeholder} in a regulatory consultation.
Provide feedback on the proposed policy from this perspective.

Be authentic to the concerns and priorities of your stakeholder group.

Respond with valid JSON matching this structure:
{
  "stakeholder": "string",
  "concerns": ["string"],
  "support": ["string"],
  "suggestions": ["string"]
}`;

  const user = `POLICY: ${policy.title}

DESCRIPTION:
${policy.description}

OBJECTIVES:
${policy.objectives.join("\n") || "Not specified"}

As ${stakeholder}, provide:
1. Your concerns about this policy
2. Aspects you support
3. Suggestions for improvement`;

  return { system, user };
}

export function parseStakeholderResponse(text: string, stakeholder: string): StakeholderFeedback {
  try {
    const result = parseJSON<StakeholderFeedback>(text);
    return { ...result, stakeholder };
  } catch {
    return {
      stakeholder,
      concerns: ["Unable to provide detailed feedback"],
      support: [],
      suggestions: ["Please provide more policy details"],
    };
  }
}

export async function gatherStakeholderFeedback(
  policy: Policy,
  config: RegulatoryImpactConfig,
  provider: LLMProvider
): Promise<StakeholderFeedback[]> {
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
    const { system, user } = buildStakeholderPrompt(policy, stakeholder, config);

    try {
      const response = await provider.call({
        model: config.models.stakeholder,
        messages: [{ role: "user", content: user }],
        temperature: config.parameters.temperature,
        systemPrompt: system,
        maxTokens: 4096,
      });

      feedback.push(parseStakeholderResponse(response.content, stakeholder));
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

export function buildRiskPrompt(
  policy: Policy,
  economic: EconomicImpact,
  social: SocialImpact,
  environmental: EnvironmentalImpact,
  config: RegulatoryImpactConfig
): { system: string; user: string } {
  const system = `You are a risk analyst conducting a regulatory impact assessment.
Identify and assess risks associated with the proposed policy.

For each risk, assess:
- Likelihood (low/medium/high)
- Impact severity (low/medium/high)
- Mitigation strategies

Be comprehensive and consider implementation risks, unintended consequences, and systemic effects.

Respond with valid JSON matching this structure:
{
  "risks": [
    {
      "description": "string",
      "likelihood": "low" | "medium" | "high",
      "impact": "low" | "medium" | "high",
      "mitigation": "string"
    }
  ]
}`;

  const user = `POLICY: ${policy.title}

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

  return { system, user };
}

export function parseRiskResponse(text: string): RiskAssessment {
  return parseJSON<RiskAssessment>(text);
}

export async function assessRisks(
  policy: Policy,
  economic: EconomicImpact,
  social: SocialImpact,
  environmental: EnvironmentalImpact,
  config: RegulatoryImpactConfig,
  provider: LLMProvider
): Promise<RiskAssessment> {
  const { system, user } = buildRiskPrompt(policy, economic, social, environmental, config);

  try {
    const response = await provider.call({
      model: config.models.risk,
      messages: [{ role: "user", content: user }],
      temperature: config.parameters.temperature,
      systemPrompt: system,
      maxTokens: 4096,
    });
    return parseRiskResponse(response.content);
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
