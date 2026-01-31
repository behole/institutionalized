/**
 * Socratic Method Framework
 * Assumption testing through systematic questioning
 */

export interface Statement {
  claim: string;
  context?: string;
  domain?: string;
}

export interface SocraticExchange {
  round: number;
  question: string;
  response: string;
  exposedAssumption?: string;
  contradiction?: string;
}

export interface SocraticResult {
  statement: Statement;
  exchanges: SocraticExchange[];
  conclusion: {
    refinedUnderstanding: string;
    exposedAssumptions: string[];
    contradictions: string[];
    remainingQuestions: string[];
    epistemicStatus: "clarified" | "refined" | "refuted" | "acknowledged_ignorance";
    synthesis: string;
  };
  metadata: {
    timestamp: string;
    config: SocraticConfig;
  };
}

export interface SocraticConfig {
  models: {
    questioner: string;
    respondent: string;
  };
  parameters: {
    temperature: number;
    maxRounds: number;
  };
}

export const DEFAULT_CONFIG: SocraticConfig = {
  models: {
    questioner: "claude-3-7-sonnet-20250219",
    respondent: "claude-3-7-sonnet-20250219",
  },
  parameters: {
    temperature: 0.5,
    maxRounds: 5,
  },
};
