/**
 * Types for the Peer Review framework
 * Based on academic peer review process
 */

export interface Submission {
  work: string; // The paper/doc/code to review
  context?: string[]; // Supporting materials
  reviewType?: string; // "academic" | "technical" | "creative"
}

export interface Review {
  reviewer: string; // "Reviewer 1", "Reviewer 2", etc.
  summary: string; // Overall assessment
  strengths: string[]; // What works well
  weaknesses: string[]; // What needs improvement
  questions: string[]; // Clarifying questions for author
  recommendation: "accept" | "revise" | "reject";
  confidence: number; // 1-5 scale
}

export interface Rebuttal {
  generalResponse: string; // Overall response
  pointByPoint: {
    reviewer: string;
    weakness: string;
    response: string;
  }[];
}

export interface EditorDecision {
  decision: "accept" | "revise" | "reject";
  reasoning: string; // Synthesis of reviews + rebuttal
  requiredChanges?: string[]; // If revise, what must change
  optionalSuggestions?: string[]; // Nice-to-haves
  rationale: string; // One-sentence summary
}

export interface PeerReviewConfig {
  models: {
    reviewers: string;
    author: string;
    editor: string;
  };
  parameters: {
    numReviewers: number;
    enableRebuttal: boolean;
    reviewerTemperature: number;
    editorTemperature: number;
  };
}

export interface PeerReviewResult {
  submission: Submission;
  reviews: Review[];
  rebuttal?: Rebuttal;
  decision: EditorDecision;
  metadata: {
    timestamp: string;
    config: PeerReviewConfig;
  };
}
