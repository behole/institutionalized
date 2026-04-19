import { describe, test, expect } from 'bun:test';
import { run } from '../../frameworks/devils-advocate';

const hasApiKey = !!process.env.ANTHROPIC_API_KEY;
(hasApiKey ? describe : describe.skip)("Devil's Advocate Framework E2E", () => {
  test('should challenge proposal rigorously', async () => {
    const input = {
      proposal:
        'Migrate our entire infrastructure from AWS to a self-managed Kubernetes cluster on bare metal to reduce costs by 60%.',
      context: [
        'Current monthly AWS bill: $50,000',
        'Team of 8 engineers',
        '99.9% uptime SLA with customers',
        'No current Kubernetes expertise',
        'Peak traffic: 10,000 requests/second',
      ],
    };

    const result = await run(input);

    expect(result).toBeDefined();
    expect(result.proposal).toBe(input.proposal);

    expect(result.challenge).toBeDefined();
    expect(result.challenge.opposition).toBeDefined();
    expect(Array.isArray(result.challenge.counterArguments)).toBe(true);
    expect(result.challenge.counterArguments.length).toBeGreaterThan(0);
    expect(Array.isArray(result.challenge.risks)).toBe(true);
    expect(Array.isArray(result.challenge.assumptionsChallenged)).toBe(true);

    expect(result.arbiterAssessment).toBeDefined();
    expect(['viable', 'needs_revision', 'flawed']).toContain(result.arbiterAssessment.viability);
    expect(result.arbiterAssessment.refinedProposal).toBeDefined();

    console.log("\n✅ Devil's Advocate E2E Test Result:");
    console.log(`   Proposal: ${result.proposal.substring(0, 50)}...`);
    console.log(`   Counter-arguments: ${result.challenge.counterArguments.length}`);
    console.log(`   Risks identified: ${result.challenge.risks.length}`);
    console.log(`   Viability: ${result.arbiterAssessment.viability.toUpperCase()}`);
  }, 120000);

  test('should handle content-only input', async () => {
    const result = await run({
      content: 'We should rewrite our entire codebase in Rust for performance.',
    });

    expect(result).toBeDefined();
    expect(result.challenge).toBeDefined();
    expect(result.arbiterAssessment).toBeDefined();
  }, 60000);
});
