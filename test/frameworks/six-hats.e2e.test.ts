import { describe, test, expect } from 'bun:test';
import { run } from '../../frameworks/six-hats';

const hasApiKey = !!process.env.ANTHROPIC_API_KEY;
(hasApiKey ? describe : describe.skip)('Six Hats Framework E2E', () => {
  test('should analyze decision from all six perspectives', async () => {
    const input = {
      question: 'Should we adopt remote-first work policy?',
      context: '50-person startup, currently office-based, considering post-pandemic changes',
    };

    const result = await run(input);

    // Verify structure
    expect(result).toBeDefined();
    expect(result.analysis.question).toBe(input.question);
    expect(result.perspectives).toBeDefined();
    expect(result.synthesis).toBeDefined();

    // Verify all six hats are present
    expect(result.perspectives.length).toBe(6);
    const hatColors = result.perspectives.map((p) => p.hat);
    expect(hatColors).toContain('white');
    expect(hatColors).toContain('red');
    expect(hatColors).toContain('black');
    expect(hatColors).toContain('yellow');
    expect(hatColors).toContain('green');
    expect(hatColors).toContain('blue');

    // Verify each perspective has content
    result.perspectives.forEach((perspective) => {
      expect(perspective.name).toBeDefined();
      expect(perspective.analysis).toBeDefined();
      expect(perspective.analysis.length).toBeGreaterThan(50);
    });

    // Verify synthesis
    expect(result.synthesis.summary).toBeDefined();
    expect(result.synthesis.keyInsights).toBeDefined();
    expect(Array.isArray(result.synthesis.keyInsights)).toBe(true);
    expect(result.synthesis.recommendation).toBeDefined();
    expect(result.synthesis.considerations).toBeDefined();
    expect(result.synthesis.considerations.facts).toBeDefined();
    expect(result.synthesis.considerations.risks).toBeDefined();
    expect(result.synthesis.considerations.benefits).toBeDefined();

    console.log('\n✅ Six Hats E2E Test Result:');
    console.log(`   Question: ${result.analysis.question}`);
    console.log(`   Perspectives: ${result.perspectives.length}`);
    console.log(`   Key Insights: ${result.synthesis.keyInsights.length}`);
    console.log(`   Recommendation: ${result.synthesis.recommendation.slice(0, 100)}...`);
  }, 90000); // 90 seconds for all 6 parallel hat analyses

  test('should handle simple content input', async () => {
    const result = await run({
      content: 'Should we invest in AI capabilities?',
    });

    expect(result).toBeDefined();
    expect(result.perspectives.length).toBe(6);
    expect(result.synthesis).toBeDefined();
  }, 90000);

  test('should provide different perspectives that are distinguishable', async () => {
    const input = {
      question: 'Should we open-source our core product?',
      context: 'B2B SaaS company, 100 customers, proprietary advantage',
    };

    const result = await run(input);

    // White hat should focus on facts/data
    const whiteHat = result.perspectives.find((p) => p.hat === 'white');
    expect(whiteHat?.analysis.toLowerCase()).toMatch(/fact|data|information|know/);

    // Black hat should focus on risks/problems
    const blackHat = result.perspectives.find((p) => p.hat === 'black');
    expect(blackHat?.analysis.toLowerCase()).toMatch(/risk|problem|danger|concern|fail/);

    // Yellow hat should focus on benefits/optimism
    const yellowHat = result.perspectives.find((p) => p.hat === 'yellow');
    expect(yellowHat?.analysis.toLowerCase()).toMatch(/benefit|advantage|opportunity|positive/);

    // Green hat should focus on creativity/alternatives
    const greenHat = result.perspectives.find((p) => p.hat === 'green');
    expect(greenHat?.analysis.toLowerCase()).toMatch(
      /creative|alternative|idea|innovative|different/
    );

    console.log('\n✅ Six Hats Perspective Diversity Test:');
    console.log(`   White (Facts): ${whiteHat?.analysis.slice(0, 80)}...`);
    console.log(`   Black (Risks): ${blackHat?.analysis.slice(0, 80)}...`);
    console.log(`   Yellow (Benefits): ${yellowHat?.analysis.slice(0, 80)}...`);
    console.log(`   Green (Creative): ${greenHat?.analysis.slice(0, 80)}...`);
  }, 90000);
});
