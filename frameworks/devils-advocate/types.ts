/**
 * Devil's Advocate Framework
 * Formal challenge to proposals
 */

import { DEFAULT_MODELS } from "@core/config";

export interface Proposal {
  description: string;
  rationale: string[];
  benefits: string[];
  risks?: string[];
}

export interface Opposition {
  objections: string[];
  counterArguments: string[];
  alternativeProposals: string[];
  questionsNotAnswered: string[];
}

export interface Rebuttal {
  addressedObjections: Array<{
    objection: string;
    response: string;
  }>;
  strengthenedCase: string;
  concessions: string[];
}

export interface Verdict {
  decision: "approved" | "approved-with-conditions" | "rejected";
  reasoning: string;
  conditions?: string[];
  verdict: string;
}

export interface DevilsAdvocateConfig {
  models: {
    advocate: string;
    proposer: string;
    arbiter: string;
  };
  parameters: {
    advocateTemperature: number;
    arbiterTemperature: number;
  };
}

export interface DevilsAdvocateResult {
  proposal: Proposal;
  opposition: Opposition;
  rebuttal: Rebuttal;
  verdict: Verdict;
  metadata: {
    timestamp: string;
    config: DevilsAdvocateConfig;
    costUSD?: number;
  };
}

export const DEFAULT_CONFIG: DevilsAdvocateConfig = {
  models: {
    advocate: DEFAULT_MODELS.CLAUDE_SONNET,
    proposer: DEFAULT_MODELS.CLAUDE_SONNET,
    arbiter: DEFAULT_MODELS.CLAUDE_SONNET,
  },
  parameters: {
    advocateTemperature: 0.8,
    arbiterTemperature: 0.3,
  },
};
