// Core types for Hegelian Dialectic Framework
// Thesis-Antithesis-Synthesis for resolving contradictions

export interface DialecticalProblem {
  context: string;
  thesis: string;
  constraints?: string[];
  objectives?: string[];
}

export interface Thesis {
  position: string;
  rationale: string;
  supportingArguments: string[];
  underlyingAssumptions: string[];
}

export interface Antithesis {
  position: string;
  rationale: string;
  counterArguments: string[];
  contradictionsIdentified: string[];
}

export interface Synthesis {
  integratedPosition: string;
  howItResolves: string;
  preservesFromThesis: string[];
  preservesFromAntithesis: string[];
  transcendsBoth: string[];
}

export interface DialecticalInsight {
  insight: string;
  source: "thesis" | "antithesis" | "synthesis";
  application: string;
}

export interface HegelianResult {
  problem: DialecticalProblem;
  thesis: Thesis;
  antithesis: Antithesis;
  synthesis: Synthesis;
  insights: DialecticalInsight[];
  metadata: {
    timestamp: string;
    duration: number;
    costUSD: number;
    modelUsage: {
      thesis: string;
      antithesis: string;
      synthesis: string;
    };
  };
}

export interface HegelianConfig {
  models: {
    thesis: string;
    antithesis: string;
    synthesis: string;
  };
  parameters: {
    temperature: number;
    depth: "surface" | "moderate" | "deep";
  };
  validation: {
    requireGenuineOpposition: boolean;
    requireIntegration: boolean;
  };
}

export const DEFAULT_CONFIG: HegelianConfig = {
  models: {
    thesis: "claude-3-7-sonnet-20250219",
    antithesis: "claude-3-7-sonnet-20250219",
    synthesis: "claude-3-7-sonnet-20250219",
  },
  parameters: {
    temperature: 0.8,
    depth: "deep",
  },
  validation: {
    requireGenuineOpposition: true,
    requireIntegration: true,
  },
};
