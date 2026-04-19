import { describe, test, expect } from 'bun:test';
import { run } from '../../frameworks/courtroom';

const hasApiKey = !!process.env.ANTHROPIC_API_KEY;
(hasApiKey ? describe : describe.skip)('Courtroom Framework E2E', () => {
  test('should render verdict for simple case', async () => {
    const input = {
      question: 'Should we use TypeScript for this project?',
      context: [
        'Team already knows JavaScript',
        'TypeScript adds compile-time safety',
        'Project is small and short-term',
        'Small startup with 3 developers, 6-month project timeline',
      ],
    };

    const result = await run(input, {
      config: {
        parameters: {
          jurySize: 3, // Smaller jury for faster testing
        },
      },
    });

    // Verify structure
    expect(result).toBeDefined();
    expect(result.case.question).toBe(input.question);
    expect(result.prosecution).toBeDefined();
    expect(result.defense).toBeDefined();
    expect(result.jury).toBeDefined();
    expect(result.verdict).toBeDefined();

    // Verify prosecution
    expect(result.prosecution.caseStatement).toBeDefined();
    expect(typeof result.prosecution.caseStatement).toBe('string');
    expect(result.prosecution.caseStatement.length).toBeGreaterThan(50);
    expect(Array.isArray(result.prosecution.exhibits)).toBe(true);

    // Verify defense
    expect(result.defense.counterArgument).toBeDefined();
    expect(typeof result.defense.counterArgument).toBe('string');

    // Verify jury
    expect(result.jury.jurors).toBeDefined();
    expect(Array.isArray(result.jury.jurors)).toBe(true);
    expect(result.jury.jurors.length).toBe(3);
    result.jury.jurors.forEach((juror) => {
      expect(juror.vote).toMatch(/guilty|not_guilty|abstain/);
      expect(juror.reasoning).toBeDefined();
    });

    // Verify verdict
    expect(result.verdict.decision).toMatch(/guilty|not_guilty|dismissed/);
    expect(result.verdict.reasoning).toBeDefined();
    expect(typeof result.verdict.reasoning).toBe('string');

    console.log('\n✅ Courtroom E2E Test Result:');
    console.log(`   Question: ${result.case.question}`);
    console.log(`   Verdict: ${result.verdict.decision}`);
    console.log(`   Jury Votes: ${result.jury.jurors.map((j) => j.vote).join(', ')}`);
  }, 60000); // 60 second timeout for LLM calls

  test('should handle content-only input', async () => {
    const result = await run(
      { content: 'Should I merge this PR that refactors authentication?' },
      {
        config: {
          parameters: {
            jurySize: 3,
          },
        },
      }
    );

    expect(result).toBeDefined();
    expect(result.case.question).toBe('Should this be approved?');
    expect(result.case.context[0]).toContain('authentication');
    expect(result.verdict.decision).toMatch(/guilty|not_guilty|dismissed/);
  }, 60000);

  test('should produce consistent structure across runs', async () => {
    const input = {
      question: 'Should we migrate to microservices?',
      context: ['Current monolith is slow', 'Team lacks microservices experience'],
    };

    const result1 = await run(input, {
      config: { parameters: { jurySize: 3 } },
    });
    const result2 = await run(input, {
      config: { parameters: { jurySize: 3 } },
    });

    // Both should have same structure (though content may differ)
    expect(Object.keys(result1).sort()).toEqual(Object.keys(result2).sort());
    expect(result1.jury.jurors.length).toBe(result2.jury.jurors.length);
  }, 120000);
});
