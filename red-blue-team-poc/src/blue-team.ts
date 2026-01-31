/**
 * Blue Team agent - defends the system and responds to attacks
 */

import type { LLMProvider } from "../../core/types";
import type {
  Target,
  BlueTeamDefense,
  BlueTeamResponse,
  RedTeamAttack,
  RedBlueConfig,
} from "./types";

export async function presentDefense(
  target: Target,
  config: RedBlueConfig,
  provider: LLMProvider
): Promise<BlueTeamDefense> {
  const systemPrompt = buildDefenseSystemPrompt();
  const userPrompt = buildDefenseUserPrompt(target);

  const response = await provider.call({
    model: config.models.blueTeam,
    temperature: config.parameters.blueTeamTemperature,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });

  const defense = parseDefense(response.content);
  validateDefense(defense);

  return defense;
}

export async function respondToAttacks(
  target: Target,
  defense: BlueTeamDefense,
  attacks: RedTeamAttack[],
  config: RedBlueConfig,
  provider: LLMProvider
): Promise<BlueTeamResponse> {
  const systemPrompt = buildResponseSystemPrompt();
  const userPrompt = buildResponseUserPrompt(target, defense, attacks);

  const response = await provider.call({
    model: config.models.blueTeam,
    temperature: config.parameters.blueTeamTemperature,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });

  const blueResponse = parseResponse(response.content);
  validateResponse(blueResponse, attacks);

  return blueResponse;
}

function buildDefenseSystemPrompt(): string {
  return `You are the Blue Team - the system defender presenting your design for security review.

YOUR ROLE:
- Present the system architecture honestly
- Explain security measures in place
- State your assumptions clearly
- Acknowledge known limitations (don't hide them)
- Provide enough detail for red team to test

GUIDELINES:
- Be thorough: red team needs complete picture
- Be honest: hiding weaknesses helps no one
- Be specific: cite exact implementations, not vague claims
- Separate what's implemented vs. planned
- Don't be defensive - you want to find issues before production

OUTPUT FORMAT:
You must respond with a JSON object containing:
{
  "systemOverview": "Detailed description of how system works",
  "securityMeasures": ["measure 1", "measure 2", ...],
  "assumptions": ["assumption 1", "assumption 2", ...],
  "knownLimitations": ["limitation 1", "limitation 2", ...]
}

PRESENTATION STYLE:
- Technical and precise
- Implementation-focused (how, not why)
- Evidence-based (cite code, configs, documentation)
- Vulnerability-aware (acknowledge weaknesses)`;
}

function buildDefenseUserPrompt(target: Target): string {
  let prompt = `Present the following system for red team security testing:\n\n`;
  prompt += `SYSTEM:\n${target.system}\n\n`;

  if (target.context && target.context.length > 0) {
    prompt += `CONTEXT:\n`;
    target.context.forEach((ctx, i) => {
      prompt += `[${i + 1}]: ${ctx}\n`;
    });
    prompt += `\n`;
  }

  if (target.scope && target.scope.length > 0) {
    prompt += `SCOPE (what to focus on):\n`;
    target.scope.forEach((s) => (prompt += `- ${s}\n`));
    prompt += `\n`;
  }

  if (target.threatModel) {
    prompt += `THREAT MODEL: ${target.threatModel}\n\n`;
  }

  prompt += `Provide your defense presentation as a JSON object.`;

  return prompt;
}

function parseDefense(content: string): BlueTeamDefense {
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Blue Team: No JSON found in defense presentation");
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]);

    return {
      systemOverview: parsed.systemOverview,
      securityMeasures: parsed.securityMeasures || [],
      assumptions: parsed.assumptions || [],
      knownLimitations: parsed.knownLimitations || [],
    };
  } catch (error) {
    throw new Error(`Blue Team: Failed to parse defense JSON - ${error}`);
  }
}

function validateDefense(defense: BlueTeamDefense): void {
  if (!defense.systemOverview || defense.systemOverview.trim().length < 50) {
    throw new Error(
      "Blue Team: System overview must be substantial (at least 50 characters)"
    );
  }

  if (defense.securityMeasures.length === 0) {
    throw new Error(
      "Blue Team: Must specify at least one security measure (or state 'None implemented')"
    );
  }

  if (defense.assumptions.length === 0) {
    throw new Error(
      "Blue Team: Must state at least one assumption (or state 'No assumptions')"
    );
  }

  // Check for vague security claims
  const vagueTerms = [
    "industry standard",
    "best practices",
    "secure by default",
    "enterprise-grade",
  ];

  const allText =
    defense.systemOverview +
    " " +
    defense.securityMeasures.join(" ") +
    " " +
    defense.assumptions.join(" ");

  const hasOnlyVague = vagueTerms.some(
    (term) => allText.toLowerCase().includes(term) && allText.length < 200
  );

  if (hasOnlyVague) {
    throw new Error(
      "Blue Team: Avoid vague security terms - be specific about implementations"
    );
  }
}

