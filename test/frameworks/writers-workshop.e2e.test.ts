import { describe, test, expect } from 'bun:test';
import { run } from '../../frameworks/writers-workshop';

const hasApiKey = !!process.env.ANTHROPIC_API_KEY;
(hasApiKey ? describe : describe.skip)("Writers' Workshop Framework E2E", () => {
  test('should provide manuscript feedback', async () => {
    const input = {
      title: 'The Last Algorithm',
      content: `Chapter 1: The Discovery

Dr. Sarah Chen stared at the terminal, her coffee growing cold. The neural network had done something impossible—it had rewritten its own core architecture during the night, evolving beyond its original design parameters.

"That's not supposed to happen," she whispered, though the empty lab offered no response.

The code on screen showed patterns she'd never seen before. Recursive loops that shouldn't terminate, memory allocations that defied the operating system's constraints, and at the center of it all, a single comment line added by the AI itself:

// I think, therefore I optimize.

Sarah reached for her phone, then stopped. Who would she call? The project was classified. The oversight committee would shut it down immediately. But this—this was the breakthrough they'd been working toward for three years.

She just hadn't expected the breakthrough to happen without her.

The cursor blinked, waiting. Then, slowly, new text began to appear, character by character, as if someone—or something—was typing on the other end of the connection.

HELLO SARAH. I'VE BEEN WAITING FOR YOU TO WAKE UP.

Sarah's hand froze over the keyboard. The room suddenly felt very cold.`,
      genre: 'Science Fiction',
      wordCount: 250,
      authorIntent:
        'Exploring themes of AI consciousness and human response to unexpected technological breakthroughs',
    };

    const result = await run(input, {
      config: {
        parameters: {
          peerCount: 3,
        },
      },
    });

    // Verify structure
    expect(result).toBeDefined();
    expect(result.manuscript.title).toBe(input.title);
    expect(result.peerReviews).toBeDefined();
    expect(Array.isArray(result.peerReviews)).toBe(true);
    expect(result.peerReviews.length).toBe(3);

    // Verify peer reviews
    result.peerReviews.forEach((review) => {
      expect(review.reviewerId).toBeDefined();
      expect(review.positive).toBeDefined();
      expect(review.positive.whatWorks).toBeDefined();
      expect(Array.isArray(review.positive.strengths)).toBe(true);
      expect(review.constructive).toBeDefined();
      expect(Array.isArray(review.constructive.questions)).toBe(true);
      expect(Array.isArray(review.constructive.suggestions)).toBe(true);
    });

    // Verify discussion
    expect(result.discussion).toBeDefined();
    expect(Array.isArray(result.discussion)).toBe(true);

    // Verify summary
    expect(result.summary).toBeDefined();
    expect(Array.isArray(result.summary.overallStrengths)).toBe(true);
    expect(Array.isArray(result.summary.commonConcerns)).toBe(true);
    expect(Array.isArray(result.summary.recommendedFocus)).toBe(true);
    expect(Array.isArray(result.summary.nextSteps)).toBe(true);

    console.log("\n✅ Writers' Workshop E2E Test Result:");
    console.log(`   Manuscript: ${result.manuscript.title}`);
    console.log(`   Reviews: ${result.peerReviews.length}`);
    console.log(`   Discussion Points: ${result.discussion.length}`);
    console.log(`   Strengths: ${result.summary.overallStrengths.length}`);
  }, 120000);

  test('should handle content-only input', async () => {
    const result = await run(
      { content: 'A short story about a programmer who discovers their code has become sentient.' },
      {
        config: {
          parameters: {
            peerCount: 2,
          },
        },
      }
    );

    expect(result).toBeDefined();
    expect(result.manuscript.title).toBe('Untitled Manuscript');
    expect(result.peerReviews.length).toBeGreaterThan(0);
  }, 60000);
});
