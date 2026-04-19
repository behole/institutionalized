import { describe, test, expect } from 'bun:test';
import { run } from '../../frameworks/socratic';

const hasApiKey = !!process.env.ANTHROPIC_API_KEY;
(hasApiKey ? describe : describe.skip)('Socratic Method Framework E2E', () => {
  test('should test assumptions through questioning', async () => {
    const input = {
      claim: 'We need to rewrite our entire backend in Rust to improve performance.',
      context: [
        'Current backend is in Python (Django)',
        'Handling 1000 requests/second',
        'Average response time: 120ms',
        'Team of 8 Python developers',
        'No Rust expertise in-house',
        'Performance complaints from enterprise customers',
      ],
      depth: 'deep',
    };

    const result = await run(input);

    expect(result).toBeDefined();
    expect(result.claim).toBe(input.claim);

    expect(Array.isArray(result.dialogue)).toBe(true);
    expect(result.dialogue.length).toBeGreaterThan(0);

    result.dialogue.forEach((exchange) => {
      expect(exchange.question).toBeDefined();
      expect(exchange.response).toBeDefined();
      expect(exchange.insight).toBeDefined();
    });

    expect(result.exposedAssumptions).toBeDefined();
    expect(Array.isArray(result.exposedAssumptions)).toBe(true);

    expect(result.refinedUnderstanding).toBeDefined();
    expect(result.refinedUnderstanding.coreIssue).toBeDefined();
    expect(result.refinedUnderstanding.revisedClaim).toBeDefined();

    console.log('\n✅ Socratic Method E2E Test Result:');
    console.log(`   Claim: ${result.claim.substring(0, 50)}...`);
    console.log(`   Questions: ${result.dialogue.length}`);
    console.log(`   Assumptions exposed: ${result.exposedAssumptions.length}`);
  }, 120000);

  test('should handle content-only input', async () => {
    const result = await run({
      content: 'We should switch to microservices architecture immediately.',
    });

    expect(result).toBeDefined();
    expect(Array.isArray(result.dialogue)).toBe(true);
    expect(result.refinedUnderstanding).toBeDefined();
  }, 60000);
});
