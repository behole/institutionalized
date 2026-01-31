/**
 * SWOT Analysis Framework
 * Structured situational assessment for strategic planning
 */

export interface Situation {
  entity: string; // Company, product, project, etc.
  description: string;
  currentState?: string;
  goals?: string[];
}

export interface InternalAnalysis {
  strengths: string[];
  weaknesses: string[];
  internalFactors: string[];
  coreCompetencies: string[];
  gaps: string[];
}

export interface ExternalAnalysis {
  opportunities: string[];
  threats: string[];
  marketTrends: string[];
  competitiveLandscape: string[];
  externalForces: string[];
}

export interface StrategicRecommendations {
  soStrategies: string[]; // Strengths + Opportunities
  woStrategies: string[]; // Weaknesses + Opportunities
  stStrategies: string[]; // Strengths + Threats
  wtStrategies: string[]; // Weaknesses + Threats
  priorities: Array<{
    strategy: string;
    priority: "critical" | "high" | "medium" | "low";
    rationale: string;
  }>;
  actionPlan: string[];
}

export interface SWOTConfig {
  models: {
    internalAnalyst: string;
    externalAnalyst: string;
    strategist: string;
  };
  parameters: {
    temperature: number;
  };
}

export interface SWOTResult {
  situation: Situation;
  internal: InternalAnalysis;
  external: ExternalAnalysis;
  strategies: StrategicRecommendations;
  metadata: {
    timestamp: string;
    config: SWOTConfig;
  };
}

export const DEFAULT_CONFIG: SWOTConfig = {
  models: {
    internalAnalyst: "claude-3-7-sonnet-20250219",
    externalAnalyst: "claude-3-7-sonnet-20250219",
    strategist: "claude-3-7-sonnet-20250219",
  },
  parameters: {
    temperature: 0.5,
  },
};
