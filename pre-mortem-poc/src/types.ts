/**
 * Types for the Pre-mortem framework
 * Based on business risk management and failure analysis
 */

export interface Decision {
  proposal: string; // What you're considering
  context?: string[]; // Background, constraints, goals
  timeline?: string; // When this would happen
  stakeholders?: string[]; // Who's affected
}

export interface FailureScenario {
  pessimist: string; // "Pessimist 1", etc.
  futureDate: string; // "March 2026"
  failureDescription: string; // What went wrong
  rootCause: string; // Why it failed
  earlyWarningSign: string; // What signal appeared first
  likelihood: number; // 1-5 (1=unlikely, 5=very likely)
  impact: number; // 1-5 (1=minor, 5=catastrophic)
  preventable: boolean; // Could this have been avoided?
}

export interface MitigationStrategy {
  addressedScenarios: string[]; // Which failures this prevents
  action: string; // What to do
  timing: string; // When to do it
  cost: string; // Resource requirement
  effectiveness: number; // 1-5 confidence this works
}

export interface RankedScenario {
  scenario: FailureScenario;
  riskScore: number; // likelihood * impact
  priority: "critical" | "high" | "medium" | "low";
}

export interface PreMortemReport {
  summary: string; // Executive summary
  rankedScenarios: RankedScenario[];
  patterns: string[]; // Common themes across scenarios
  mitigations: MitigationStrategy[];
  recommendation: "proceed" | "proceed-with-caution" | "reconsider" | "abort";
  reasoning: string; // Why this recommendation
}

export interface PreMortemConfig {
  models: {
    pessimists: string;
    facilitator: string;
  };
  parameters: {
    numPessimists: number;
    futureMonths: number;
    pessimistTemperature: number;
    facilitatorTemperature: number;
  };
}

export interface PreMortemResult {
  decision: Decision;
  scenarios: FailureScenario[];
  report: PreMortemReport;
  metadata: {
    timestamp: string;
    config: PreMortemConfig;
  };
}
