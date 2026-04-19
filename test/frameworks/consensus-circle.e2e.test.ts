import { describe, test, expect } from 'bun:test';
import { run } from '../../frameworks/consensus-circle';

const hasApiKey = !!process.env.ANTHROPIC_API_KEY;
(hasApiKey ? describe : describe.skip)('Consensus Circle Framework E2E', () => {
  test('should build consensus without voting', async () => {
    const input = {
      topic: 'Should we adopt a 4-day work week?',
      context: [
        'Current: 5-day, 40-hour work week',
        'Team size: 25 people',
        'Customer support needs 7-day coverage',
        'Some roles require on-call availability',
        'Company culture values work-life balance',
        'Competitors offer flexible schedules',
      ],
      participants: [
        'Engineering team representative',
        'Customer support manager',
        'HR director',
        'Finance controller',
        'Product manager',
      ],
    };

    const result = await run(input);

    expect(result).toBeDefined();
    expect(result.topic).toBe(input.topic);

    expect(Array.isArray(result.rounds)).toBe(true);
    expect(result.rounds.length).toBeGreaterThan(0);

    result.rounds.forEach((round) => {
      expect(round.roundNumber).toBeDefined();
      expect(Array.isArray(round.contributions)).toBe(true);
      round.contributions.forEach((c) => {
        expect(c.participant).toBeDefined();
        expect(c.perspective).toBeDefined();
      });
      expect(round.synthesizedUnderstanding).toBeDefined();
    });

    expect(result.consensus).toBeDefined();
    expect(typeof result.consensus.reached).toBe('boolean');
    expect(result.consensus.emergedDecision).toBeDefined();

    if (!result.consensus.reached) {
      expect(Array.isArray(result.consensus.blockingConcerns)).toBe(true);
    }

    console.log('\n✅ Consensus Circle E2E Test Result:');
    console.log(`   Topic: ${result.topic}`);
    console.log(`   Rounds: ${result.rounds.length}`);
    console.log(`   Consensus reached: ${result.consensus.reached ? 'Yes' : 'No'}`);
    if (result.consensus.reached) {
      console.log(`   Decision: ${result.consensus.emergedDecision.substring(0, 50)}...`);
    }
  }, 120000);

  test('should handle content-only input', async () => {
    const result = await run({
      content: 'Should we allow remote work permanently or require hybrid?',
    });

    expect(result).toBeDefined();
    expect(Array.isArray(result.rounds)).toBe(true);
    expect(result.consensus).toBeDefined();
  }, 60000);
});
