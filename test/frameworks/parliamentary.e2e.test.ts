import { describe, test, expect } from 'bun:test';
import { run } from '../../frameworks/parliamentary';

const hasApiKey = !!process.env.ANTHROPIC_API_KEY;
(hasApiKey ? describe : describe.skip)('Parliamentary Debate Framework E2E', () => {
  test('should conduct adversarial policy debate', async () => {
    const input = {
      motion:
        'This House believes the company should adopt an open-source first policy for all new internal tools.',
      context: [
        'Current: Mix of proprietary and open-source tools',
        'Engineering team prefers open-source',
        'Legal concerns about compliance',
        'Some tools have no open-source alternatives',
        'Cost savings potential: $200K/year',
        'Security team skeptical',
      ],
    };

    const result = await run(input, {
      config: {
        parameters: {
          backbenchers: 3,
        },
      },
    });

    expect(result).toBeDefined();
    expect(result.motion).toBe(input.motion);

    expect(result.government).toBeDefined();
    expect(result.government.case).toBeDefined();
    expect(Array.isArray(result.government.arguments)).toBe(true);

    expect(result.opposition).toBeDefined();
    expect(result.opposition.rebuttal).toBeDefined();
    expect(Array.isArray(result.opposition.counterArguments)).toBe(true);

    expect(Array.isArray(result.backbenchers)).toBe(true);
    expect(result.backbenchers.length).toBeGreaterThan(0);

    expect(result.vote).toBeDefined();
    expect(typeof result.vote.ayes).toBe('number');
    expect(typeof result.vote.noes).toBe('number');
    expect(typeof result.vote.abstentions).toBe('number');
    expect(result.vote.outcome).toMatch(/passed|rejected|tied/);

    expect(Array.isArray(result.debateRecord)).toBe(true);

    console.log('\n✅ Parliamentary Debate E2E Test Result:');
    console.log(`   Motion: ${result.motion.substring(0, 50)}...`);
    console.log(`   Government args: ${result.government.arguments.length}`);
    console.log(`   Opposition args: ${result.opposition.counterArguments.length}`);
    console.log(`   Backbenchers: ${result.backbenchers.length}`);
    console.log(`   Vote: ${result.vote.ayes}-${result.vote.noes}-${result.vote.abstentions}`);
    console.log(`   Outcome: ${result.vote.outcome.toUpperCase()}`);
  }, 120000);

  test('should handle content-only input', async () => {
    const result = await run({
      content: 'Should we mandate return to office 3 days a week?',
    });

    expect(result).toBeDefined();
    expect(result.government).toBeDefined();
    expect(result.opposition).toBeDefined();
    expect(result.vote).toBeDefined();
  }, 60000);
});