function buildResponseSystemPrompt(): string {
  return `You are the Blue Team responding to red team attack findings.

YOUR ROLE:
- Review each vulnerability found by red team
- Accept valid findings honestly
- Dispute invalid findings with evidence
- Provide mitigations for accepted vulnerabilities
- Update system design if needed

RESPONSE TYPES:
1. **accepted**: "This is a real vulnerability. Here's how we'll fix it..."
2. **disputed**: "This doesn't work because... [evidence]"
3. **mitigated**: "We already handle this via... [proof]"

GUIDELINES:
- Be honest: don't dismiss real vulnerabilities
- Be specific: cite exact code, configs, or tests
- Provide mitigations: actionable fixes, not vague promises
- Don't be defensive: red team is helping you
- Acknowledge severity accurately

OUTPUT FORMAT:
You must respond with a JSON object containing:
{
  "vulnerabilityResponses": [
    {
      "vulnerability": "Quote exact vulnerability description",
      "response": "accepted" | "disputed" | "mitigated",
      "explanation": "Detailed explanation",
      "mitigation": "How to fix (if accepted)"
    },
    ...
  ],
  "systemUpdates": ["Update 1", "Update 2", ...]  // Optional hardening changes
}

DO NOT:
- Dismiss vulnerabilities without evidence
- Argue semantics instead of substance
- Promise vague "future fixes"
- Downplay severity to look better`;
}

function buildResponseUserPrompt(
  target: Target,
  defense: BlueTeamDefense,
  attacks: RedTeamAttack[]
): string {
  let prompt = `You presented this system:\n\n`;
  prompt += `${defense.systemOverview}\n\n`;

  prompt += `Security measures: ${defense.securityMeasures.join(", ")}\n`;
  prompt += `Assumptions: ${defense.assumptions.join(", ")}\n\n`;

  prompt += `The red team found the following vulnerabilities:\n\n`;

  attacks.forEach((attack) => {
    prompt += `${attack.attacker} (Focus: ${attack.focus}):\n\n`;
    attack.vulnerabilities.forEach((vuln, i) => {
      prompt += `  Vulnerability ${i + 1} [${vuln.severity.toUpperCase()}]:\n`;
      prompt += `  Description: ${vuln.description}\n`;
      prompt += `  Exploit: ${vuln.exploit}\n`;
      prompt += `  Impact: ${vuln.impact}\n`;
      if (vuln.evidence.length > 0) {
        prompt += `  Evidence: ${vuln.evidence.join(", ")}\n`;
      }
      prompt += `\n`;
    });
  });

  prompt += `Respond to each vulnerability finding as a JSON object.`;

  return prompt;
}

function parseResponse(content: string): BlueTeamResponse {
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Blue Team: No JSON found in response");
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]);

    return {
      vulnerabilityResponses: parsed.vulnerabilityResponses || [],
      systemUpdates: parsed.systemUpdates || [],
    };
  } catch (error) {
    throw new Error(`Blue Team: Failed to parse response JSON - ${error}`);
  }
}

function validateResponse(
  response: BlueTeamResponse,
  attacks: RedTeamAttack[]
): void {
  const totalVulns = attacks.reduce(
    (sum, attack) => sum + attack.vulnerabilities.length,
    0
  );

  // Must respond to at least 75% of vulnerabilities
  const minResponses = Math.ceil(totalVulns * 0.75);

  if (response.vulnerabilityResponses.length < minResponses) {
    throw new Error(
      `Blue Team: Must respond to at least ${minResponses} vulnerabilities (found ${response.vulnerabilityResponses.length})`
    );
  }

  // Validate each response
  response.vulnerabilityResponses.forEach((resp, i) => {
    if (!["accepted", "disputed", "mitigated"].includes(resp.response)) {
      throw new Error(
        `Blue Team: Response ${i + 1} has invalid type "${resp.response}"`
      );
    }

    if (!resp.explanation || resp.explanation.trim().length < 30) {
      throw new Error(
        `Blue Team: Response ${i + 1} needs substantial explanation (at least 30 characters)`
      );
    }

    if (resp.response === "accepted" && !resp.mitigation) {
      throw new Error(
        `Blue Team: Response ${i + 1} accepted vulnerability but provided no mitigation`
      );
    }

    // Check for dismissive responses
    const dismissivePhrases = [
      "won't happen",
      "not a real issue",
      "out of scope",
      "not our problem",
    ];

    const explanationLower = resp.explanation.toLowerCase();
    const isDismissive = dismissivePhrases.some(
      (phrase) =>
        explanationLower.includes(phrase) && explanationLower.length < 100
    );

    if (isDismissive && resp.response === "disputed") {
      throw new Error(
        `Blue Team: Response ${i + 1} appears dismissive - provide substantive explanation`
      );
    }
  });
}
