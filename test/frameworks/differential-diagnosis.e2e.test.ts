import { describe, test, expect } from 'bun:test';
import { run } from '../../frameworks/differential-diagnosis';

const hasApiKey = !!process.env.ANTHROPIC_API_KEY;
(hasApiKey ? describe : describe.skip)('Differential Diagnosis Framework E2E', () => {
  test('should diagnose system issues systematically', async () => {
    const input = {
      symptoms: [
        'API response times increased from 50ms to 2s',
        'Intermittent 500 errors on 5% of requests',
        'Memory usage climbing steadily over 6 hours',
        'CPU usage normal',
        'Database connections stable',
        "Error logs show 'Connection pool exhausted'",
        'Redis cache responding normally',
        "Issue started after yesterday's deployment",
      ],
      context: 'Production web application serving 10K requests/minute',
    };

    const result = await run(input);

    expect(result).toBeDefined();
    expect(Array.isArray(result.symptoms)).toBe(true);

    expect(Array.isArray(result.differentialDiagnoses)).toBe(true);
    expect(result.differentialDiagnoses.length).toBeGreaterThan(0);

    result.differentialDiagnoses.forEach((diag) => {
      expect(diag.condition).toBeDefined();
      expect(typeof diag.likelihood).toBe('number');
      expect(diag.likelihood).toBeGreaterThanOrEqual(0);
      expect(diag.likelihood).toBeLessThanOrEqual(1);
      expect(Array.isArray(diag.supportingEvidence)).toBe(true);
      expect(Array.isArray(diag.contradictingEvidence)).toBe(true);
    });

    expect(result.mostLikely).toBeDefined();
    expect(result.mostLikely.condition).toBeDefined();

    expect(Array.isArray(result.recommendedTests)).toBe(true);
    expect(Array.isArray(result.treatmentPlan)).toBe(true);

    console.log('\n✅ Differential Diagnosis E2E Test Result:');
    console.log(`   Symptoms: ${result.symptoms.length}`);
    console.log(`   Diagnoses: ${result.differentialDiagnoses.length}`);
    console.log(`   Most likely: ${result.mostLikely.condition}`);
    console.log(`   Confidence: ${(result.mostLikely.likelihood * 100).toFixed(0)}%`);
  }, 120000);

  test('should handle content-only input', async () => {
    const result = await run({
      content:
        'Our application is slow and sometimes crashes. Memory usage is high. Started after last update.',
    });

    expect(result).toBeDefined();
    expect(Array.isArray(result.differentialDiagnoses)).toBe(true);
    expect(result.mostLikely).toBeDefined();
  }, 60000);
});
