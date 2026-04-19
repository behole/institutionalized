import { describe, test, expect } from 'bun:test';
import { run } from '../../frameworks/tumor-board';

const hasApiKey = !!process.env.ANTHROPIC_API_KEY;
(hasApiKey ? describe : describe.skip)('Tumor Board Framework E2E', () => {
  test('should provide multi-specialist consensus', async () => {
    const input = {
      case: 'Complex System Migration',
      description: `A legacy monolithic application needs to be migrated to microservices. The system handles critical financial transactions with 99.99% uptime requirement.

Current State:
- Single codebase: 500K lines of Java
- Database: Oracle with 200+ tables
- Uptime: 99.95% (missing SLA)
- Deployment: Monthly, 4-hour maintenance window
- Team: 20 engineers, varying expertise

Constraints:
- Cannot have more than 30 minutes downtime
- Must maintain data consistency
- Regulatory compliance required
- Budget: $500K
- Timeline: 12 months`,
      specialists: [
        { role: 'infrastructure', name: 'Infrastructure Lead' },
        { role: 'security', name: 'Security Architect' },
        { role: 'data', name: 'Data Engineer' },
        { role: 'operations', name: 'DevOps Lead' },
      ],
    };

    const result = await run(input);

    expect(result).toBeDefined();
    expect(result.case).toBe(input.case);

    expect(Array.isArray(result.specialistOpinions)).toBe(true);
    expect(result.specialistOpinions.length).toBe(input.specialists.length);

    result.specialistOpinions.forEach((opinion) => {
      expect(opinion.specialist).toBeDefined();
      expect(opinion.assessment).toBeDefined();
      expect(Array.isArray(opinion.concerns)).toBe(true);
      expect(Array.isArray(opinion.recommendations)).toBe(true);
    });

    expect(result.consensus).toBeDefined();
    expect(result.consensus.recommendation).toBeDefined();
    expect(Array.isArray(result.consensus.agreedPoints)).toBe(true);
    expect(Array.isArray(result.consensus.divergentViews)).toBe(true);

    expect(Array.isArray(result.treatmentPlan)).toBe(true);
    expect(Array.isArray(result.risks)).toBe(true);

    console.log('\n✅ Tumor Board E2E Test Result:');
    console.log(`   Case: ${result.case}`);
    console.log(`   Specialists: ${result.specialistOpinions.length}`);
    console.log(`   Agreed points: ${result.consensus.agreedPoints.length}`);
    console.log(`   Treatment steps: ${result.treatmentPlan.length}`);
  }, 120000);

  test('should handle content-only input', async () => {
    const result = await run({
      content: 'We need to migrate our database to a new cloud provider with zero downtime.',
    });

    expect(result).toBeDefined();
    expect(Array.isArray(result.specialistOpinions)).toBe(true);
    expect(result.consensus).toBeDefined();
  }, 60000);
});
