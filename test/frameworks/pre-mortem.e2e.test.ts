import { describe, test, expect } from 'bun:test';
import { run } from '../../frameworks/pre-mortem';

const hasApiKey = !!process.env.ANTHROPIC_API_KEY;
(hasApiKey ? describe : describe.skip)('Pre-mortem Framework E2E', () => {
  test('should identify failure scenarios', async () => {
    const input = {
      plan: 'Launch new mobile app in 3 months',
      goal: '10,000 downloads in first month',
      context: 'First mobile product for web-first company, team of 5 developers',
      timeline: '3 months',
    };

    const result = await run(input, {
      config: {
        parameters: {
          pessimistCount: 4, // Smaller for faster testing
        },
      },
    });

    // Verify structure
    expect(result).toBeDefined();
    expect(result.plan).toBeDefined();
    expect(result.failureScenarios).toBeDefined();
    expect(result.synthesis).toBeDefined();

    // Verify failure scenarios
    expect(Array.isArray(result.failureScenarios)).toBe(true);
    expect(result.failureScenarios.length).toBe(4);

    result.failureScenarios.forEach((scenario) => {
      expect(scenario.pessimistId).toBeDefined();
      expect(scenario.scenario).toBeDefined();
      expect(scenario.reasoning).toBeDefined();
      expect(scenario.warningSignals).toBeDefined();
      expect(Array.isArray(scenario.warningSignals)).toBe(true);
      expect(scenario.likelihood).toMatch(/low|medium|high/);
      expect(scenario.impact).toMatch(/low|medium|high/);
    });

    // Verify synthesis
    expect(result.synthesis.criticalRisks).toBeDefined();
    expect(Array.isArray(result.synthesis.criticalRisks)).toBe(true);
    expect(result.synthesis.mitigations).toBeDefined();
    expect(result.synthesis.earlyWarnings).toBeDefined();
    expect(result.synthesis.recommendation).toBeDefined();

    console.log('\n✅ Pre-mortem E2E Test Result:');
    console.log(`   Plan: ${result.plan.plan}`);
    console.log(`   Failure Scenarios: ${result.failureScenarios.length}`);
    console.log(`   Critical Risks: ${result.synthesis.criticalRisks.length}`);
    console.log(`   Top Risk: ${result.synthesis.criticalRisks[0]?.risk || 'N/A'}`);
  }, 75000);

  test('should handle content-only input', async () => {
    const result = await run(
      { content: 'Rewrite entire codebase from scratch in 2 weeks' },
      {
        config: {
          parameters: {
            pessimistCount: 3,
          },
        },
      }
    );

    expect(result).toBeDefined();
    expect(result.failureScenarios.length).toBe(3);
    expect(result.synthesis.criticalRisks.length).toBeGreaterThan(0);
  }, 60000);

  test('should identify diverse failure modes', async () => {
    const input = {
      plan: 'Migrate database to new platform during peak season',
      goal: 'Zero downtime, complete in 1 weekend',
      context: 'E-commerce site, Black Friday approaching, 100K daily users',
    };

    const result = await run(input, {
      config: {
        parameters: {
          pessimistCount: 5,
        },
      },
    });

    // Scenarios should be diverse (not all the same)
    const scenarios = result.failureScenarios.map((s) => s.scenario);
    const uniqueScenarios = new Set(scenarios);
    expect(uniqueScenarios.size).toBeGreaterThan(2); // At least 3 different scenarios

    // Should have mix of likelihoods and impacts
    const likelihoods = result.failureScenarios.map((s) => s.likelihood);
    const impacts = result.failureScenarios.map((s) => s.impact);
    expect(new Set(likelihoods).size).toBeGreaterThan(1);
    expect(new Set(impacts).size).toBeGreaterThan(1);

    console.log('\n✅ Pre-mortem Diversity Test:');
    console.log(`   Unique Scenarios: ${uniqueScenarios.size} / ${scenarios.length}`);
    console.log(`   Likelihood Distribution: ${Array.from(new Set(likelihoods)).join(', ')}`);
    console.log(`   Impact Distribution: ${Array.from(new Set(impacts)).join(', ')}`);
  }, 90000);
});
