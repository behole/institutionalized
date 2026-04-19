import { describe, test, expect } from 'bun:test';
import { run } from '../../frameworks/red-blue';

const hasApiKey = !!process.env.ANTHROPIC_API_KEY;
(hasApiKey ? describe : describe.skip)('Red-Blue Team Framework E2E', () => {
  test('should conduct adversarial security review', async () => {
    const input = {
      system: 'E-commerce Platform',
      description: `A microservices-based e-commerce platform handling payments, user data, and inventory.

Architecture:
- API Gateway (Kong) with rate limiting
- Authentication service (OAuth2 + JWT)
- Payment processing (PCI DSS compliant)
- Product catalog (PostgreSQL)
- User data (encrypted at rest)
- Redis cache layer
- Message queue for async processing

Security measures:
- HTTPS everywhere
- Input validation on all endpoints
- SQL injection protection
- XSS filtering
- CSRF tokens
- Rate limiting: 100 req/min per IP`,
    };

    const result = await run(input, {
      config: {
        parameters: {
          rounds: 2,
        },
      },
    });

    expect(result).toBeDefined();
    expect(result.system).toBe(input.system);
    expect(result.redTeam).toBeDefined();
    expect(Array.isArray(result.redTeam.attacks)).toBe(true);
    expect(result.redTeam.attacks.length).toBeGreaterThan(0);

    expect(result.blueTeam).toBeDefined();
    expect(Array.isArray(result.blueTeam.defenses)).toBe(true);

    expect(Array.isArray(result.vulnerabilities)).toBe(true);
    result.vulnerabilities.forEach((v) => {
      expect(v.description).toBeDefined();
      expect(['critical', 'high', 'medium', 'low']).toContain(v.severity);
      expect(v.mitigation).toBeDefined();
    });

    console.log('\n✅ Red-Blue Team E2E Test Result:');
    console.log(`   System: ${result.system}`);
    console.log(`   Attacks: ${result.redTeam.attacks.length}`);
    console.log(`   Vulnerabilities: ${result.vulnerabilities.length}`);
    console.log(
      `   Critical/High: ${result.vulnerabilities.filter((v) => v.severity === 'critical' || v.severity === 'high').length}`
    );
  }, 120000);

  test('should handle content-only input', async () => {
    const result = await run({
      content: 'A web application with user authentication, database, and API endpoints.',
    });

    expect(result).toBeDefined();
    expect(result.redTeam).toBeDefined();
    expect(result.blueTeam).toBeDefined();
    expect(Array.isArray(result.vulnerabilities)).toBe(true);
  }, 60000);
});
