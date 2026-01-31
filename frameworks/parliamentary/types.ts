/**
 * Parliamentary Debate Framework
 * Adversarial policy discussion with formal structure
 */

export interface Motion {
  motion: string;
  context: string;
  background?: string;
}

export interface Speech {
  speaker: string;
  role: "government" | "opposition" | "backbench";
  position: "for" | "against" | "neutral";
  speech: string;
  keyPoints: string[];
}

export interface DebateRecord {
  openingGovernment: Speech;
  openingOpposition: Speech;
  backbenchContributions: Speech[];
  closingOpposition: Speech;
  closingGovernment: Speech;
}

export interface Vote {
  decision: "ayes" | "noes" | "abstain";
  voteCounts: {
    ayes: number;
    noes: number;
    abstentions: number;
  };
  majority: string;
  outcome: "motion_passed" | "motion_defeated";
}

export interface ParliamentaryResult {
  motion: Motion;
  debate: DebateRecord;
  vote: Vote;
  summary: {
    mainArguments: {
      for: string[];
      against: string[];
    };
    keyContentions: string[];
    outcome: string;
  };
  metadata: {
    timestamp: string;
    config: ParliamentaryConfig;
  };
}

export interface ParliamentaryConfig {
  models: {
    speaker: string;
    debater: string;
  };
  parameters: {
    temperature: number;
    backbenchCount: number;
  };
}

export const DEFAULT_CONFIG: ParliamentaryConfig = {
  models: {
    speaker: "claude-3-7-sonnet-20250219",
    debater: "claude-3-7-sonnet-20250219",
  },
  parameters: {
    temperature: 0.6,
    backbenchCount: 3,
  },
};
