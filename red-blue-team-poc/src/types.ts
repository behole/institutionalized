/**
 * Types for the Red Team / Blue Team framework
 * Based on military adversarial security testing
 */

export interface Target {
  system: string; // System/architecture/proposal to test
  context?: string[]; // Supporting docs, code, specs
  scope?: string[]; // What's in/out of scope
  threatModel?: string; // "security" | "reliability" | "performance"
}

export interface BlueTeamDefense {
  systemOverview: string; // How the system works
  securityMeasures: string[]; // Defenses in place
  assumptions: string[]; // What we assume is true
  knownLimitations: string[]; // What we already know is weak
}

export interface Vulnerability {
  description: string; // What's the vulnerability
  exploit: string; // How to exploit it
  impact: string; // What happens if exploited
  severity: "critical" | "high" | "medium" | "low";
  evidence: string[]; // References to target/context
}

export interface RedTeamAttack {
  attacker: string; // "Red Team 1", etc.
  focus: string; // Attack vector focus area
  vulnerabilities: Vulnerability[];
  recommendations: string[]; // How to fix
}

export interface BlueTeamResponse {
  vulnerabilityResponses: {
    vulnerability: string; // Which red team finding
    response: "accepted" | "disputed" | "mitigated";
    explanation: string; // Why/how
    mitigation?: string; // If accepted, how to fix
  }[];
  systemUpdates?: string[]; // Changes made to harden
}

export interface ConfirmedVulnerability {
  description: string;
  severity: "critical" | "high" | "medium" | "low";
  impact: string;
  recommendation: string;
  status: "unmitigated" | "mitigated" | "disputed";
}

export interface ObserverReport {
  summary: string; // Executive summary
  confirmedVulnerabilities: ConfirmedVulnerability[];
  overallRisk: "critical" | "high" | "medium" | "low";
  readinessAssessment: string; // Can this ship?
}

export interface RedBlueConfig {
  models: {
    blueTeam: string;
    redTeam: string;
    observer: string;
  };
  parameters: {
    numRedTeam: number;
    enableBlueResponse: boolean;
    redTeamTemperature: number;
    blueTeamTemperature: number;
    observerTemperature: number;
  };
}

export interface RedBlueResult {
  target: Target;
  blueDefense: BlueTeamDefense;
  redAttacks: RedTeamAttack[];
  blueResponse?: BlueTeamResponse;
  observerReport: ObserverReport;
  metadata: {
    timestamp: string;
    config: RedBlueConfig;
  };
}
