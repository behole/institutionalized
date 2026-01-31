/**
 * Grant Review Panel Framework
 * Comparative prioritization under resource constraints
 */

export interface GrantProposal {
  id: string;
  title: string;
  abstract: string;
  requestedAmount: number;
  duration: string;
  document: string;
}

export interface ReviewerScore {
  proposalId: string;
  scores: {
    impact: number;
    feasibility: number;
    innovation: number;
    qualifications: number;
  };
  overallScore: number;
  strengths: string[];
  weaknesses: string[];
  comments: string;
}

export interface PanelRanking {
  rankedProposals: Array<{
    proposalId: string;
    title: string;
    consensusScore: number;
    fundingRecommendation: "fund" | "fund_if_available" | "do_not_fund";
    rationale: string;
  }>;
  fundingLine: number;
  totalBudget: number;
  allocations: Array<{
    proposalId: string;
    amount: number;
  }>;
  summary: string;
}

export interface GrantPanelConfig {
  models: {
    reviewer: string;
    panel: string;
  };
  parameters: {
    temperature: number;
    reviewersPerProposal: number;
  };
  totalBudget: number;
}

export interface GrantPanelResult {
  proposals: GrantProposal[];
  reviews: ReviewerScore[];
  ranking: PanelRanking;
  metadata: {
    timestamp: string;
    config: GrantPanelConfig;
  };
}

export const DEFAULT_CONFIG: GrantPanelConfig = {
  models: {
    reviewer: "claude-3-7-sonnet-20250219",
    panel: "claude-3-7-sonnet-20250219",
  },
  parameters: {
    temperature: 0.4,
    reviewersPerProposal: 3,
  },
  totalBudget: 1000000,
};
