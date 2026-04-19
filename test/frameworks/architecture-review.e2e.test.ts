import { describe, test, expect } from 'bun:test';
import { run } from '../../frameworks/architecture-review';

const hasApiKey = !!process.env.ANTHROPIC_API_KEY;
(hasApiKey ? describe : describe.skip)('Architecture Review Framework E2E', () => {
  test('should review system architecture', async () => {
    const input = {
      system: 'Real-time Analytics Platform',
      description: `A platform for processing and analyzing real-time event streams from IoT devices.

Architecture Overview:
- Event ingestion: Apache Kafka cluster (3 brokers)
- Stream processing: Apache Flink
- Storage: ClickHouse for analytics, Redis for hot data
- API Layer: GraphQL with Apollo Server
- Frontend: React with WebSocket connections
- Infrastructure: Kubernetes on AWS EKS

Key Requirements:
- Process 1M events/second
- Sub-second query latency
- 99.99% availability
- Data retention: 90 days hot, 2 years cold
- Multi-region deployment (US, EU, APAC)`,
      constraints: [
        'Budget: $50K/month infrastructure',
        'Team: 6 engineers',
        'Timeline: 6 months to production',
      ],
    };

    const result = await run(input);

    expect(result).toBeDefined();
    expect(result.system).toBe(input.system);

    expect(result.domainReviews).toBeDefined();
    expect(Array.isArray(result.domainReviews)).toBe(true);
    expect(result.domainReviews.length).toBeGreaterThan(0);

    result.domainReviews.forEach((review) => {
      expect(review.domain).toBeDefined();
      expect(review.findings).toBeDefined();
      expect(Array.isArray(review.concerns)).toBe(true);
      expect(Array.isArray(review.recommendations)).toBe(true);
    });

    expect(result.overallAssessment).toBeDefined();
    expect(['approved', 'approved_with_conditions', 'needs_revision', 'rejected']).toContain(
      result.overallAssessment.decision
    );

    console.log('\n✅ Architecture Review E2E Test Result:');
    console.log(`   System: ${result.system}`);
    console.log(`   Domain reviews: ${result.domainReviews.length}`);
    console.log(
      `   Decision: ${result.overallAssessment.decision.toUpperCase().replace(/_/g, ' ')}`
    );
  }, 120000);

  test('should handle content-only input', async () => {
    const result = await run({
      content: 'A microservices architecture for an e-commerce platform with payment processing.',
    });

    expect(result).toBeDefined();
    expect(Array.isArray(result.domainReviews)).toBe(true);
    expect(result.overallAssessment).toBeDefined();
  }, 60000);
});
