/**
 * Tumor Board / Multidisciplinary Team (MDT) Framework
 * Multi-specialist consensus for complex decisions
 */

export interface Case {
  caseId: string;
  summary: string;
  patientFactors?: string[];
  constraints?: string[];
  options?: string[];
}

export interface SpecialistInput {
  specialty: string;
  assessment: string;
  recommendations: string[];
  concerns: string[];
  contraindications: string[];
}

export interface TeamDiscussion {
  consensusPoints: string[];
  disagreements: Array<{
    point: string;
    perspectives: string[];
  }>;
  criticalFactors: string[];
}

export interface Recommendation {
  primaryRecommendation: string;
  rationale: string;
  alternativeOptions: string[];
  riskConsiderations: string[];
  patientCenteredFactors: string[];
  followUpPlan: string[];
  contingencies: string[];
}

export interface TumorBoardConfig {
  models: {
    specialist: string;
    chair: string;
  };
  parameters: {
    temperature: number;
  };
  specialties: string[];
}

export interface TumorBoardResult {
  case: Case;
  specialistInputs: SpecialistInput[];
  discussion: TeamDiscussion;
  recommendation: Recommendation;
  metadata: {
    timestamp: string;
    config: TumorBoardConfig;
  };
}

export const DEFAULT_CONFIG: TumorBoardConfig = {
  models: {
    specialist: "claude-3-7-sonnet-20250219",
    chair: "claude-3-7-sonnet-20250219",
  },
  parameters: {
    temperature: 0.4,
  },
  specialties: [
    "Clinical Lead",
    "Technical Expert",
    "Operations/Implementation",
    "Risk & Compliance",
    "User/Patient Advocate",
  ],
};
