/**
 * Types for Pre-mortem framework
 * Identify failure modes before committing to a decision
 */

import { DEFAULT_MODELS } from "@core/config";

export interface Plan {
  description: string; // The plan/decision/launch being evaluated
  context?: string[]; // Supporting information
  timeline?: string; // When it would happen
  stakeholders?: string[]; // Who's involved
}

export interface FailureScenario {
  pessimist: string; // "Pessimist 1", "Pessimist 2", etc.
  scenario: string; // What went wrong
  rootCauses: string[]; // Why it happened
  earlyWarnings: string[]; // Signs it was coming
  severity: "catastrophic" | "major" | "moderate" | "minor";
  likelihood: "very-likely" | "likely" | "possible" | "unlikely";
  preventable: boolean; // Could this have been prevented?
}

export interface RiskAssessment {
  topRisks: FailureScenario[]; // Highest priority scenarios
  commonThemes: string[]; // Patterns across scenarios
  criticalAssumptions: string[]; // Assumptions that if wrong = failure
  earlyWarningSystem: string[]; // Metrics/signals to monitor
  mitigationPlan: Mitigation[];
  overallRiskLevel: "high" | "medium" | "low";
  recommendation: "proceed" | "mitigate-first" | "reconsider";
}

export interface Mitigation {
  risk: string; // Which scenario it addresses
  action: string; // What to do
  priority: "critical" | "high" | "medium" | "low";
  effort: "high" | "medium" | "low";
}

export interface PreMortemConfig {
  models: {
    pessimists: string;
    facilitator: string;
  };
  parameters: {
    numPessimists: number;
    pessimistTemperature: number;
    facilitatorTemperature: number;
  };
}

export interface PreMortemResult {
  plan: Plan;
  scenarios: FailureScenario[];
  assessment: RiskAssessment;
  metadata: {
    timestamp: string;
    numPessimists: number;
    config: PreMortemConfig;
  };
}

export const DEFAULT_CONFIG: PreMortemConfig = {
  models: {
    pessimists: DEFAULT_MODELS.CLAUDE_SONNET, // Diverse scenarios
    facilitator: DEFAULT_MODELS.CLAUDE_SONNET, // Quality synthesis
  },
  parameters: {
    numPessimists: 5,
    pessimistTemperature: 0.9, // High for creative failure scenarios
    facilitatorTemperature: 0.3, // Low for systematic analysis
  },
};
