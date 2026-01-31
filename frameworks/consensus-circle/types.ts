/**
 * Consensus Circle Framework
 * Quaker-style decision-making through consensus without voting
 */

export interface Proposal {
  question: string;
  context: string;
  options?: string[];
}

export interface ParticipantVoice {
  participantId: string;
  perspective: string;
  concerns: string[];
  supportedAspects: string[];
  blockingConcerns: string[];
  suggestions: string[];
}

export interface ConsensusRound {
  round: number;
  voices: ParticipantVoice[];
  emergingDirection: string;
  blockingConcerns: string[];
  areasOfAgreement: string[];
}

export interface ConsensusDecision {
  decision: string;
  consensusAchieved: boolean;
  unitySummary: string;
  addressedConcerns: Array<{
    concern: string;
    resolution: string;
  }>;
  remainingReservations: string[];
  commitments: string[];
}

export interface ConsensusCircleConfig {
  models: {
    participant: string;
    clerk: string;
  };
  parameters: {
    temperature: number;
    participantCount: number;
    maxRounds: number;
  };
}

export interface ConsensusCircleResult {
  proposal: Proposal;
  rounds: ConsensusRound[];
  decision: ConsensusDecision;
  metadata: {
    timestamp: string;
    config: ConsensusCircleConfig;
  };
}

export const DEFAULT_CONFIG: ConsensusCircleConfig = {
  models: {
    participant: "claude-3-7-sonnet-20250219",
    clerk: "claude-3-7-sonnet-20250219",
  },
  parameters: {
    temperature: 0.6,
    participantCount: 5,
    maxRounds: 3,
  },
};
