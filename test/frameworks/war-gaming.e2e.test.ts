import { describe, test, expect } from 'bun:test';
import { run } from '../../frameworks/war-gaming';

const hasApiKey = !!process.env.ANTHROPIC_API_KEY;
(hasApiKey ? describe : describe.skip)('War Gaming Framework E2E', () => {
  test('should simulate strategic scenario', async () => {
    const input = {
      description: 'Market entry strategy for a new SaaS product in a competitive space',
      context: [
        'Established competitor has 70% market share',
        'Our product has superior AI features',
        'Limited marketing budget',
        '6-month runway to profitability',
      ],
      objectives: [
        'Gain 10% market share',
        'Achieve product-market fit',
        'Secure Series A funding',
      ],
    };

    const result = await run(input, {
      config: {
        parameters: {
          maxTurns: 3,
        },
      },
    });

    // Verify structure
    expect(result).toBeDefined();
    expect(result.scenario.description).toBe(input.description);
    expect(result.forces).toBeDefined();
    expect(Array.isArray(result.forces)).toBe(true);
    expect(result.forces.length).toBeGreaterThanOrEqual(2);

    // Verify forces
    result.forces.forEach((force) => {
      expect(force.force.name).toBeDefined();
      expect(force.force.strategy).toBeDefined();
      expect(Array.isArray(force.force.resources)).toBe(true);
      expect(Array.isArray(force.openingMoves)).toBe(true);
    });

    // Verify turns
    expect(result.turns).toBeDefined();
    expect(Array.isArray(result.turns)).toBe(true);
    expect(result.turns.length).toBeGreaterThan(0);

    result.turns.forEach((turn) => {
      expect(turn.turnNumber).toBeDefined();
      expect(Array.isArray(turn.forceActions)).toBe(true);
      expect(turn.controlAssessment).toBeDefined();
      expect(Array.isArray(turn.emergingThreats)).toBe(true);
    });

    // Verify outcome
    expect(result.outcome).toBeDefined();
    expect(typeof result.outcome.draw).toBe('boolean');
    expect(result.outcome.finalState).toBeDefined();
    expect(Array.isArray(result.outcome.keyDecisions)).toBe(true);

    // Verify insights
    expect(result.insights).toBeDefined();
    expect(Array.isArray(result.insights)).toBe(true);

    console.log('\n✅ War Gaming E2E Test Result:');
    console.log(`   Scenario: ${result.scenario.description}`);
    console.log(`   Forces: ${result.forces.map((f) => f.force.name).join(', ')}`);
    console.log(`   Turns: ${result.turns.length}`);
    console.log(`   Outcome: ${result.outcome.draw ? 'Draw' : result.outcome.winner + ' wins'}`);
  }, 120000);

  test('should handle content-only input', async () => {
    const result = await run(
      { content: 'Competitive scenario: Startup vs Incumbent in cloud infrastructure' },
      {
        config: {
          parameters: {
            maxTurns: 2,
          },
        },
      }
    );

    expect(result).toBeDefined();
    expect(result.scenario.description).toContain('Startup vs Incumbent');
    expect(result.forces.length).toBeGreaterThanOrEqual(2);
    expect(result.turns.length).toBeGreaterThan(0);
  }, 60000);
});
