/**
 * After-Action Review (AAR) Framework
 * Learning from execution
 */

import { DEFAULT_MODELS } from "@core/config";

export interface ActionReview {
  situation: string;
  intended: string[];
  actual: string[];
  participants?: string[];
}

export interface Analysis {
  whatHappened: string;
  whatWasExpected: string;
  gaps: Array<{
    expectation: string;
    reality: string;
    why: string;
  }>;
  successes: string[];
  failures: string[];
}

export interface Learnings {
  keyInsights: string[];
  rootCauses: string[];
  contributingFactors: string[];
  thingsToRepeat: string[];
  thingsToAvoid: string[];
}

export interface ActionItems {
  immediate: string[];
  systemicChanges: string[];
  processImprovements: string[];
  trainingNeeds: string[];
}

export interface AARConfig {
  models: {
    facilitator: string;
  };
  parameters: {
    temperature: number;
  };
}

export interface AARResult {
  review: ActionReview;
  analysis: Analysis;
  learnings: Learnings;
  actionItems: ActionItems;
  metadata: {
    timestamp: string;
    config: AARConfig;
  };
}

export const DEFAULT_CONFIG: AARConfig = {
  models: {
    facilitator: DEFAULT_MODELS.CLAUDE_SONNET,
  },
  parameters: {
    temperature: 0.4,
  },
};
