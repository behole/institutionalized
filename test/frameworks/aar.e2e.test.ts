import { describe, test, expect } from 'bun:test';
import { run } from '../../frameworks/aar';

const hasApiKey = !!process.env.ANTHROPIC_API_KEY;
(hasApiKey ? describe : describe.skip)('After-Action Review Framework E2E', () => {
  test('should conduct blameless post-mortem', async () => {
    const input = {
      event: 'Production Database Outage - March 15, 2026',
      whatHappened: `On March 15, 2026 at 14:30 UTC, our primary PostgreSQL database became unresponsive, causing a 45-minute outage affecting all user-facing services.

Timeline:
14:30 - Database connections start timing out
14:32 - PagerDuty alerts fire
14:35 - On-call engineer begins investigation
14:40 - Connection pool exhausted, cascading failures begin
14:50 - Decision made to restart database
15:00 - Database restart initiated
15:15 - Service restored, monitoring normal`,
      whatWasExpected:
        'Database should handle normal load without connection exhaustion. Auto-scaling should prevent resource depletion.',
      participants: [
        'Sarah (DBA)',
        'Mike (SRE)',
        'Lisa (Engineering Manager)',
        'Tom (On-call Engineer)',
      ],
    };

    const result = await run(input);

    expect(result).toBeDefined();
    expect(result.event).toBe(input.event);

    expect(result.whatHappened).toBeDefined();
    expect(result.whatWasExpected).toBeDefined();

    expect(result.gaps).toBeDefined();
    expect(Array.isArray(result.gaps)).toBe(true);
    expect(result.gaps.length).toBeGreaterThan(0);

    expect(result.learnings).toBeDefined();
    expect(Array.isArray(result.learnings)).toBe(true);

    expect(result.actionItems).toBeDefined();
    expect(Array.isArray(result.actionItems)).toBe(true);
    result.actionItems.forEach((item) => {
      expect(item.description).toBeDefined();
      expect(item.owner).toBeDefined();
      expect(item.priority).toMatch(/high|medium|low/);
    });

    console.log('\n✅ AAR E2E Test Result:');
    console.log(`   Event: ${result.event}`);
    console.log(`   Gaps identified: ${result.gaps.length}`);
    console.log(`   Learnings: ${result.learnings.length}`);
    console.log(`   Action items: ${result.actionItems.length}`);
    console.log(
      `   High priority: ${result.actionItems.filter((i) => i.priority === 'high').length}`
    );
  }, 120000);

  test('should handle content-only input', async () => {
    const result = await run({
      content: 'Our deployment failed yesterday causing 2 hours of downtime.',
    });

    expect(result).toBeDefined();
    expect(Array.isArray(result.gaps)).toBe(true);
    expect(Array.isArray(result.actionItems)).toBe(true);
  }, 60000);
});
