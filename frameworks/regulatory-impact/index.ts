/**
 * Regulatory Impact Assessment Framework — engine port.
 *
 * Flow: parallel multi-dimensional analysis (economic/social/environmental) →
 * sequential stakeholder feedback → risk assessment → synthesized
 * recommendation. Prompt/parse content lives in analysts.ts, untouched.
 * All provider/audit/logging concerns owned by the engine.
 */
import type { EventSink } from '@core/engine';
import { defineFramework } from '@core/engine';
import type { RunFlags } from '@core/types';
import type {
  Policy,
  RegulatoryImpactResult,
  RegulatoryImpactConfig,
  EconomicImpact,
  SocialImpact,
  EnvironmentalImpact,
  StakeholderFeedback,
  RiskAssessment,
} from './types';
import { DEFAULT_CONFIG } from './types';
import {
  buildEconomicPrompt,
  parseEconomicResponse,
  buildSocialPrompt,
  parseSocialResponse,
  buildEnvironmentalPrompt,
  parseEnvironmentalResponse,
  buildStakeholderPrompt,
  parseStakeholderResponse,
  buildRiskPrompt,
  parseRiskResponse,
} from './analysts';

export const regulatoryImpact = defineFramework<
  Policy | { content: string },
  RegulatoryImpactResult
>({
  name: 'regulatory-impact',
  description:
    'Government policy analysis: economic/social/environmental impacts, stakeholder feedback, risk assessment, recommendation',
  normalize(raw) {
    if (typeof raw === 'object' && raw !== null && 'description' in raw && 'objectives' in raw) {
      return raw as Policy;
    }
    const content = (raw as { content?: string })?.content ?? '';
    return {
      title: 'Policy Proposal',
      description: content,
      objectives: [],
      scope: 'Not specified',
      stakeholders: [],
    };
  },
  async run(policyInput, session) {
    const policy = policyInput as Policy;
    const config: RegulatoryImpactConfig = {
      ...DEFAULT_CONFIG,
      ...(session.flags.config as Partial<RegulatoryImpactConfig> | undefined),
    };

    // Engine model override wins over legacy per-role config models.
    const explicitModel = session.models.override;
    if (explicitModel) {
      config.models = {
        economic: explicitModel,
        social: explicitModel,
        environmental: explicitModel,
        stakeholder: explicitModel,
        risk: explicitModel,
        synthesizer: explicitModel,
      };
    }

    // Phase 1: Multi-dimensional analysis (parallel)
    session.phase('Multi-Dimensional Analysis', 'economic, social, environmental in parallel');

    const { system: econSystem, user: econUser } = buildEconomicPrompt(policy, config);
    const { system: socialSystem, user: socialUser } = buildSocialPrompt(policy, config);
    const { system: envSystem, user: envUser } = buildEnvironmentalPrompt(policy, config);

    const [econStep, socialStep, envStep] = await session.parallel([
      {
        name: 'economic-analyst',
        prompt: econUser,
        temperature: config.parameters.temperature,
        maxTokens: 4096,
        systemPrompt: econSystem,
      },
      {
        name: 'social-analyst',
        prompt: socialUser,
        temperature: config.parameters.temperature,
        maxTokens: 4096,
        systemPrompt: socialSystem,
      },
      {
        name: 'environmental-analyst',
        prompt: envUser,
        temperature: config.parameters.temperature,
        maxTokens: 4096,
        systemPrompt: envSystem,
      },
    ]);

    const economic = parseEconomicResponse(econStep.content);
    const social = parseSocialResponse(socialStep.content);
    const environmental = parseEnvironmentalResponse(envStep.content);

    // Phase 2: Stakeholder feedback (sequential -- each represents a distinct voice)
    session.phase('Stakeholder Feedback');
    const stakeholderTypes = [
      'Industry/Business Representatives',
      'Consumer Advocates',
      'Civil Liberties Groups',
      'Environmental Organizations',
      'Labor Unions',
      'Small Business Owners',
      'Technology Companies',
      'Public Interest Groups',
    ];
    const selectedStakeholders = stakeholderTypes.slice(0, config.parameters.stakeholderCount);
    const stakeholderFeedback: StakeholderFeedback[] = [];

    for (const stakeholder of selectedStakeholders) {
      const { system, user } = buildStakeholderPrompt(policy, stakeholder, config);
      try {
        const response = await session.step({
          name: `stakeholder-${stakeholder.replace(/\s+/g, '-').toLowerCase()}`,
          prompt: user,
          temperature: config.parameters.temperature,
          maxTokens: 4096,
          systemPrompt: system,
        });
        stakeholderFeedback.push(parseStakeholderResponse(response.content, stakeholder));
      } catch (error) {
        session.note(
          `Failed to get feedback from ${stakeholder}: ${error instanceof Error ? error.message : String(error)}`
        );
        stakeholderFeedback.push({
          stakeholder,
          concerns: ['Unable to provide detailed feedback'],
          support: [],
          suggestions: ['Please provide more policy details'],
        });
      }
    }
    session.note(`${stakeholderFeedback.length} stakeholder perspectives gathered`);

    // Phase 3: Risk assessment
    session.phase('Risk Assessment');
    const { system: riskSystem, user: riskUser } = buildRiskPrompt(
      policy,
      economic,
      social,
      environmental,
      config
    );
    const riskStep = await session.step({
      name: 'risk-analyst',
      prompt: riskUser,
      temperature: config.parameters.temperature,
      maxTokens: 4096,
      systemPrompt: riskSystem,
    });
    const risks = parseRiskResponse(riskStep.content);
    session.note(`${risks.risks.length} risks identified`);

    // Phase 4: Synthesize recommendation
    session.phase('Recommendation');
    const recommendation = synthesizeRecommendation(
      economic,
      social,
      environmental,
      stakeholderFeedback,
      risks
    );
    session.note(`Recommendation: ${recommendation.decision.toUpperCase()}`);

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
        duration: 0, // engine records duration; audit log carries timings
        costUSD: 0, // replaced from audit log below
        modelUsage: config.models,
        decision:
          recommendation.decision === 'proceed'
            ? 'approve'
            : recommendation.decision === 'revise'
              ? 'delay'
              : 'reject',
      },
    };
  },
});

