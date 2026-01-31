/**
 * Red Team agent - attacks the system to find vulnerabilities
 */

import type { LLMProvider } from "../../core/types";
import type {
  Target,
  BlueTeamDefense,
  RedTeamAttack,
  RedBlueConfig,
} from "./types";

export async function conductAttack(
  attackerNumber: number,
  target: Target,
  defense: BlueTeamDefense,
  config: RedBlueConfig,
  provider: LLMProvider
): Promise<RedTeamAttack> {
  const focus = getAttackFocus(attackerNumber, target.threatModel || "security");
  const systemPrompt = buildSystemPrompt(focus, target.threatModel);
  const userPrompt = buildUserPrompt(target, defense);

  const response = await provider.call({
    model: config.models.redTeam,
    temperature: config.parameters.redTeamTemperature,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });

  const attack = parseAttack(response.content, attackerNumber, focus);
  validateAttack(attack);

  return attack;
}

function getAttackFocus(attackerNumber: number, threatModel: string): string {
  const focuses: Record<string, string[]> = {
    security: [
      "Authentication and authorization bypass",
      "Injection attacks (SQL, XSS, command injection)",
      "Cryptographic weaknesses",
      "Rate limiting and DoS",
      "Data leakage and privacy",
    ],
    reliability: [
      "Single points of failure",
      "Resource exhaustion",
      "Race conditions and concurrency",
      "Error handling gaps",
      "Cascading failures",
    ],
    performance: [
      "Algorithmic complexity attacks",
      "Memory leaks",
      "Network bottlenecks",
      "Inefficient queries",
      "Unbounded resource usage",
    ],
  };

  const focusAreas = focuses[threatModel] || focuses.security;
  return focusAreas[(attackerNumber - 1) % focusAreas.length];
}

function buildSystemPrompt(focus: string, threatModel?: string): string {
  return `You are a Red Team attacker - your goal is to find vulnerabilities in the system.

YOUR ROLE:
- Focus area: ${focus}
- Threat model: ${threatModel || "security"}
- Think like an adversary
- Find real, exploitable vulnerabilities
- Provide concrete exploit scenarios
- Rate severity honestly

ATTACK METHODOLOGY:
1. Study the system design
2. Identify attack surface
3. Test assumptions
4. Find edge cases
5. Construct exploits
6. Assess impact

GUIDELINES:
- Be creative: think beyond obvious attacks
- Be specific: provide concrete exploit steps
- Be realistic: must be actually exploitable
- Be thorough: check all attack vectors in your focus
- Rate severity by actual impact, not theoretical
- Cite evidence from system description

OUTPUT FORMAT:
You must respond with a JSON object containing:
{
  "vulnerabilities": [
    {
      "description": "Clear description of vulnerability",
      "exploit": "Step-by-step exploit scenario",
      "impact": "Concrete harm if exploited",
      "severity": "critical" | "high" | "medium" | "low",
      "evidence": ["Quote from system", "Quote from context", ...]
    },
    ...
  ],
  "recommendations": ["How to fix vulnerability 1", "How to fix 2", ...]
}

SEVERITY GUIDELINES:
- **critical**: Complete system compromise, data breach, service destruction
- **high**: Significant unauthorized access, major data exposure, DoS
- **medium**: Limited unauthorized access, data leakage, degraded service
- **low**: Information disclosure, minor issues, theoretical concerns

DO NOT:
- Report generic "best practices" without specific exploit
- Overstate severity (every vuln isn't critical)
- Flag things outside the defined scope
- Report duplicate vulnerabilities
- Provide vague attacks like "could be vulnerable to XSS" without proof`;
}

