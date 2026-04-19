import { describe, test, expect } from 'bun:test';
import { run } from '../../frameworks/design-critique';

const hasApiKey = !!process.env.ANTHROPIC_API_KEY;
(hasApiKey ? describe : describe.skip)('Design Critique Framework E2E', () => {
  test('should provide structured design feedback', async () => {
    const input = {
      design: 'Mobile Banking App - Account Dashboard',
      description: `A redesign of the main account dashboard for a mobile banking application.

Key Features:
- Balance display with quick actions
- Recent transactions list
- Spending insights/charts
- Transfer money button
- Bill pay shortcuts
- Support chat access

Design Decisions:
- Card-based layout for accounts
- Bottom navigation for main actions
- Pull-to-refresh for updates
- Dark mode support
- Biometric authentication prompt`,
      goals: [
        'Increase daily active users by 20%',
        'Reduce time to complete transfers',
        'Improve accessibility compliance',
        'Support multiple account types',
      ],
    };

    const result = await run(input);

    expect(result).toBeDefined();
    expect(result.design).toBe(input.design);

    expect(Array.isArray(result.feedback)).toBe(true);
    expect(result.feedback.length).toBeGreaterThan(0);

    result.feedback.forEach((item) => {
      expect(item.category).toBeDefined();
      expect(item.observation).toBeDefined();
      expect(item.impact).toBeDefined();
      expect(item.suggestion).toBeDefined();
    });

    expect(result.summary).toBeDefined();
    expect(Array.isArray(result.summary.strengths)).toBe(true);
    expect(Array.isArray(result.summary.concerns)).toBe(true);
    expect(Array.isArray(result.summary.priorityActions)).toBe(true);

    console.log('\n✅ Design Critique E2E Test Result:');
    console.log(`   Design: ${result.design}`);
    console.log(`   Feedback items: ${result.feedback.length}`);
    console.log(`   Strengths: ${result.summary.strengths.length}`);
    console.log(`   Concerns: ${result.summary.concerns.length}`);
  }, 120000);

  test('should handle content-only input', async () => {
    const result = await run({
      content: 'A dashboard design for a project management tool with task lists and charts.',
    });

    expect(result).toBeDefined();
    expect(Array.isArray(result.feedback)).toBe(true);
    expect(result.summary).toBeDefined();
  }, 60000);
});
