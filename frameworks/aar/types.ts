/**
 * After-Action Review (AAR) Framework
 * Learning from execution
 */

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
    facilitator: "claude-3-7-sonnet-20250219",
  },
  parameters: {
    temperature: 0.4,
  },
};
