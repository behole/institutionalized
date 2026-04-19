import { describe, test, expect } from 'bun:test';
import { run } from '../../frameworks/hegelian';

const hasApiKey = !!process.env.ANTHROPIC_API_KEY;
(hasApiKey ? describe : describe.skip)('Hegelian Dialectic Framework E2E', () => {
  test('should perform dialectical synthesis', async () => {
    const input = {
      context:
        'A software company is deciding whether to build a new feature in-house or use a third-party service.',
      thesis:
        'We should build everything in-house to maintain control, quality, and competitive advantage.',
      constraints: ['Limited engineering resources', '6-month deadline', 'Budget of $200K'],
      objectives: ['Launch feature quickly', 'Maintain high quality', 'Stay within budget'],
    };

    const result = await run(input);

    // Verify structure
    expect(result).toBeDefined();
    expect(result.problem.context).toBe(input.context);
    expect(result.problem.thesis).toBe(input.thesis);

    // Verify thesis
    expect(result.thesis).toBeDefined();
    expect(result.thesis.position).toBeDefined();
    expect(typeof result.thesis.position).toBe('string');
    expect(result.thesis.rationale).toBeDefined();
    expect(Array.isArray(result.thesis.supportingArguments)).toBe(true);
    expect(result.thesis.supportingArguments.length).toBeGreaterThan(0);
    expect(Array.isArray(result.thesis.underlyingAssumptions)).toBe(true);

    // Verify antithesis
    expect(result.antithesis).toBeDefined();
    expect(result.antithesis.position).toBeDefined();
    expect(typeof result.antithesis.position).toBe('string');
    expect(result.antithesis.rationale).toBeDefined();
    expect(Array.isArray(result.antithesis.counterArguments)).toBe(true);
    expect(result.antithesis.counterArguments.length).toBeGreaterThan(0);
    expect(Array.isArray(result.antithesis.contradictionsIdentified)).toBe(true);

    // Verify antithesis genuinely opposes thesis
    expect(result.antithesis.position.toLowerCase()).not.toBe(result.thesis.position.toLowerCase());

    // Verify synthesis
    expect(result.synthesis).toBeDefined();
    expect(result.synthesis.integratedPosition).toBeDefined();
    expect(typeof result.synthesis.integratedPosition).toBe('string');
    expect(result.synthesis.howItResolves).toBeDefined();
    expect(Array.isArray(result.synthesis.preservesFromThesis)).toBe(true);
    expect(Array.isArray(result.synthesis.preservesFromAntithesis)).toBe(true);
    expect(Array.isArray(result.synthesis.transcendsBoth)).toBe(true);

    // Verify insights
    expect(result.insights).toBeDefined();
    expect(Array.isArray(result.insights)).toBe(true);
    expect(result.insights.length).toBeGreaterThan(0);

    result.insights.forEach((insight) => {
      expect(insight.insight).toBeDefined();
      expect(['thesis', 'antithesis', 'synthesis']).toContain(insight.source);
      expect(insight.application).toBeDefined();
    });

    console.log('\n✅ Hegelian Dialectic E2E Test Result:');
    console.log(`   Context: ${result.problem.context.substring(0, 50)}...`);
    console.log(`   Thesis: ${result.thesis.position.substring(0, 50)}...`);
    console.log(`   Antithesis: ${result.antithesis.position.substring(0, 50)}...`);
    console.log(`   Synthesis: ${result.synthesis.integratedPosition.substring(0, 50)}...`);
    console.log(`   Insights: ${result.insights.length}`);
  }, 120000);

  test('should handle content-only input', async () => {
    const result = await run({
      content:
        'Should our remote-first company require employees to come to the office twice a week?',
    });

    expect(result).toBeDefined();
    expect(result.problem.context).toContain('remote-first company');
    expect(result.thesis).toBeDefined();
    expect(result.antithesis).toBeDefined();
    expect(result.synthesis).toBeDefined();
  }, 60000);
});
