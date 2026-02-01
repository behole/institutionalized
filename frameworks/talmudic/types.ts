// Core types for Talmudic Dialectic Framework
// Multi-interpretation reasoning from Jewish textual tradition

export interface TextualProblem {
  text: string;
  context?: string;
  specificQuestion?: string;
  constraints?: string[];
}

export interface Interpretation {
  interpreter: string;
  interpretation: string;
  textualSupport: string[];
  reasoning: string;
  implications: string[];
}

export interface CounterInterpretation {
  respondsTo: string;
  counterPoint: string;
  textualEvidence: string[];
  whyDifferent: string;
}

export interface Resolution {
  question: string;
  practicalRuling: string;
  reasoning: string;
  minorityOpinion?: string;
  whenToApply: string;
}

export interface TalmudicInsight {
  insight: string;
  derivedFrom: string[];
  broaderApplication: string;
}

export interface TalmudicResult {
  problem: TextualProblem;
  interpretations: Interpretation[];
  counterpoints: CounterInterpretation[];
  resolutions: Resolution[];
  insights: TalmudicInsight[];
  metadata: {
    timestamp: string;
    duration: number;
    costUSD: number;
    modelUsage: {
      [interpreter: string]: string;
    };
  };
}

export interface TalmudicConfig {
  models: {
    [interpreter: string]: string;
    resolver: string;
  };
  parameters: {
    interpreterCount: number;
    temperature: number;
    requireTextualEvidence: boolean;
  };
  validation: {
    requireMultiplePerspectives: boolean;
    requirePracticalResolution: boolean;
  };
}

export const DEFAULT_CONFIG: TalmudicConfig = {
  models: {
    interpreter1: "claude-3-7-sonnet-20250219",
    interpreter2: "claude-3-7-sonnet-20250219",
    interpreter3: "claude-3-7-sonnet-20250219",
    resolver: "claude-3-7-sonnet-20250219",
  },
  parameters: {
    interpreterCount: 3,
    temperature: 0.8,
    requireTextualEvidence: true,
  },
  validation: {
    requireMultiplePerspectives: true,
    requirePracticalResolution: true,
  },
};
