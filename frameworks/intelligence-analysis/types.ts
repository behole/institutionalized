/**
 * Intelligence Analysis (Competing Hypotheses) Framework
 * Diagnostic reasoning under uncertainty - CIA analytical method
 */

import { DEFAULT_MODELS } from "@core/config";

export interface Problem {
  question: string;
  evidence: string[];
  context?: string;
}

export interface Hypothesis {
  id: string;
  hypothesis: string;
  plausibility: number;
  supportingEvidence: string[];
  contradictingEvidence: string[];
  assumptions: string[];
}

export interface EvidenceEvaluation {
  evidence: string;
  discriminatingPower: number;
  supportedHypotheses: string[];
  contradictedHypotheses: string[];
  reliability: number;
  analysis: string;
}

export interface Analysis {
  rankedHypotheses: Array<{
    hypothesisId: string;
    hypothesis: string;
    likelihood: number;
    confidence: "low" | "medium" | "high";
    rationale: string;
  }>;
  mostLikely: string;
  discriminatingEvidence: string[];
  remainingUncertainties: string[];
  recommendations: string[];
  summary: string;
}

export interface IntelligenceAnalysisConfig {
  models: {
    analyst: string;
    evaluator: string;
  };
  parameters: {
    temperature: number;
    minHypotheses: number;
  };
}

export interface IntelligenceAnalysisResult {
  problem: Problem;
  hypotheses: Hypothesis[];
  evidenceEvaluation: EvidenceEvaluation[];
  analysis: Analysis;
  metadata: {
    timestamp: string;
    config: IntelligenceAnalysisConfig;
    costUSD?: number;
  };
}

export const DEFAULT_CONFIG: IntelligenceAnalysisConfig = {
  models: {
    analyst: DEFAULT_MODELS.CLAUDE_SONNET,
    evaluator: DEFAULT_MODELS.CLAUDE_SONNET,
  },
  parameters: {
    temperature: 0.5,
    minHypotheses: 4,
  },
};
