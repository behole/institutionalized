import { describe, test, expect } from 'bun:test';
import { run } from '../../frameworks/delphi';

const hasApiKey = !!process.env.ANTHROPIC_API_KEY;
(hasApiKey ? describe : describe.skip)('Delphi Method Framework E2E', () => {
  test('should build expert consensus', async () => {
    const input = {
      question:
        'How many engineers will we need to hire in the next 12 months to meet our product roadmap?',
      context: [
        'Current team: 15 engineers',
        'Product roadmap: 3 major features, 10 minor enhancements',
        'Revenue target: 3x growth',
        'Current attrition rate: 10% annually',
        'Average time to hire: 3 months',
      ],
      rounds: 2,
    };

    const result = await run(input, {
      config: {
        parameters: {
          expertCount: 3,
          rounds: 2,
        },
      },
    });

    expect(result).toBeDefined();
    expect(result.question).toBe(input.question);

    expect(Array.isArray(result.rounds)).toBe(true);
    expect(result.rounds.length).toBe(2);

    result.rounds.forEach((round) => {
      expect(round.roundNumber).toBeDefined();
      expect(Array.isArray(round.estimates)).toBe(true);
      round.estimates.forEach((est) => {
        expect(est.expert).toBeDefined();
        expect(typeof est.estimate).toBe('number');
        expect(est.reasoning).toBeDefined();
      });
    });

    expect(result.consensus).toBeDefined();
    expect(typeof result.consensus.finalEstimate).toBe('number');
    expect(result.consensus.confidence).toBeDefined();
    expect(Array.isArray(result.consensus.outliers)).toBe(true);

    console.log('\n✅ Delphi Method E2E Test Result:');
    console.log(`   Question: ${result.question.substring(0, 50)}...`);
    console.log(`   Rounds: ${result.rounds.length}`);
    console.log(`   Consensus: ${result.consensus.finalEstimate}`);
    console.log(`   Confidence: ${result.consensus.confidence}`);
  }, 120000);

  test('should handle content-only input', async () => {
    const result = await run({
      content: 'How long will it take to rebuild our authentication system?',
    });

    expect(result).toBeDefined();
    expect(Array.isArray(result.rounds)).toBe(true);
    expect(result.consensus).toBeDefined();
  }, 60000);
});
