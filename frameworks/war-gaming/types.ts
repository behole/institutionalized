// Core types for War Gaming Framework
// Military scenario testing for strategic planning

export interface Scenario {
  description: string;
  context: string[];
  constraints?: string[];
  objectives?: string[];
}

export interface Force {
  name: string;
  strategy: string;
  resources: string[];
  constraints: string[];
}

export interface ForceDeployment {
  force: Force;
  initialPosition: string;
  openingMoves: string[];
}

export interface Turn {
  turnNumber: number;
  forceActions: ForceAction[];
  controlAssessment: string;
  emergingThreats: string[];
}

export interface ForceAction {
  forceName: string;
  action: string;
  rationale: string;
  expectedOutcome: string;
}

export interface ObserverNote {
  observation: string;
  significance: string;
  recommendation?: string;
}

export interface GameOutcome {
  winner?: string;
  draw: boolean;
  finalState: string;
  keyDecisions: string[];
  turningPoints: string[];
}

export interface StrategicInsight {
  insight: string;
  evidence: string[];
  applicability: string;
}

export interface WarGamingResult {
  scenario: Scenario;
  forces: ForceDeployment[];
  turns: Turn[];
  outcome: GameOutcome;
  insights: StrategicInsight[];
  recommendations: string[];
  metadata: {
    timestamp: string;
    duration: number;
    costUSD: number;
    turnsSimulated: number;
    modelUsage: {
      [forceName: string]: string;
    };
  };
}

export interface WarGamingConfig {
  models: {
    [forceName: string]: string;
    control: string;
    observer: string;
  };
  parameters: {
    maxTurns: number;
    forces: number;
    temperature: number;
    enableObserver: boolean;
  };
  validation: {
    requireValidMoves: boolean;
    requireRationale: boolean;
  };
}

export const DEFAULT_CONFIG: WarGamingConfig = {
  models: {
    "blue-force": "claude-3-7-sonnet-20250219",
    "red-force": "claude-3-7-sonnet-20250219",
    control: "claude-3-7-sonnet-20250219",
    observer: "claude-3-7-sonnet-20250219",
  },
  parameters: {
    maxTurns: 5,
    forces: 2,
    temperature: 0.8,
    enableObserver: true,
  },
  validation: {
    requireValidMoves: true,
    requireRationale: true,
  },
};
