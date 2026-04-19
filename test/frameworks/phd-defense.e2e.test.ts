import { describe, test, expect } from 'bun:test';
import { run } from '../../frameworks/phd-defense';

const hasApiKey = !!process.env.ANTHROPIC_API_KEY;
(hasApiKey ? describe : describe.skip)('PhD Defense Framework E2E', () => {
  test('should conduct rigorous proposal defense', async () => {
    const input = {
      title: 'Scalable Graph Neural Networks for Dynamic Networks',
      abstract: `This dissertation develops novel methods for training graph neural networks (GNNs) on dynamic networks that change over time. Current GNN approaches assume static graph structures, limiting their applicability to real-world scenarios like social networks, financial transactions, and communication systems.

Key contributions:
1. Temporal Graph Attention mechanism that captures time-varying relationships
2. Incremental training algorithm that updates models efficiently as graphs evolve
3. Theoretical analysis of convergence properties under graph dynamics
4. Empirical validation on 5 real-world dynamic network datasets`,
      methodology: `The research combines theoretical analysis with empirical evaluation:

1. Theoretical Framework:
   - Extend spectral graph theory to temporal graphs
   - Prove convergence bounds for incremental updates
   - Analyze computational complexity

2. Algorithm Development:
   - Design temporal attention mechanism
   - Implement incremental training procedure
   - Optimize for GPU parallelism

3. Evaluation:
   - Test on social network, financial, and communication datasets
   - Compare against 8 baseline methods
   - Measure accuracy, efficiency, and scalability`,
      contributions: [
        'Novel temporal graph attention mechanism',
        'Incremental training algorithm with theoretical guarantees',
        'Open-source implementation and benchmark datasets',
        'Comprehensive empirical evaluation',
      ],
    };

    const result = await run(input, {
      config: {
        parameters: {
          committeeSize: 3,
        },
      },
    });

    expect(result).toBeDefined();
    expect(result.proposal.title).toBe(input.title);

    expect(result.committee).toBeDefined();
    expect(Array.isArray(result.committee)).toBe(true);
    expect(result.committee.length).toBe(3);

    expect(Array.isArray(result.questions)).toBe(true);
    expect(result.questions.length).toBeGreaterThan(0);

    result.questions.forEach((q) => {
      expect(q.question).toBeDefined();
      expect(q.committeeMember).toBeDefined();
      expect(q.category).toBeDefined();
    });

    expect(result.defense).toBeDefined();
    expect(Array.isArray(result.defense.responses)).toBe(true);

    expect(result.verdict).toBeDefined();
    expect(['pass', 'pass_with_revisions', 'fail']).toContain(result.verdict.decision);

    console.log('\n✅ PhD Defense E2E Test Result:');
    console.log(`   Proposal: ${result.proposal.title.substring(0, 50)}...`);
    console.log(`   Committee: ${result.committee.length} members`);
    console.log(`   Questions: ${result.questions.length}`);
    console.log(`   Verdict: ${result.verdict.decision.toUpperCase().replace(/_/g, ' ')}`);
  }, 120000);

  test('should handle content-only input', async () => {
    const result = await run({
      content:
        'A dissertation proposal on using reinforcement learning for autonomous vehicle navigation.',
    });

    expect(result).toBeDefined();
    expect(Array.isArray(result.questions)).toBe(true);
    expect(result.verdict).toBeDefined();
  }, 60000);
});
