/**
 * Six Thinking Hats Framework
 * Multi-perspective analysis (Edward de Bono)
 */

import { DEFAULT_MODELS } from "@core/config";

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
    hat: DEFAULT_MODELS.CLAUDE_SONNET,
    facilitator: DEFAULT_MODELS.CLAUDE_SONNET,
  },
  parameters: {
    temperature: 0.6,
  },
};
