import { describe, test, expect } from 'bun:test';
import { run } from '../../frameworks/grant-panel';

const hasApiKey = !!process.env.ANTHROPIC_API_KEY;
(hasApiKey ? describe : describe.skip)('Grant Review Panel Framework E2E', () => {
  test('should evaluate and rank proposals', async () => {
    const input = {
      proposals: [
        {
          id: 'P001',
          title: 'AI for Early Disease Detection',
          summary: 'Develop ML models to detect early signs of diabetes from routine blood tests.',
          budget: 250000,
          duration: '24 months',
        },
        {
          id: 'P002',
          title: 'Quantum-Resistant Cryptography',
          summary: 'Research post-quantum cryptographic algorithms for secure communications.',
          budget: 400000,
          duration: '36 months',
        },
        {
          id: 'P003',
          title: 'Sustainable Battery Technology',
          summary: 'Develop biodegradable battery components using organic materials.',
          budget: 180000,
          duration: '18 months',
        },
      ],
      totalBudget: 500000,
      criteria: ['Scientific merit', 'Feasibility', 'Impact potential', 'Value for money'],
    };

    const result = await run(input);

    expect(result).toBeDefined();
    expect(Array.isArray(result.reviews)).toBe(true);
    expect(result.reviews.length).toBe(input.proposals.length);

    result.reviews.forEach((review) => {
      expect(review.proposalId).toBeDefined();
      expect(review.scores).toBeDefined();
      expect(typeof review.totalScore).toBe('number');
      expect(review.totalScore).toBeGreaterThanOrEqual(0);
      expect(review.totalScore).toBeLessThanOrEqual(10);
    });

    expect(Array.isArray(result.ranking)).toBe(true);
    expect(result.ranking.length).toBe(input.proposals.length);

    expect(result.fundingDecision).toBeDefined();
    expect(Array.isArray(result.fundingDecision.funded)).toBe(true);
    expect(typeof result.fundingDecision.totalAllocated).toBe('number');
    expect(result.fundingDecision.totalAllocated).toBeLessThanOrEqual(input.totalBudget);

    console.log('\n✅ Grant Panel E2E Test Result:');
    console.log(`   Proposals: ${input.proposals.length}`);
    console.log(`   Budget: $${input.totalBudget.toLocaleString()}`);
    console.log(`   Funded: ${result.fundingDecision.funded.length} proposals`);
    console.log(`   Allocated: $${result.fundingDecision.totalAllocated.toLocaleString()}`);
  }, 120000);

  test('should handle content-only input', async () => {
    const result = await run({
      content:
        'Three research proposals: AI healthcare ($200K), climate modeling ($300K), materials science ($150K). Total budget: $400K.',
    });

    expect(result).toBeDefined();
    expect(Array.isArray(result.ranking)).toBe(true);
    expect(result.fundingDecision).toBeDefined();
  }, 60000);
});
