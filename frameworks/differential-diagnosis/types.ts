/**
 * Differential Diagnosis Framework
 * Systematic diagnostic reasoning from medical practice
 */

import { DEFAULT_MODELS } from "@core/config";

export interface Symptoms {
  presenting: string;
  symptoms: string[];
  history?: string;
  context?: string;
}

export interface Diagnosis {
  diagnosis: string;
  likelihood: number;
  supportingSymptoms: string[];
  contradictingSymptoms: string[];
  testingStrategy: string[];
  reasoning: string;
}

export interface DiagnosticTest {
  test: string;
  purpose: string;
  expectedFindings: Record<string, string>;
  discriminatingPower: number;
}

export interface FinalDiagnosis {
  mostLikely: string;
  confidence: "low" | "medium" | "high" | "definitive";
  differentials: Array<{
    diagnosis: string;
    likelihood: number;
    reasoning: string;
  }>;
  criticalTests: string[];
  treatmentRecommendations: string[];
  monitoringPlan: string[];
}

export interface DifferentialDiagnosisConfig {
  models: {
    diagnostician: string;
    specialist: string;
  };
  parameters: {
    temperature: number;
    maxDifferentials: number;
  };
}

export interface DifferentialDiagnosisResult {
  symptoms: Symptoms;
  differentials: Diagnosis[];
  recommendedTests: DiagnosticTest[];
  finalDiagnosis: FinalDiagnosis;
  metadata: {
    timestamp: string;
    config: DifferentialDiagnosisConfig;
    costUSD?: number;
  };
}

export const DEFAULT_CONFIG: DifferentialDiagnosisConfig = {
  models: {
    diagnostician: DEFAULT_MODELS.CLAUDE_SONNET,
    specialist: DEFAULT_MODELS.CLAUDE_SONNET,
  },
  parameters: {
    temperature: 0.4,
    maxDifferentials: 5,
  },
};
