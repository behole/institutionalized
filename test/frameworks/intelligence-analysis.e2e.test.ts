import { describe, test, expect } from 'bun:test';
import { run } from '../../frameworks/intelligence-analysis';

const hasApiKey = !!process.env.ANTHROPIC_API_KEY;
(hasApiKey ? describe : describe.skip)('Intelligence Analysis Framework E2E', () => {
  test('should analyze competing hypotheses', async () => {
    const input = {
      question: 'Why is our API latency suddenly increased by 300%?',
      evidence: [
        'Latency spike started at 14:00 UTC yesterday',
        'Database CPU usage is normal',
        'No deployments in past 48 hours',
        'Third-party payment API showing timeouts',
        'Cache hit rate dropped from 85% to 45%',
        'New marketing campaign launched yesterday',
        'Traffic increased 5x starting at 14:00 UTC',
      ],
    };

    const result = await run(input);

    expect(result).toBeDefined();
    expect(result.question).toBe(input.question);

    expect(Array.isArray(result.hypotheses)).toBe(true);
    expect(result.hypotheses.length).toBeGreaterThan(0);

    result.hypotheses.forEach((h) => {
      expect(h.hypothesis).toBeDefined();
      expect(Array.isArray(h.supportingEvidence)).toBe(true);
      expect(Array.isArray(h.contradictingEvidence)).toBe(true);
      expect(typeof h.probability).toBe('number');
    });

    expect(result.analysis).toBeDefined();
    expect(result.analysis.mostLikely).toBeDefined();
    expect(result.analysis.keyUncertainties).toBeDefined();
    expect(result.analysis.recommendedTests).toBeDefined();

    console.log('\n✅ Intelligence Analysis E2E Test Result:');
    console.log(`   Question: ${result.question.substring(0, 50)}...`);
    console.log(`   Hypotheses: ${result.hypotheses.length}`);
    console.log(`   Most likely: ${result.analysis.mostLikely.substring(0, 50)}...`);
  }, 120000);

  test('should handle content-only input', async () => {
    const result = await run({
      content:
        'Our system is slow. Database is fine. No deployments. Traffic is up. Cache hit rate down.',
    });

    expect(result).toBeDefined();
    expect(Array.isArray(result.hypotheses)).toBe(true);
    expect(result.analysis).toBeDefined();
  }, 60000);
});
