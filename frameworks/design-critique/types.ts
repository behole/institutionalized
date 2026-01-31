/**
 * Design Critique Framework
 * Structured work-in-progress feedback for design work
 */

export interface DesignWork {
  title: string;
  stage: "concept" | "wireframe" | "prototype" | "final";
  description: string;
  goals: string[];
  constraints?: string[];
  artifacts: string; // Design document, images, mockups
}

export interface PeerFeedback {
  peerId: string;
  perspective: string;
  observations: {
    works: string[];
    doesntWork: string[];
    questions: string[];
    suggestions: string[];
  };
  categories: {
    usability: string[];
    aesthetics: string[];
    functionality: string[];
    accessibility: string[];
  };
}

export interface StakeholderInput {
  stakeholderType: string;
  priorities: string[];
  concerns: string[];
  requirements: string[];
}

export interface CritiqueSynthesis {
  summary: string;
  strengths: string[];
  areasForImprovement: string[];
  prioritizedFeedback: Array<{
    issue: string;
    priority: "critical" | "high" | "medium" | "low";
    category: string;
    suggestions: string[];
  }>;
  nextSteps: string[];
  iterationDirection: string;
}

export interface DesignCritiqueConfig {
  models: {
    peer: string;
    stakeholder: string;
    facilitator: string;
  };
  parameters: {
    temperature: number;
    peerCount: number;
  };
  stakeholderTypes: string[];
}

export interface DesignCritiqueResult {
  design: DesignWork;
  peerFeedback: PeerFeedback[];
  stakeholderInput: StakeholderInput[];
  synthesis: CritiqueSynthesis;
  metadata: {
    timestamp: string;
    config: DesignCritiqueConfig;
  };
}

export const DEFAULT_CONFIG: DesignCritiqueConfig = {
  models: {
    peer: "claude-3-7-sonnet-20250219",
    stakeholder: "claude-3-7-sonnet-20250219",
    facilitator: "claude-3-7-sonnet-20250219",
  },
  parameters: {
    temperature: 0.6,
    peerCount: 3,
  },
  stakeholderTypes: ["User", "Product Manager", "Engineering"],
};
