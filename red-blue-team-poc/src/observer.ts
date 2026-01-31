/**
 * Observer agent - synthesizes red/blue findings into final report
 */

import type { LLMProvider } from "../../core/types";
import type {
  Target,
  BlueTeamDefense,
  RedTeamAttack,
  BlueTeamResponse,
  ObserverReport,
  RedBlueConfig,
} from "./types";

export async function synthesizeReport(
  target: Target,
  defense: BlueTeamDefense,
  attacks: RedTeamAttack[],
  blueResponse: BlueTeamResponse | undefined,
  config: RedBlueConfig,
  provider: LLMProvider
): Promise<ObserverReport> {
  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt(target, defense, attacks, blueResponse);

  const response = await provider.call({
    model: config.models.observer,
    temperature: config.parameters.observerTemperature,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });

  const report = parseReport(response.content);
  validateReport(report, attacks);

  return report;
}

function buildSystemPrompt(): string {
  return `You are the Observer - an impartial analyst synthesizing red team attacks and blue team responses.

YOUR ROLE:
- Evaluate which vulnerabilities are confirmed
- Assess blue team responses fairly
- Determine overall risk level
- Provide readiness assessment

SYNTHESIS PRINCIPLES:
1. Weight evidence over claims
2. Consider both red team findings AND blue team responses
3. Confirmed = red team exploit is valid AND blue hasn't mitigated
4. Disputed = legitimate disagreement with evidence on both sides
5. Mitigated = blue team provided proof of defense

GUIDELINES:
- Be objective: not pro-red or pro-blue
- Be evidence-based: cite specific points
- Be risk-focused: real-world impact matters
- Be actionable: clear guidance on readiness

OUTPUT FORMAT:
{
  "summary": "Executive summary of findings",
  "confirmedVulnerabilities": [
    {
      "description": "Vulnerability description",
      "severity": "critical" | "high" | "medium" | "low",
      "impact": "Real-world consequences",
      "recommendation": "How to fix",
      "status": "unmitigated" | "mitigated" | "disputed"
    }
  ],
  "overallRisk": "critical" | "high" | "medium" | "low",
  "readinessAssessment": "Can this ship? Under what conditions?"
}

RISK LEVELS:
- **critical**: Do not ship - fundamental security flaws
- **high**: Ship with serious reservations - major issues need fixes
- **medium**: Ship with caution - known issues, mitigations in place
- **low**: Ship confidently - minor issues only

DO NOT:
- Simply count vulnerabilities (severity matters)
- Ignore blue team responses
- Be swayed by rhetoric over evidence
- Downplay risks to be "positive"`;
}

function buildUserPrompt(
  target: Target,
  defense: BlueTeamDefense,
  attacks: RedTeamAttack[],
  blueResponse: BlueTeamResponse | undefined
): string {
  let prompt = `Synthesize the following red team / blue team exercise:\n\n`;

  prompt += `TARGET SYSTEM:\n${target.system}\n\n`;
  prompt += `Blue Team Overview:\n${defense.systemOverview}\n\n`;

  prompt += `RED TEAM FINDINGS:\n\n`;
  attacks.forEach((attack) => {
    prompt += `${attack.attacker} (${attack.focus}):\n`;
    attack.vulnerabilities.forEach((vuln) => {
      prompt += `  [${vuln.severity.toUpperCase()}] ${vuln.description}\n`;
      prompt += `  Exploit: ${vuln.exploit}\n`;
      prompt += `  Impact: ${vuln.impact}\n\n`;
    });
  });

  if (blueResponse) {
    prompt += `BLUE TEAM RESPONSES:\n\n`;
    blueResponse.vulnerabilityResponses.forEach((resp) => {
      prompt += `  "${resp.vulnerability}":\n`;
      prompt += `  Response: ${resp.response.toUpperCase()}\n`;
      prompt += `  Explanation: ${resp.explanation}\n`;
      if (resp.mitigation) {
        prompt += `  Mitigation: ${resp.mitigation}\n`;
      }
      prompt += `\n`;
    });
  }

  prompt += `Provide your observer report as a JSON object.`;

  return prompt;
}

function parseReport(content: string): ObserverReport {
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Observer: No JSON found in report");
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]);

    return {
      summary: parsed.summary,
      confirmedVulnerabilities: parsed.confirmedVulnerabilities || [],
      overallRisk: parsed.overallRisk,
      readinessAssessment: parsed.readinessAssessment,
    };
  } catch (error) {
    throw new Error(`Observer: Failed to parse report JSON - ${error}`);
  }
}

function validateReport(report: ObserverReport, attacks: RedTeamAttack[]): void {
  if (!report.summary || report.summary.trim().length < 50) {
    throw new Error("Observer: Summary must be substantial");
  }

  if (!["critical", "high", "medium", "low"].includes(report.overallRisk)) {
    throw new Error(`Observer: Invalid overall risk "${report.overallRisk}"`);
  }

  if (
    !report.readinessAssessment ||
    report.readinessAssessment.trim().length < 30
  ) {
    throw new Error("Observer: Readiness assessment must be detailed");
  }

  // Should confirm at least some vulnerabilities
  const totalVulns = attacks.reduce(
    (sum, attack) => sum + attack.vulnerabilities.length,
    0
  );

  if (report.confirmedVulnerabilities.length === 0 && totalVulns > 0) {
    throw new Error(
      "Observer: Red team found vulnerabilities but observer confirmed none - explain why"
    );
  }

  // Validate each confirmed vulnerability
  report.confirmedVulnerabilities.forEach((vuln, i) => {
    if (
      !["critical", "high", "medium", "low"].includes(vuln.severity)
    ) {
      throw new Error(
        `Observer: Vulnerability ${i + 1} has invalid severity`
      );
    }

    if (
      !["unmitigated", "mitigated", "disputed"].includes(vuln.status)
    ) {
      throw new Error(
        `Observer: Vulnerability ${i + 1} has invalid status "${vuln.status}"`
      );
    }

    if (!vuln.recommendation || vuln.recommendation.trim().length < 20) {
      throw new Error(
        `Observer: Vulnerability ${i + 1} needs actionable recommendation`
      );
    }
  });

  // Overall risk should match vulnerability severity
  const hasCritical = report.confirmedVulnerabilities.some(
    (v) => v.severity === "critical" && v.status === "unmitigated"
  );

  if (hasCritical && report.overallRisk !== "critical") {
    throw new Error(
      "Observer: Unmitigated critical vulnerabilities found but overall risk not critical"
    );
  }

  // Readiness assessment should match risk
  const assessmentLower = report.readinessAssessment.toLowerCase();

  if (
    report.overallRisk === "critical" &&
    !assessmentLower.includes("not ready")
  ) {
    console.warn(
      "Observer: Critical risk but assessment doesn't clearly say 'not ready'"
    );
  }
}
