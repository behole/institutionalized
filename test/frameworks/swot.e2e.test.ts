import { describe, test, expect } from 'bun:test';
import { run } from '../../frameworks/swot';

const hasApiKey = !!process.env.ANTHROPIC_API_KEY;
(hasApiKey ? describe : describe.skip)('SWOT Analysis Framework E2E', () => {
  test('should perform comprehensive SWOT analysis', async () => {
    const input = {
      subject: 'Expand into European market',
      context: [
        'Current: US-only SaaS company, $10M ARR',
        'Product: Project management software',
        'Team: 50 employees, mostly US-based',
        'Competitors: Asana, Monday.com, Notion',
        'GDPR compliance required',
        'Euro currency fluctuations',
        'Strong demand for productivity tools in EU',
      ],
    };

    const result = await run(input);

    expect(result).toBeDefined();
    expect(result.subject).toBe(input.subject);

    expect(result.swot).toBeDefined();
    expect(Array.isArray(result.swot.strengths)).toBe(true);
    expect(Array.isArray(result.swot.weaknesses)).toBe(true);
    expect(Array.isArray(result.swot.opportunities)).toBe(true);
    expect(Array.isArray(result.swot.threats)).toBe(true);

    expect(result.swot.strengths.length).toBeGreaterThan(0);
    expect(result.swot.weaknesses.length).toBeGreaterThan(0);
    expect(result.swot.opportunities.length).toBeGreaterThan(0);
    expect(result.swot.threats.length).toBeGreaterThan(0);

    expect(result.strategy).toBeDefined();
    expect(result.strategy.so).toBeDefined();
    expect(result.strategy.wo).toBeDefined();
    expect(result.strategy.st).toBeDefined();
    expect(result.strategy.wt).toBeDefined();

    expect(result.recommendation).toBeDefined();
    expect(['proceed', 'proceed_with_caution', 'delay', 'reconsider']).toContain(
      result.recommendation.decision
    );

    console.log('\n✅ SWOT Analysis E2E Test Result:');
    console.log(`   Subject: ${result.subject}`);
    console.log(`   Strengths: ${result.swot.strengths.length}`);
    console.log(`   Weaknesses: ${result.swot.weaknesses.length}`);
    console.log(`   Opportunities: ${result.swot.opportunities.length}`);
    console.log(`   Threats: ${result.swot.threats.length}`);
    console.log(`   Decision: ${result.recommendation.decision.toUpperCase().replace(/_/g, ' ')}`);
  }, 120000);

  test('should handle content-only input', async () => {
    const result = await run({
      content: 'Launch a new mobile app for our existing web platform.',
    });

    expect(result).toBeDefined();
    expect(result.swot).toBeDefined();
    expect(result.strategy).toBeDefined();
    expect(result.recommendation).toBeDefined();
  }, 60000);
});
