import { describe, test, expect } from 'bun:test';
import { run } from '../../frameworks/regulatory-impact';

const hasApiKey = !!process.env.ANTHROPIC_API_KEY;
(hasApiKey ? describe : describe.skip)('Regulatory Impact Assessment Framework E2E', () => {
  test('should assess policy comprehensively', async () => {
    const input = {
      title: 'Mandatory Data Privacy Certification for AI Companies',
      description: `A proposed regulation requiring all companies developing or deploying AI systems to obtain third-party privacy certification. The certification would verify compliance with data minimization principles, user consent mechanisms, and algorithmic transparency standards.

Key provisions:
- Annual third-party audits
- Public disclosure of data practices
- User right to explanation for AI decisions
- Mandatory privacy impact assessments for new AI features
- Penalties up to 4% of global revenue for non-compliance`,
      objectives: [
        'Protect user privacy in AI systems',
        'Increase transparency and accountability',
        'Build public trust in AI technologies',
        'Create level playing field for responsible companies',
      ],
      scope: 'All companies with AI systems processing personal data of 10,000+ users',
      stakeholders: [
        'AI companies and startups',
        'Privacy advocates',
        'Consumer protection groups',
        'Enterprise customers',
        'Regulatory bodies',
      ],
    };

    const result = await run(input);

    // Verify structure
    expect(result).toBeDefined();
    expect(result.policy.title).toBe(input.title);
    expect(result.policy.description).toBe(input.description);

    // Verify economic impact
    expect(result.economic).toBeDefined();
    expect(result.economic.costs).toBeDefined();
    expect(result.economic.costs.implementation).toBeDefined();
    expect(result.economic.benefits).toBeDefined();
    expect(Array.isArray(result.economic.marketEffects)).toBe(true);

    // Verify social impact
    expect(result.social).toBeDefined();
    expect(Array.isArray(result.social.affectedGroups)).toBe(true);
    expect(Array.isArray(result.social.equityConcerns)).toBe(true);

    // Verify environmental impact
    expect(result.environmental).toBeDefined();
    expect(Array.isArray(result.environmental.directEffects)).toBe(true);
    expect(result.environmental.carbonFootprint).toBeDefined();

    // Verify stakeholder feedback
    expect(result.stakeholderFeedback).toBeDefined();
    expect(Array.isArray(result.stakeholderFeedback)).toBe(true);
    expect(result.stakeholderFeedback.length).toBeGreaterThan(0);

    // Verify risk assessment
    expect(result.risks).toBeDefined();
    expect(Array.isArray(result.risks.risks)).toBe(true);
    result.risks.risks.forEach((risk) => {
      expect(risk.description).toBeDefined();
      expect(['low', 'medium', 'high']).toContain(risk.likelihood);
      expect(['low', 'medium', 'high']).toContain(risk.impact);
      expect(risk.mitigation).toBeDefined();
    });

    // Verify recommendation
    expect(result.recommendation).toBeDefined();
    expect(['proceed', 'revise', 'reject']).toContain(result.recommendation.decision);
    expect(result.recommendation.rationale).toBeDefined();

    console.log('\n✅ Regulatory Impact E2E Test Result:');
    console.log(`   Policy: ${result.policy.title}`);
    console.log(`   Economic Costs: ${result.economic.costs.implementation}`);
    console.log(`   Stakeholders: ${result.stakeholderFeedback.length}`);
    console.log(`   Risks: ${result.risks.risks.length}`);
    console.log(`   Recommendation: ${result.recommendation.decision.toUpperCase()}`);
  }, 120000);

  test('should handle content-only input', async () => {
    const result = await run({
      content:
        'Proposed regulation requiring all social media platforms to verify user identities to reduce misinformation.',
    });

    expect(result).toBeDefined();
    expect(result.policy.title).toBe('Policy Proposal');
    expect(result.economic).toBeDefined();
    expect(result.social).toBeDefined();
    expect(result.recommendation.decision).toMatch(/proceed|revise|reject/);
  }, 60000);
});
