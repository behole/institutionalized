/**
 * PhD Defense Framework
 * Deep proposal validation through doctoral examination
 */

import { DEFAULT_MODELS } from "@core/config";

export interface Proposal {
  title: string;
  abstract: string;
  methodology?: string;
  contributions?: string;
  document: string;
}

export interface CommitteeMember {
  specialty: string;
  questions: string[];
  assessment: string;
  concerns: string[];
}

export interface DefenseResult {
  decision: "pass" | "pass_with_revisions" | "major_revisions" | "fail";
  summary: string;
  strengths: string[];
  weaknesses: string[];
  requiredRevisions: string[];
  recommendations: string[];
}

export interface PhDDefenseConfig {
  models: {
    committee: string;
    chair: string;
  };
  parameters: {
    temperature: number;
    committeeSize: number;
  };
  specialties: string[];
}

export interface PhDDefenseOutput {
  proposal: Proposal;
  committee: CommitteeMember[];
  defense: DefenseResult;
  metadata: {
    timestamp: string;
    config: PhDDefenseConfig;
    costUSD?: number;
  };
}

export const DEFAULT_CONFIG: PhDDefenseConfig = {
  models: {
    committee: DEFAULT_MODELS.CLAUDE_SONNET,
    chair: DEFAULT_MODELS.CLAUDE_SONNET,
  },
  parameters: {
    temperature: 0.5,
    committeeSize: 5,
  },
  specialties: [
    "Methodology and Research Design",
    "Technical Implementation",
    "Theoretical Foundations",
    "Related Work and Literature",
    "Broader Impact and Ethics",
  ],
};
