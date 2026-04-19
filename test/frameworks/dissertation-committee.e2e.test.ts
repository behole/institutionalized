import { describe, test, expect } from 'bun:test';
import { run } from '../../frameworks/dissertation-committee';

const hasApiKey = !!process.env.ANTHROPIC_API_KEY;
(hasApiKey ? describe : describe.skip)('Dissertation Committee Framework E2E', () => {
  test('should conduct committee review', async () => {
    const input = {
      title:
        'Neural Architecture Search for Efficient Computer Vision: A Novel Approach Using Evolutionary Strategies',
      abstract: `This dissertation proposes a novel method for neural architecture search (NAS) that combines evolutionary algorithms with gradient-based optimization to discover efficient computer vision models. The key contribution is a hybrid approach that reduces the computational cost of NAS by 60% while maintaining competitive accuracy on standard benchmarks.

The work demonstrates that evolutionary strategies can effectively explore the architecture space while gradient-based methods fine-tune promising candidates. Experiments on CIFAR-10, ImageNet, and custom medical imaging datasets show state-of-the-art efficiency-accuracy tradeoffs.`,
      field: 'Computer Science - Machine Learning',
      stage: 'proposal',
      content: `Chapter 1: Introduction

Neural Architecture Search (NAS) has emerged as a promising approach to automating the design of deep neural networks. However, the computational cost of traditional NAS methods remains prohibitive, often requiring thousands of GPU hours to discover competitive architectures.

This dissertation addresses this limitation by proposing EvoGrad, a hybrid approach that combines the exploration capabilities of evolutionary algorithms with the exploitation efficiency of gradient-based optimization. The key insight is that these two paradigms can complement each other: evolutionary methods excel at navigating discrete architecture spaces, while gradients efficiently optimize continuous parameters.

Research Questions:
1. Can evolutionary strategies effectively prune the architecture search space?
2. How does hybrid optimization compare to pure evolutionary or gradient-based approaches?
3. What are the theoretical guarantees of the proposed method?

Methodology:
The approach uses a population-based evolutionary algorithm to generate candidate architectures. Each candidate is then fine-tuned using gradient descent. A novel fitness function balances accuracy, computational efficiency, and model complexity. Selection pressure favors architectures that achieve high accuracy with minimal computational cost.

Expected Contributions:
1. Novel hybrid NAS algorithm
2. Theoretical analysis of convergence properties
3. Comprehensive experimental evaluation
4. Open-source implementation and benchmark datasets`,
      methodology:
        'Mixed-methods combining algorithm development, theoretical analysis, and empirical evaluation',
      contributions: [
        'Novel hybrid NAS algorithm (EvoGrad)',
        '60% reduction in computational cost',
        'Theoretical convergence guarantees',
        'Open-source implementation',
      ],
    };

    const result = await run(input);

    // Verify structure
    expect(result).toBeDefined();
    expect(result.work.title).toBe(input.title);
    expect(result.work.field).toBe(input.field);
    expect(result.work.stage).toBe(input.stage);

    // Verify committee
    expect(result.committee).toBeDefined();
    expect(Array.isArray(result.committee)).toBe(true);
    expect(result.committee.length).toBe(4);

    result.committee.forEach((member) => {
      expect(member.name).toBeDefined();
      expect(member.specialty).toBeDefined();
      expect(['advisor', 'specialist', 'external', 'methodologist']).toContain(member.role);
    });

    // Verify stage reviews
    expect(result.stageReviews).toBeDefined();
    expect(Array.isArray(result.stageReviews)).toBe(true);
    expect(result.stageReviews.length).toBe(result.committee.length);

    result.stageReviews.forEach((review) => {
      expect(review.stage).toBe(input.stage);
      expect(review.reviewer).toBeDefined();
      expect(review.assessment).toBeDefined();
      expect(Array.isArray(review.assessment.strengths)).toBe(true);
      expect(Array.isArray(review.assessment.weaknesses)).toBe(true);
      expect(Array.isArray(review.assessment.questions)).toBe(true);
      expect(['approve', 'revise', 'reject']).toContain(review.verdict);
    });

    // Verify consensus
    expect(result.consensus).toBeDefined();
    expect(['approve', 'revise', 'reject']).toContain(result.consensus.overallVerdict);
    expect(typeof result.consensus.unanimous).toBe('boolean');

    // Verify development plan
    expect(result.developmentPlan).toBeDefined();
    expect(Array.isArray(result.developmentPlan.immediateActions)).toBe(true);
    expect(result.developmentPlan.timeline).toBeDefined();
    expect(Array.isArray(result.developmentPlan.milestones)).toBe(true);
    expect(Array.isArray(result.developmentPlan.resources)).toBe(true);

    console.log('\n✅ Dissertation Committee E2E Test Result:');
    console.log(`   Title: ${result.work.title.substring(0, 50)}...`);
    console.log(`   Committee: ${result.committee.map((c) => c.name).join(', ')}`);
    console.log(`   Reviews: ${result.stageReviews.length}`);
    console.log(`   Verdict: ${result.consensus.overallVerdict.toUpperCase()}`);
    console.log(`   Unanimous: ${result.consensus.unanimous ? 'Yes' : 'No'}`);
  }, 120000);

  test('should handle content-only input', async () => {
    const result = await run({
      content: 'A research proposal on using machine learning to predict protein folding patterns.',
    });

    expect(result).toBeDefined();
    expect(result.work.title).toBe('Untitled Work');
    expect(result.committee.length).toBeGreaterThan(0);
    expect(result.stageReviews.length).toBe(result.committee.length);
    expect(result.consensus.overallVerdict).toMatch(/approve|revise|reject/);
  }, 60000);
});
