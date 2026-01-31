/**
 * Types for Red Team / Blue Team framework
 * Adversarial stress-testing for security and architecture
 */

export interface Target {
  system: string; // The system/design/architecture to test
  context?: string[]; // Supporting documentation
  constraints?: string[]; // Known limitations or requirements
}

export interface BlueTeamProposal {
  summary: string; // Overview of the system
  architecture: string; // How it works
  securityMeasures: string[]; // Defenses in place
  assumptions: string[]; // What they're assuming
}

export interface RedTeamAttack {
  vulnerabilities: Vulnerability[];
  attackScenarios: AttackScenario[];
  recommendations: string[];
}

export interface Vulnerability {
  category: string; // e.g., "Authentication", "Input Validation", "Logic Flaw"
  severity: "critical" | "high" | "medium" | "low";
  description: string;
  exploitation: string; // How to exploit it
  impact: string; // What happens if exploited
}

export interface AttackScenario {
  name: string;
  steps: string[];
  prerequisites: string[];
  impact: string;
  likelihood: "high" | "medium" | "low";
}

export interface ObserverReport {
  criticalVulnerabilities: Vulnerability[];
  highRiskScenarios: AttackScenario[];
  overallAssessment: string;
  prioritizedActions: string[];
  verdict: "ready" | "needs-hardening" | "significant-risks";
}

export interface RedBlueConfig {
  models: {
    blueTeam: string;
    redTeam: string;
    observer: string;
  };
  parameters: {
    rounds: number; // Number of attack/defense rounds
    blueTemperature: number;
    redTemperature: number;
    observerTemperature: number;
  };
}

export interface RedBlueResult {
  target: Target;
  blueProposal: BlueTeamProposal;
  redAttacks: RedTeamAttack[];
  observerReport: ObserverReport;
  metadata: {
    timestamp: string;
    rounds: number;
    config: RedBlueConfig;
  };
}

export const DEFAULT_CONFIG: RedBlueConfig = {
  models: {
    blueTeam: "claude-3-7-sonnet-20250219",
    redTeam: "claude-3-7-sonnet-20250219",
    observer: "claude-3-7-sonnet-20250219",
  },
  parameters: {
    rounds: 3,
    blueTemperature: 0.5,
    redTemperature: 0.8, // Higher for creative attacks
    observerTemperature: 0.3,
  },
};
