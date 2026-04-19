import { describe, test, expect } from 'bun:test';
import { run } from '../../frameworks/studio';

const hasApiKey = !!process.env.ANTHROPIC_API_KEY;
(hasApiKey ? describe : describe.skip)('Studio Critique Framework E2E', () => {
  test('should provide creative work feedback', async () => {
    const input = {
      work: 'Brand Identity Redesign Proposal',
      description: `A complete brand identity redesign for a fintech startup targeting Gen Z consumers.

Visual Elements:
- New logo: Abstract geometric shape representing growth
- Color palette: Vibrant purple (#8B5CF6) and electric blue (#3B82F6)
- Typography: Modern sans-serif (Inter for body, Playfair Display for headers)
- Iconography: Custom line-art icons
- Photography style: Authentic, diverse, candid moments

Brand Voice:
- Friendly but professional
- Financial empowerment messaging
- Avoid traditional banking jargon
- Use emojis sparingly in social media

Deliverables:
- Logo variations (horizontal, vertical, icon)
- Color system with accessibility guidelines
- Typography scale
- Social media templates
- Presentation deck template`,
      creatorSilent: true,
    };

    const result = await run(input, {
      config: {
        parameters: {
          peerCount: 3,
        },
      },
    });

    expect(result).toBeDefined();
    expect(result.work).toBe(input.work);

    expect(Array.isArray(result.peerFeedback)).toBe(true);
    expect(result.peerFeedback.length).toBeGreaterThan(0);

    result.peerFeedback.forEach((feedback) => {
      expect(feedback.peer).toBeDefined();
      expect(Array.isArray(feedback.whatWorks)).toBe(true);
      expect(Array.isArray(feedback.whatDoesnt)).toBe(true);
      expect(Array.isArray(feedback.questions)).toBe(true);
    });

    expect(result.instructorFeedback).toBeDefined();
    expect(Array.isArray(result.instructorFeedback.overallAssessment)).toBe(true);

    expect(result.synthesis).toBeDefined();
    expect(Array.isArray(result.synthesis.keyThemes)).toBe(true);
    expect(Array.isArray(result.synthesis.actionItems)).toBe(true);

    console.log('\n✅ Studio Critique E2E Test Result:');
    console.log(`   Work: ${result.work}`);
    console.log(`   Peer feedback: ${result.peerFeedback.length}`);
    console.log(`   Key themes: ${result.synthesis.keyThemes.length}`);
    console.log(`   Action items: ${result.synthesis.actionItems.length}`);
  }, 120000);

  test('should handle content-only input', async () => {
    const result = await run({
      content: 'A new landing page design for our SaaS product with modern aesthetics.',
    });

    expect(result).toBeDefined();
    expect(Array.isArray(result.peerFeedback)).toBe(true);
    expect(result.synthesis).toBeDefined();
  }, 60000);
});