function buildUserPrompt(target: Target, defense: BlueTeamDefense): string {
  let prompt = `Attack this system and find vulnerabilities:\n\n`;

  prompt += `SYSTEM DESCRIPTION:\n${defense.systemOverview}\n\n`;

  prompt += `SECURITY MEASURES:\n`;
  defense.securityMeasures.forEach((measure) => {
    prompt += `- ${measure}\n`;
  });
  prompt += `\n`;

  prompt += `ASSUMPTIONS (test these!):\n`;
  defense.assumptions.forEach((assumption) => {
    prompt += `- ${assumption}\n`;
  });
  prompt += `\n`;

  if (defense.knownLimitations.length > 0) {
    prompt += `KNOWN LIMITATIONS:\n`;
    defense.knownLimitations.forEach((limit) => {
      prompt += `- ${limit}\n`;
    });
    prompt += `\n`;
  }

  if (target.context && target.context.length > 0) {
    prompt += `ADDITIONAL CONTEXT:\n`;
    target.context.forEach((ctx, i) => {
      prompt += `[${i + 1}]: ${ctx}\n`;
    });
    prompt += `\n`;
  }

  if (target.scope && target.scope.length > 0) {
    prompt += `IN SCOPE:\n`;
    target.scope.forEach((s) => (prompt += `- ${s}\n`));
    prompt += `\n`;
  }

  prompt += `Provide your attack findings as a JSON object. Focus on your assigned area.`;

  return prompt;
}

function parseAttack(
  content: string,
  attackerNumber: number,
  focus: string
): RedTeamAttack {
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error(`Red Team ${attackerNumber}: No JSON found in response`);
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]);

    return {
      attacker: `Red Team ${attackerNumber}`,
      focus,
      vulnerabilities: parsed.vulnerabilities || [],
      recommendations: parsed.recommendations || [],
    };
  } catch (error) {
    throw new Error(
      `Red Team ${attackerNumber}: Failed to parse JSON - ${error}`
    );
  }
}

function validateAttack(attack: RedTeamAttack): void {
  // Must find at least one vulnerability
  if (attack.vulnerabilities.length === 0) {
    throw new Error(
      `${attack.attacker}: Must identify at least one vulnerability`
    );
  }

  // Validate each vulnerability
  attack.vulnerabilities.forEach((vuln, i) => {
    if (!vuln.description || vuln.description.trim().length < 20) {
      throw new Error(
        `${attack.attacker}: Vulnerability ${i + 1} needs detailed description`
      );
    }

    if (!vuln.exploit || vuln.exploit.trim().length < 30) {
      throw new Error(
        `${attack.attacker}: Vulnerability ${i + 1} needs concrete exploit scenario`
      );
    }

    if (!vuln.impact || vuln.impact.trim().length < 20) {
      throw new Error(
        `${attack.attacker}: Vulnerability ${i + 1} needs specific impact description`
      );
    }

    if (
      !["critical", "high", "medium", "low"].includes(vuln.severity)
    ) {
      throw new Error(
        `${attack.attacker}: Vulnerability ${i + 1} has invalid severity "${vuln.severity}"`
      );
    }

    // Check for vague attacks
    const vagueTerms = [
      "could be vulnerable",
      "might be possible",
      "potentially",
      "should implement",
    ];

    const allText =
      vuln.description.toLowerCase() +
      " " +
      vuln.exploit.toLowerCase();

    const isVague = vagueTerms.some(
      (term) => allText.includes(term) && allText.length < 150
    );

    if (isVague) {
      throw new Error(
        `${attack.attacker}: Vulnerability ${i + 1} is too vague - provide concrete exploit`
      );
    }

    // Check for severity inflation (everything can't be critical)
    const criticalWords = [
      "complete compromise",
      "total control",
      "arbitrary code execution",
      "root access",
    ];

    const hasCriticalWords = criticalWords.some((word) =>
      allText.includes(word)
    );

    if (vuln.severity === "critical" && !hasCriticalWords) {
      // Warning but don't fail - severity is subjective
      console.warn(
        `${attack.attacker}: Vulnerability ${i + 1} marked critical but impact may not warrant it`
      );
    }
  });

  // Should have recommendations
  if (attack.recommendations.length === 0) {
    throw new Error(`${attack.attacker}: Must provide recommendations`);
  }

  // Recommendations should match vulnerabilities (roughly)
  if (attack.recommendations.length < attack.vulnerabilities.length * 0.5) {
    throw new Error(
      `${attack.attacker}: Should provide roughly one recommendation per vulnerability`
    );
  }
}
