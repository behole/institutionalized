/**
 * Types for the Studio Critique framework
 * Based on art/design education critique sessions
 */

export interface Work {
  content: string; // The work itself (essay, design, code)
  context?: string; // Creator's brief statement
  medium?: string; // "writing" | "design" | "code" | "other"
  stage?: string; // "draft" | "revision" | "final"
}

export interface PeerCritique {
  peer: string; // "Peer 1", etc.
  whatWorks: string[]; // Specific strengths
  whatDoesnt: string[]; // Specific issues
  questions: string[]; // Clarifying questions
  overallImpression: string; // Gut reaction
}

export interface InstructorAssessment {
  synthesis: string; // Integration of peer feedback
  technicalNotes: string; // Craft/execution observations
  conceptualNotes: string; // Idea/content observations
  strengthsToKeep: string[]; // What's working, don't change
  areasToRevise: string[]; // What needs work
  nextSteps: string; // Concrete guidance
  readyToShip: boolean; // Is this done?
}

export interface CreatorResponse {
  clarifications: string[]; // Responses to questions
  intendedVsReceived: string; // Where perception differed from intent
  revisionPlan: string; // What creator will change
}

export interface StudioCritiqueConfig {
  models: {
    peers: string;
    instructor: string;
    creator: string;
  };
  parameters: {
    numPeers: number;
    enableCreatorResponse: boolean;
    peerTemperature: number;
    instructorTemperature: number;
  };
}

export interface StudioCritiqueResult {
  work: Work;
  peerCritiques: PeerCritique[];
  instructorAssessment: InstructorAssessment;
  creatorResponse?: CreatorResponse;
  metadata: {
    timestamp: string;
    config: StudioCritiqueConfig;
  };
}