/** Backward-compatible entry returning the bare result. */
export async function run(
  input: Policy | { content: string },
  flags: RunFlags = {},
  sinks: EventSink[] = []
): Promise<RegulatoryImpactResult> {
  const { result, auditLog } = await regulatoryImpact(input, flags, sinks);
  result.metadata.costUSD = auditLog.metadata.totalCost;
  return result;
}

export { runAssessment } from './orchestrator';
export * from './types';

function synthesizeRecommendation(
  economic: EconomicImpact,
  social: SocialImpact,
  environmental: EnvironmentalImpact,
  stakeholderFeedback: StakeholderFeedback[],
  risks: RiskAssessment
): { decision: 'proceed' | 'revise' | 'reject'; rationale: string; conditions?: string[] } {
  // Count high risks
  const highRisks = risks.risks.filter(
    (r) => r.likelihood === 'high' && r.impact === 'high'
  ).length;
  const mediumRisks = risks.risks.filter(
    (r) =>
      (r.likelihood === 'high' || r.impact === 'high') &&
      !(r.likelihood === 'high' && r.impact === 'high')
  ).length;

  // Count stakeholder concerns vs support
  const totalConcerns = stakeholderFeedback.reduce((sum, s) => sum + s.concerns.length, 0);
  const totalSupport = stakeholderFeedback.reduce((sum, s) => sum + s.support.length, 0);

  // Determine decision
  let decision: 'proceed' | 'revise' | 'reject' = 'proceed';
  let rationale = '';
  let conditions: string[] = [];

  if (highRisks >= 3 || totalConcerns > totalSupport * 2) {
    decision = 'reject';
    rationale = `Assessment reveals ${highRisks} high-severity risks and significant stakeholder opposition (${totalConcerns} concerns vs ${totalSupport} points of support). The policy poses unacceptable risks without adequate mitigation strategies.`;
  } else if (highRisks >= 1 || mediumRisks >= 3 || totalConcerns > totalSupport) {
    decision = 'revise';
    rationale = `Policy shows promise but requires revision to address ${highRisks > 0 ? 'critical risks' : 'significant concerns'}. Stakeholder feedback indicates areas needing improvement before implementation.`;
    conditions = [
      'Address high-priority risks identified in assessment',
      'Incorporate stakeholder suggestions for improvement',
      'Develop detailed implementation plan with mitigation strategies',
      'Re-assess after revisions before final approval',
    ];
  } else {
    decision = 'proceed';
    rationale = `Policy demonstrates favorable risk profile with manageable concerns. Economic benefits justify implementation costs, and stakeholder feedback is generally supportive.`;
    conditions = [
      'Monitor implementation against identified risks',
      'Establish feedback mechanisms for affected groups',
      'Review effectiveness after initial rollout',
    ];
  }

  return { decision, rationale, conditions };
}
