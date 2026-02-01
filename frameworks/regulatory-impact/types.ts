// Core types for Regulatory Impact Assessment Framework
// Government policy analysis for comprehensive impact prediction

export interface Policy {
  title: string;
  description: string;
  objectives: string[];
  scope: string;
  stakeholders: string[];
}

export interface EconomicImpact {
  costs: {
    implementation: string;
    ongoing: string;
    compliance: string;
  };
  benefits: {
    direct: string;
    indirect: string;
    longTerm: string;
  };
  marketEffects: string[];
  distributionalEffects: string[];
}

export interface SocialImpact {
  affectedGroups: string[];
  equityConcerns: string[];
  privacyImplications: string[];
  accessibilityEffects: string[];
}

export interface EnvironmentalImpact {
  directEffects: string[];
  indirectEffects: string[];
  sustainabilityConsiderations: string[];
  carbonFootprint: string;
}

export interface StakeholderFeedback {
  stakeholder: string;
  concerns: string[];
  support: string[];
  suggestions: string[];
}

export interface RiskAssessment {
  risks: {
    description: string;
    likelihood: "low" | "medium" | "high";
    impact: "low" | "medium" | "high";
    mitigation: string;
  }[];
}

export interface RegulatoryImpactResult {
  policy: Policy;
  economic: EconomicImpact;
  social: SocialImpact;
  environmental: EnvironmentalImpact;
  stakeholderFeedback: StakeholderFeedback[];
  risks: RiskAssessment;
  recommendation: {
    decision: "proceed" | "revise" | "reject";
    rationale: string;
    conditions?: string[];
  };
  metadata: {
    timestamp: string;
    duration: number;
    costUSD: number;
    modelUsage: {
      [analyst: string]: string;
    };
  };
}

export interface RegulatoryImpactConfig {
  models: {
    economic: string;
    social: string;
    environmental: string;
    stakeholder: string;
    risk: string;
    synthesizer: string;
  };
  parameters: {
    temperature: number;
    stakeholderCount: number;
  };
  validation: {
    requireCostBenefit: boolean;
    requireRiskAssessment: boolean;
  };
}

export const DEFAULT_CONFIG: RegulatoryImpactConfig = {
  models: {
    economic: "claude-3-7-sonnet-20250219",
    social: "claude-3-7-sonnet-20250219",
    environmental: "claude-3-7-sonnet-20250219",
    stakeholder: "claude-3-7-sonnet-20250219",
    risk: "claude-3-7-sonnet-20250219",
    synthesizer: "claude-3-7-sonnet-20250219",
  },
  parameters: {
    temperature: 0.5,
    stakeholderCount: 4,
  },
  validation: {
    requireCostBenefit: true,
    requireRiskAssessment: true,
  },
};
