/**
 * Six Thinking Hats Framework
 * Multi-perspective analysis (Edward de Bono)
 */

export interface Analysis {
  question: string;
  context?: string;
}

export interface HatPerspective {
  hat: "white" | "red" | "black" | "yellow" | "green" | "blue";
  name: string;
  analysis: string;
}

export interface SixHatsConfig {
  models: {
    hat: string;
    facilitator: string;
  };
  parameters: {
    temperature: number;
  };
}

export interface SixHatsResult {
  analysis: Analysis;
  perspectives: HatPerspective[];
  synthesis: {
    summary: string;
    keyInsights: string[];
    recommendation: string;
    considerations: {
      facts: string[];
      risks: string[];
      benefits: string[];
      alternatives: string[];
      emotions: string[];
    };
  };
  metadata: {
    timestamp: string;
    config: SixHatsConfig;
  };
}

export const DEFAULT_CONFIG: SixHatsConfig = {
  models: {
    hat: "claude-3-7-sonnet-20250219",
    facilitator: "claude-3-7-sonnet-20250219",
  },
  parameters: {
    temperature: 0.6,
  },
};
