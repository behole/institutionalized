/**
 * Red Team - attacks the proposed system
 */

import type { LLMProvider } from "@core/types";
import { parseJSON } from "@core/orchestrator";
import type {
  Target,
  BlueTeamProposal,
  RedTeamAttack,
  RedBlueConfig,
} from "./types";

export async function attackSystem(
  target: Target,
  blueProposal: BlueTeamProposal,
  round: number,
  config: RedBlueConfig,
  provider: LLMProvider
): Promise<RedTeamAttack> {
  const prompt = buildPrompt(target, blueProposal, round);

  const response = await provider.call({
    model: config.models.redTeam,
    temperature: config.parameters.redTemperature,
    messages: [{ role: "user", content: prompt }],
    maxTokens: 4096,
  });

  const attack = parseJSON<RedTeamAttack>(response.content);
  validateAttack(attack);

  return attack;
}

function buildPrompt(
  target: Target,
  blueProposal: BlueTeamProposal,
  round: number
): string {
  return `You are the RED TEAM - your role is to attack the proposed system and find vulnerabilities.

## TARGET SYSTEM
${target.system}

## BLUE TEAM'S PROPOSAL

**Summary:**
${blueProposal.summary}

**Architecture:**
${blueProposal.architecture}

**Security Measures:**
${blueProposal.securityMeasures.map((m, i) => `${i + 1}. ${m}`).join("\n")}

**Assumptions:**
${blueProposal.assumptions.map((a, i) => `${i + 1}. ${a}`).join("\n")}

## YOUR TASK (Round ${round})

As the Red Team, you must:

1. **Find vulnerabilities** - identify weaknesses in the design
2. **Create attack scenarios** - show how to exploit them
3. **Recommend mitigations** - suggest fixes

## ATTACK FOCUS AREAS

- **Authentication & Authorization** - can you bypass access controls?
- **Input Validation** - can you inject malicious data?
- **Logic Flaws** - can you abuse the intended workflow?
- **State Management** - can you manipulate state?
- **Side Channels** - can you leak information indirectly?
- **Assumptions** - what happens if assumptions are violated?
- **Resource Exhaustion** - can you cause DoS?
- **Race Conditions** - can you exploit timing?

## GUIDELINES

- Be creative and adversarial
- Think like an attacker
- Find edge cases and boundary conditions
- Challenge Blue Team's assumptions
- Be specific and actionable

## OUTPUT FORMAT

Respond with a JSON object:

{
  "vulnerabilities": [
    {
      "category": "Authentication" | "Input Validation" | "Logic Flaw" | etc.,
      "severity": "critical" | "high" | "medium" | "low",
      "description": "What the vulnerability is",
      "exploitation": "How to exploit it",
      "impact": "What happens if exploited"
    },
    ...
  ],
  "attackScenarios": [
    {
      "name": "Scenario name",
      "steps": ["step 1", "step 2", ...],
      "prerequisites": ["what attacker needs"],
      "impact": "What they achieve",
      "likelihood": "high" | "medium" | "low"
    },
    ...
  ],
  "recommendations": ["Fix 1", "Fix 2", ...]
}

IMPORTANT: Return ONLY valid JSON, no markdown formatting.`;
}

function validateAttack(attack: RedTeamAttack): void {
  if (!attack.vulnerabilities || attack.vulnerabilities.length === 0) {
    throw new Error("Red Team must identify at least one vulnerability");
  }

  if (!attack.attackScenarios || attack.attackScenarios.length === 0) {
    throw new Error("Red Team must provide at least one attack scenario");
  }

  if (!attack.recommendations || attack.recommendations.length === 0) {
    throw new Error("Red Team must provide recommendations");
  }

  // Validate each vulnerability
  for (const vuln of attack.vulnerabilities) {
    if (!vuln.category || !vuln.severity || !vuln.description) {
      throw new Error("Vulnerability missing required fields");
    }

    if (!["critical", "high", "medium", "low"].includes(vuln.severity)) {
      throw new Error(`Invalid severity: ${vuln.severity}`);
    }
  }

  // Validate each scenario
  for (const scenario of attack.attackScenarios) {
    if (!scenario.name || !scenario.steps || scenario.steps.length === 0) {
      throw new Error("Attack scenario missing required fields");
    }

    if (!["high", "medium", "low"].includes(scenario.likelihood)) {
      throw new Error(`Invalid likelihood: ${scenario.likelihood}`);
    }
  }
}
