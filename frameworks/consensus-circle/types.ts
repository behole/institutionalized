/**
 * Consensus Circle Framework
 * Quaker-style decision-making through consensus without voting
 */

import { DEFAULT_MODELS } from "@core/config";

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
    costUSD?: number;
  };
}

export const DEFAULT_CONFIG: ConsensusCircleConfig = {
  models: {
    participant: DEFAULT_MODELS.CLAUDE_SONNET,
    clerk: DEFAULT_MODELS.CLAUDE_SONNET,
  },
  parameters: {
    temperature: 0.6,
    participantCount: 5,
    maxRounds: 3,
  },
};
