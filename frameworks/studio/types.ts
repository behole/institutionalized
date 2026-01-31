/**
 * Types for Studio Critique framework
 * Creative work evaluation with peer feedback
 */

export interface CreativeWork {
  work: string; // The creative work to critique (essay, design, code, etc.)
  context?: string[]; // Background, intent, constraints
  creatorStatement?: string; // What the creator was trying to achieve
  workType?: "writing" | "visual" | "code" | "design" | "general";
}

export interface PeerObservation {
  peer: string; // "Peer 1", "Peer 2", etc.
  observations: string[]; // What they noticed (neutral)
  questions: string[]; // Clarifying questions
  reactions: string[]; // Emotional/intuitive responses
}

export interface CritiqueRound {
  peer: string;
  strengths: string[]; // What works well
  weaknesses: string[]; // What doesn't work
  suggestions: string[]; // Specific improvements
}

export interface CreatorResponse {
  clarifications: string[]; // Answering questions
  intentions: string[]; // What was intended
  takeaways: string[]; // What they learned
}

export interface InstructorSynthesis {
  overallAssessment: string;
  coreFeedback: string[]; // Key points that matter most
  prioritizedSuggestions: string[]; // Ordered by impact
  encouragement: string; // What to build on
  nextSteps: string[]; // Concrete actions
}

export interface StudioConfig {
  models: {
    peers: string;
    creator: string;
    instructor: string;
  };
  parameters: {
    numPeers: number;
    enableCreatorResponse: boolean;
    peerTemperature: number;
    instructorTemperature: number;
  };
}

export interface StudioResult {
  work: CreativeWork;
  observations: PeerObservation[];
  critiques: CritiqueRound[];
  creatorResponse?: CreatorResponse;
  synthesis: InstructorSynthesis;
  metadata: {
    timestamp: string;
    numPeers: number;
    config: StudioConfig;
  };
}

export const DEFAULT_CONFIG: StudioConfig = {
  models: {
    peers: "claude-3-5-sonnet-20241022",
    creator: "claude-3-7-sonnet-20250219",
    instructor: "claude-3-7-sonnet-20250219",
  },
  parameters: {
    numPeers: 4,
    enableCreatorResponse: true,
    peerTemperature: 0.7,
    instructorTemperature: 0.4,
  },
};
