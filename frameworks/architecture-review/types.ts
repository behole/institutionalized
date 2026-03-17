/**
 * Architecture Review Board Framework
 * System design validation from multiple specialist perspectives
 */

import { DEFAULT_MODELS } from "@core/config";

export interface ArchitectureProposal {
  title: string;
  summary: string;
  design: string;
  requirements?: string;
  constraints?: string;
}

export interface SpecialistReview {
  domain: string;
  concerns: string[];
  recommendations: string[];
  riskLevel: "low" | "medium" | "high" | "critical";
  verdict: "approve" | "approve_with_conditions" | "revise" | "reject";
  rationale: string;
}

export interface BoardDecision {
  decision: "approved" | "approved_with_conditions" | "major_revisions" | "rejected";
  summary: string;
  criticalIssues: string[];
  requiredChanges: string[];
  recommendations: string[];
  tradeoffs: string[];
}

export interface ArchitectureReviewConfig {
  models: {
    specialist: string;
    chair: string;
  };
  parameters: {
    temperature: number;
  };
  domains: string[];
}

export interface ArchitectureReviewResult {
  proposal: ArchitectureProposal;
  reviews: SpecialistReview[];
  decision: BoardDecision;
  metadata: {
    timestamp: string;
    config: ArchitectureReviewConfig;
    costUSD?: number;
  };
}

export const DEFAULT_CONFIG: ArchitectureReviewConfig = {
  models: {
    specialist: DEFAULT_MODELS.CLAUDE_SONNET,
    chair: DEFAULT_MODELS.CLAUDE_SONNET,
  },
  parameters: {
    temperature: 0.5,
  },
  domains: [
    "Performance & Scalability",
    "Security & Compliance",
    "Operations & Reliability",
    "Cost & Resource Efficiency",
    "Maintainability & Developer Experience",
  ],
};
