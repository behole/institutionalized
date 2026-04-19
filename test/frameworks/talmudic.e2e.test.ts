import { describe, test, expect } from 'bun:test';
import { run } from '../../frameworks/talmudic';

const hasApiKey = !!process.env.ANTHROPIC_API_KEY;
(hasApiKey ? describe : describe.skip)('Talmudic Dialectic Framework E2E', () => {
  test('should provide multi-interpretation analysis', async () => {
    const input = {
      text: `The API documentation states: "All requests must include a valid authentication token. Requests without authentication will be rejected with a 401 Unauthorized error."

However, the internal implementation shows that certain read-only endpoints (GET requests) accept requests without authentication but return limited data.`,
      context: 'Engineering team discussion about API security requirements',
      specificQuestion:
        'Does the documentation prohibit unauthenticated GET requests, or does it only apply to write operations?',
      constraints: [
        'Must maintain backward compatibility',
        'Security audit next month',
        'Cannot break existing integrations',
      ],
    };

    const result = await run(input, {
      config: {
        parameters: {
          interpreterCount: 3,
        },
      },
    });

    // Verify structure
    expect(result).toBeDefined();
    expect(result.problem.text).toBe(input.text);
    expect(result.problem.specificQuestion).toBe(input.specificQuestion);

    // Verify interpretations
    expect(result.interpretations).toBeDefined();
    expect(Array.isArray(result.interpretations)).toBe(true);
    expect(result.interpretations.length).toBe(3);

    result.interpretations.forEach((interp) => {
      expect(interp.interpreter).toBeDefined();
      expect(interp.interpretation).toBeDefined();
      expect(typeof interp.interpretation).toBe('string');
      expect(Array.isArray(interp.textualSupport)).toBe(true);
      expect(interp.textualSupport.length).toBeGreaterThan(0);
      expect(interp.reasoning).toBeDefined();
      expect(Array.isArray(interp.implications)).toBe(true);
    });

    // Verify counterpoints
    expect(result.counterpoints).toBeDefined();
    expect(Array.isArray(result.counterpoints)).toBe(true);
    expect(result.counterpoints.length).toBeGreaterThan(0);

    result.counterpoints.forEach((cp) => {
      expect(cp.respondsTo).toBeDefined();
      expect(cp.counterPoint).toBeDefined();
      expect(Array.isArray(cp.textualEvidence)).toBe(true);
      expect(cp.whyDifferent).toBeDefined();
    });

    // Verify resolutions
    expect(result.resolutions).toBeDefined();
    expect(Array.isArray(result.resolutions)).toBe(true);
    expect(result.resolutions.length).toBeGreaterThan(0);

    result.resolutions.forEach((res) => {
      expect(res.question).toBeDefined();
      expect(res.practicalRuling).toBeDefined();
      expect(res.reasoning).toBeDefined();
      expect(res.whenToApply).toBeDefined();
    });

    // Verify insights
    expect(result.insights).toBeDefined();
    expect(Array.isArray(result.insights)).toBe(true);

    console.log('\n✅ Talmudic Dialectic E2E Test Result:');
    console.log(`   Question: ${result.problem.specificQuestion?.substring(0, 50)}...`);
    console.log(`   Interpretations: ${result.interpretations.length}`);
    console.log(`   Counterpoints: ${result.counterpoints.length}`);
    console.log(`   Resolutions: ${result.resolutions.length}`);
    console.log(`   Insights: ${result.insights.length}`);
  }, 120000);

  test('should handle content-only input', async () => {
    const result = await run({
      content:
        'The contract states payment is due within 30 days. Does this mean business days or calendar days?',
    });

    expect(result).toBeDefined();
    expect(result.problem.text).toContain('payment is due');
    expect(result.interpretations.length).toBeGreaterThan(0);
    expect(result.resolutions.length).toBeGreaterThan(0);
  }, 60000);
});
