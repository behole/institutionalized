// Core types for Dissertation Committee Framework
// Multi-stage work validation with advisor and committee

export interface DissertationWork {
  title: string;
  abstract: string;
  field: string;
  stage: "proposal" | "chapters" | "draft" | "final";
  content: string;
  methodology?: string;
  contributions?: string[];
}

export interface CommitteeMember {
  name: string;
  specialty: string;
  role: "advisor" | "specialist" | "external" | "methodologist";
}

export interface StageReview {
  stage: string;
  reviewer: string;
  assessment: {
    strengths: string[];
    weaknesses: string[];
    questions: string[];
  };
  verdict: "approve" | "revise" | "reject";
  requiredChanges?: string[];
  suggestions?: string[];
}

export interface CommitteeConsensus {
  overallVerdict: "approve" | "revise" | "reject";
  unanimous: boolean;
  dissentingViews?: string[];
  conditions?: string[];
}

export interface DevelopmentPlan {
  immediateActions: string[];
  timeline: string;
  milestones: string[];
  resources: string[];
}

export interface DissertationCommitteeResult {
  work: DissertationWork;
  committee: CommitteeMember[];
  stageReviews: StageReview[];
  consensus: CommitteeConsensus;
  developmentPlan: DevelopmentPlan;
  metadata: {
    timestamp: string;
    duration: number;
    costUSD: number;
    modelUsage: {
      [member: string]: string;
    };
  };
}

export interface DissertationCommitteeConfig {
  models: {
    advisor: string;
    specialist1: string;
    specialist2: string;
    methodologist: string;
  };
  parameters: {
    committeeSize: number;
    temperature: number;
    requireUnanimity: boolean;
  };
  validation: {
    requireMethodologyReview: boolean;
    requireContributionAssessment: boolean;
  };
}

export const DEFAULT_CONFIG: DissertationCommitteeConfig = {
  models: {
    advisor: "claude-3-7-sonnet-20250219",
    specialist1: "claude-3-7-sonnet-20250219",
    specialist2: "claude-3-7-sonnet-20250219",
    methodologist: "claude-3-7-sonnet-20250219",
  },
  parameters: {
    committeeSize: 4,
    temperature: 0.6,
    requireUnanimity: false,
  },
  validation: {
    requireMethodologyReview: true,
    requireContributionAssessment: true,
  },
};
