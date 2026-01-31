---
title: Red Team / Blue Team POC
date: 2026-01-29
status: active
---

# Red Team / Blue Team POC

Military-style adversarial security testing with attacker/defender roles.

## Architecture

```
System/Proposal
    ↓
Blue Team (defender, presents system)
    ↓
Red Team (multiple attackers in parallel)
    ├─ Find vulnerabilities
    ├─ Test assumptions
    └─ Break edge cases
    ↓
Blue Team Response (defends/fixes)
    ↓
Observer (synthesizes findings)
    ↓
Report: Vulnerabilities + Severity + Mitigations
```

## Key Differences from Courtroom

- **Adversarial but collaborative:** Red team tries to break, blue team learns
- **Multiple attack vectors:** Each red team member has different focus
- **Iterative:** Blue team can respond and harden defenses
- **Severity-based:** Not guilty/not guilty - ranked vulnerabilities
- **Goal is improvement:** Find and fix issues before production

## Core Types

```typescript
interface Target {
  system: string;              // System/architecture/proposal to test
  context?: string[];          // Supporting docs, code, specs
  scope?: string[];            // What's in/out of scope
  threatModel?: string;        // "security" | "reliability" | "performance"
}

interface BlueTeamDefense {
  systemOverview: string;      // How the system works
  securityMeasures: string[];  // Defenses in place
  assumptions: string[];       // What we assume is true
  knownLimitations: string[];  // What we already know is weak
}

interface RedTeamAttack {
  attacker: string;            // "Red Team 1", etc.
  focus: string;               // Attack vector focus area
  vulnerabilities: {
    description: string;       // What's the vulnerability
    exploit: string;           // How to exploit it
    impact: string;            // What happens if exploited
    severity: "critical" | "high" | "medium" | "low";
    evidence: string[];        // References to target/context
  }[];
  recommendations: string[];   // How to fix
}

interface BlueTeamResponse {
  vulnerabilityResponses: {
    vulnerability: string;     // Which red team finding
    response: "accepted" | "disputed" | "mitigated";
    explanation: string;       // Why/how
    mitigation?: string;       // If accepted, how to fix
  }[];
  systemUpdates?: string[];    // Changes made to harden
}

interface ObserverReport {
  summary: string;             // Executive summary
  confirmedVulnerabilities: {
    description: string;
    severity: "critical" | "high" | "medium" | "low";
    impact: string;
    recommendation: string;
    status: "unmitigated" | "mitigated" | "disputed";
  }[];
  overallRisk: "critical" | "high" | "medium" | "low";
  readinessAssessment: string; // Can this ship?
}
```

## Usage

```bash
# Basic security test
bun run red-blue examples/api-system.json

# Multiple red team attackers
bun run red-blue examples/architecture.json --red-team 4

# Skip blue team response (faster)
bun run red-blue examples/quick-test.json --no-response

# Focus on specific threat model
bun run red-blue examples/system.json --threat security
```

## Example: API Security Review

```json
{
  "system": "REST API for user authentication",
  "context": [
    "Uses JWT tokens",
    "Rate limiting: 100 req/min per IP",
    "Passwords hashed with bcrypt"
  ],
  "scope": [
    "Authentication endpoints",
    "Token management",
    "Rate limiting"
  ],
  "threatModel": "security"
}
```

**Expected flow:**
- **Blue Team:** Presents system design and security measures
- **Red Team 1 (Auth bypass):** Tests JWT validation, token replay
- **Red Team 2 (DoS):** Tests rate limiting, resource exhaustion
- **Red Team 3 (Crypto):** Tests password hashing, token secrets
- **Blue Team Response:** Acknowledges JWT issue, disputes DoS concern
- **Observer:** Confirms critical JWT vulnerability, rates system "high risk"

## Configuration

```toml
[models]
blue_team = "claude-3-7-sonnet-20250219"      # Defender needs good reasoning
red_team = "claude-3-5-sonnet-20241022"       # Attackers can be lighter
observer = "claude-3-7-sonnet-20250219"       # Observer needs synthesis

[parameters]
num_red_team = 3
enable_blue_response = true
red_team_temperature = 0.8    # Creativity for finding attacks
blue_team_temperature = 0.5   # Measured defense
observer_temperature = 0.3    # Objective synthesis
```

## Success Criteria

- Red team finds real vulnerabilities (not generic warnings)
- Blue team responses are substantive (not defensive dismissal)
- Observer synthesizes fairly (not just picking sides)
- Severity ratings match actual impact
- Recommendations are actionable
