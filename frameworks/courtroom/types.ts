// Core types for Courtroom POC

export interface Case {
  question: string;
  context: string[];
  evidence?: Exhibit[];
}

export interface Exhibit {
  sourceQuote: string;
  targetQuote: string;
  harm: string;
}

export interface Prosecution {
  caseStatement: string;
  exhibits: Exhibit[];
  harmAnalysis: string;
}

export interface Defense {
  counterArgument: string;
  exhibitChallenges: {
    exhibit: number;
    challenge: string;
  }[];
  harmDispute: string;
  alternative: string;
}

export type Vote = "guilty" | "not_guilty" | "abstain";

export interface JurorDeliberation {
  reasoning: string;
  vote: Vote;
}

export interface JuryVerdict {
  jurors: JurorDeliberation[];
  guiltyCount: number;
  notGuiltyCount: number;
  abstainCount: number;
  proceedsToJudge: boolean;
}

export type Decision = "guilty" | "not_guilty" | "dismissed";

export interface Verdict {
  decision: Decision;
  reasoning: string;
  rationale: string;
  actions?: string[];
  confidence: number;
}

export interface CourtroomResult {
  case: Case;
  prosecution: Prosecution;
  defense: Defense;
  jury: JuryVerdict;
  verdict: Verdict;
  metadata: {
    timestamp: string;
    duration: number;
    costUSD: number;
    modelUsage: {
      prosecutor: string;
      defense: string;
      jury: string;
      judge: string;
    };
  };
}

export interface CourtroomConfig {
  models: {
    prosecutor: string;
    defense: string;
    jury: string;
    judge: string;
  };
  parameters: {
    jurySize: number;
    juryThreshold: number;
    juryTemperature: number;
    judgeTemperature: number;
  };
  validation: {
    requireExactQuotes: boolean;
    minHarmWords: number;
  };
}

export const DEFAULT_CONFIG: CourtroomConfig = {
  models: {
    prosecutor: "claude-3-7-sonnet-20250219",
    defense: "claude-3-7-sonnet-20250219",
    jury: "claude-3-7-sonnet-20250219",
    judge: "claude-3-7-sonnet-20250219",
  },
  parameters: {
    jurySize: 5,
    juryThreshold: 3,
    juryTemperature: 0.9,
    judgeTemperature: 0.2,
  },
  validation: {
    requireExactQuotes: true,
    minHarmWords: 10,
  },
};
