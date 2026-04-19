import { describe, test, expect } from 'bun:test';
import { run } from '../../frameworks/peer-review';

const hasApiKey = !!process.env.ANTHROPIC_API_KEY;
(hasApiKey ? describe : describe.skip)('Peer Review Framework E2E', () => {
  test('should conduct peer review with rebuttal', async () => {
    const input = {
      title: 'Distributed Consensus in Byzantine Environments: A Novel Approach',
      content: `Abstract

This paper presents a new consensus algorithm for distributed systems that operates efficiently in Byzantine fault-tolerant settings. Our approach reduces message complexity from O(n²) to O(n log n) while maintaining safety and liveness guarantees.

1. Introduction

Consensus algorithms are fundamental to distributed systems. Traditional approaches like PBFT achieve Byzantine fault tolerance but at significant communication cost. We propose Byzantine-Optimized Consensus (BOC), which uses a hierarchical aggregation strategy to reduce message passing.

2. Algorithm Design

BOC operates in three phases: proposal, aggregation, and commitment. In the aggregation phase, nodes organize into a tree structure where intermediate nodes aggregate votes from their children, dramatically reducing total messages.

3. Evaluation

We implemented BOC in Rust and evaluated it on a 100-node cluster. Results show 3x throughput improvement over PBFT with equivalent fault tolerance.`,
      authorResponse: true,
    };

    const result = await run(input, {
      config: {
        parameters: {
          reviewerCount: 2,
        },
      },
    });

    expect(result).toBeDefined();
    expect(result.submission.title).toBe(input.title);
    expect(Array.isArray(result.reviews)).toBe(true);
    expect(result.reviews.length).toBe(2);

    result.reviews.forEach((review) => {
      expect(review.reviewerId).toBeDefined();
      expect(review.summary).toBeDefined();
      expect(Array.isArray(review.criticisms)).toBe(true);
      expect(['accept', 'minor_revision', 'major_revision', 'reject']).toContain(
        review.recommendation
      );
    });

    expect(result.consensus).toBeDefined();
    expect(['accept', 'revise', 'reject']).toContain(result.consensus.decision);

    console.log('\n✅ Peer Review E2E Test Result:');
    console.log(`   Paper: ${result.submission.title.substring(0, 50)}...`);
    console.log(`   Reviews: ${result.reviews.length}`);
    console.log(`   Decision: ${result.consensus.decision.toUpperCase()}`);
  }, 120000);

  test('should handle content-only input', async () => {
    const result = await run({
      content: 'A new approach to caching in distributed databases using predictive algorithms.',
    });

    expect(result).toBeDefined();
    expect(Array.isArray(result.reviews)).toBe(true);
    expect(result.consensus).toBeDefined();
  }, 60000);
});
