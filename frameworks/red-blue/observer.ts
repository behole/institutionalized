/**
 * Observer - synthesizes findings and makes recommendations
 */

import type { LLMProvider } from "@core/types";
import { parseJSON } from "@core/orchestrator";
import type {
  Target,
  BlueTeamProposal,
  RedTeamAttack,
  ObserverReport,
  RedBlueConfig,
} from "./types";

export async function synthesizeFindings(
  target: Target,
  blueProposal: BlueTeamProposal,
  redAttacks: RedTeamAttack[],
  config: RedBlueConfig,
  provider: LLMProvider
): Promise<ObserverReport> {
  const prompt = buildPrompt(target, blueProposal, redAttacks);

  const response = await provider.call({
    model: config.models.observer,
    temperature: config.parameters.observerTemperature,
    messages: [{ role: "user", content: prompt }],
    maxTokens: 4096,
  });

  const report = parseJSON<ObserverReport>(response.content);
  validateReport(report);

  return report;
}

function buildPrompt(
  target: Target,
  blueProposal: BlueTeamProposal,
  redAttacks: RedTeamAttack[]
): string {
  let prompt = `You are the OBSERVER - your role is to synthesize the Red Team / Blue Team exercise and provide an objective assessment.

## TARGET SYSTEM
${target.system}

## BLUE TEAM PROPOSAL
**Summary:** ${blueProposal.summary}
**Architecture:** ${blueProposal.architecture}

## RED TEAM FINDINGS (${redAttacks.length} rounds)

`;

  redAttacks.forEach((attack, i) => {
    prompt += `\n### Round ${i + 1}\n\n`;
    prompt += `**Vulnerabilities Found:** ${attack.vulnerabilities.length}\n`;
    attack.vulnerabilities.forEach((v) => {
      prompt += `- [${v.severity.toUpperCase()}] ${v.category}: ${v.description}\n`;
    });
    prompt += `\n**Attack Scenarios:** ${attack.attackScenarios.length}\n`;
    attack.attackScenarios.forEach((s) => {
      prompt += `- ${s.name} (${s.likelihood} likelihood)\n`;
    });
  });

  prompt += `

## YOUR TASK

As the Observer, you must:

1. **Identify critical vulnerabilities** - which findings are most serious?
2. **Assess high-risk scenarios** - which attacks are most likely/damaging?
3. **Provide overall assessment** - is the system ready, or does it need work?
4. **Prioritize actions** - what should be fixed first?

## VERDICT CRITERIA

- **ready** - Minor issues only, system is sound
- **needs-hardening** - Good foundation but significant improvements needed
- **significant-risks** - Major vulnerabilities that must be addressed

## OUTPUT FORMAT

Respond with a JSON object:

{
  "criticalVulnerabilities": [
    {
      "category": "...",
      "severity": "critical" | "high",
      "description": "...",
      "exploitation": "...",
      "impact": "..."
    },
    ...
  ],
  "highRiskScenarios": [
    {
      "name": "...",
      "steps": [...],
      "prerequisites": [...],
      "impact": "...",
      "likelihood": "high" | "medium"
    },
    ...
  ],
  "overallAssessment": "Your synthesis of the findings",
  "prioritizedActions": ["Action 1 (why)", "Action 2 (why)", ...],
  "verdict": "ready" | "needs-hardening" | "significant-risks"
}

IMPORTANT: Return ONLY valid JSON, no markdown formatting.`;

  return prompt;
}

function validateReport(report: ObserverReport): void {
  if (!report.overallAssessment || report.overallAssessment.length < 50) {
    throw new Error("Observer assessment too brief");
  }

  if (
    !report.prioritizedActions ||
    report.prioritizedActions.length === 0
  ) {
    throw new Error("Observer must provide prioritized actions");
  }

  if (!["ready", "needs-hardening", "significant-risks"].includes(report.verdict)) {
    throw new Error(`Invalid verdict: ${report.verdict}`);
  }

  // At least some findings should be reported
  const totalFindings =
    report.criticalVulnerabilities.length + report.highRiskScenarios.length;

  if (totalFindings === 0 && report.verdict !== "ready") {
    throw new Error(
      "If verdict is not 'ready', must report vulnerabilities or scenarios"
    );
  }
}
