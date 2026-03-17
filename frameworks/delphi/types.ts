/**
 * Delphi Method Framework
 * Anonymous expert consensus building through iterative rounds
 */

import { DEFAULT_MODELS } from "@core/config";

export interface Question {
  question: string;
  context?: string;
  targetMetric?: string;
}

export interface ExpertEstimate {
  expertId: string;
  round: number;
  estimate: number | string;
  confidence: number;
  reasoning: string;
  assumptions: string[];
}

export interface RoundSummary {
  round: number;
  estimates: ExpertEstimate[];
  statistics: {
    median: number;
    mean: number;
    range: { min: number; max: number };
    iqr: { q1: number; q3: number };
  };
  convergence: number;
}

export interface DelphiResult {
  question: Question;
  rounds: RoundSummary[];
  finalConsensus: {
    estimate: number;
    confidence: "low" | "medium" | "high";
    range: { min: number; max: number };
    reasoning: string;
    outliers: Array<{
      estimate: number;
      reasoning: string;
    }>;
    convergenceAchieved: boolean;
  };
  metadata: {
    timestamp: string;
    config: DelphiConfig;
    costUSD?: number;
  };
}

export interface DelphiConfig {
  models: {
    expert: string;
    facilitator: string;
  };
  parameters: {
    temperature: number;
    expertCount: number;
    maxRounds: number;
    convergenceThreshold: number;
  };
}

export const DEFAULT_CONFIG: DelphiConfig = {
  models: {
    expert: DEFAULT_MODELS.CLAUDE_SONNET,
    facilitator: DEFAULT_MODELS.CLAUDE_SONNET,
  },
  parameters: {
    temperature: 0.6,
    expertCount: 5,
    maxRounds: 3,
    convergenceThreshold: 0.2, // 20% coefficient of variation
  },
};
