// Core types for Writers' Workshop Framework
// Manuscript feedback in Clarion/Clarion West style

import { DEFAULT_MODELS } from "@core/config";

export interface Manuscript {
  title: string;
  content: string;
  genre?: string;
  wordCount?: number;
  authorIntent?: string;
}

export interface PositiveFeedback {
  whatWorks: string;
  strengths: string[];
  memorableMoments: string[];
}

export interface ConstructiveFeedback {
  questions: string[];
  confusionPoints: string[];
  suggestions: string[];
  craftConcerns: string[];
}

export interface PeerReview {
  reviewerId: string;
  positive: PositiveFeedback;
  constructive: ConstructiveFeedback;
  overallImpression: string;
}

export interface DiscussionPoint {
  topic: string;
  perspectives: string[];
  consensus?: string;
  disagreement?: string;
}

export interface WorkshopSummary {
  overallStrengths: string[];
  commonConcerns: string[];
  recommendedFocus: string[];
  nextSteps: string[];
}

export interface WritersWorkshopResult {
  manuscript: Manuscript;
  peerReviews: PeerReview[];
  discussion: DiscussionPoint[];
  summary: WorkshopSummary;
  metadata: {
    timestamp: string;
    duration: number;
    costUSD: number;
    peerCount: number;
    modelUsage: {
      [reviewerId: string]: string;
    };
  };
}

export interface WritersWorkshopConfig {
  models: {
    [reviewerId: string]: string;
    facilitator: string;
  };
  parameters: {
    peerCount: number;
    temperature: number;
    enableDiscussion: boolean;
  };
  validation: {
    requirePositiveFirst: boolean;
    requireSpecificExamples: boolean;
  };
}

export const DEFAULT_CONFIG: WritersWorkshopConfig = {
  models: {
    peer1: DEFAULT_MODELS.CLAUDE_SONNET,
    peer2: DEFAULT_MODELS.CLAUDE_SONNET,
    peer3: DEFAULT_MODELS.CLAUDE_SONNET,
    facilitator: DEFAULT_MODELS.CLAUDE_SONNET,
  },
  parameters: {
    peerCount: 3,
    temperature: 0.7,
    enableDiscussion: true,
  },
  validation: {
    requirePositiveFirst: true,
    requireSpecificExamples: true,
  },
};
