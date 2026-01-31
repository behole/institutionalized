/**
 * Blue Team - proposes and defends the system
 */

import type { LLMProvider } from "@core/types";
import { parseJSON } from "@core/orchestrator";
import type { Target, BlueTeamProposal, RedBlueConfig } from "./types";

export async function proposeSystem(
  target: Target,
  config: RedBlueConfig,
  provider: LLMProvider
): Promise<BlueTeamProposal> {
  const prompt = buildPrompt(target);

  const response = await provider.call({
    model: config.models.blueTeam,
    temperature: config.parameters.blueTemperature,
    messages: [{ role: "user", content: prompt }],
    maxTokens: 4096,
  });

  const proposal = parseJSON<BlueTeamProposal>(response.content);
  validateProposal(proposal);

  return proposal;
}

function buildPrompt(target: Target): string {
  let prompt = `You are the BLUE TEAM - your role is to propose and defend a system design.

## TARGET SYSTEM
${target.system}
`;

  if (target.context && target.context.length > 0) {
    prompt += `\n## CONTEXT\n`;
    target.context.forEach((ctx, i) => {
      prompt += `${i + 1}. ${ctx}\n`;
    });
  }

  if (target.constraints && target.constraints.length > 0) {
    prompt += `\n## CONSTRAINTS\n`;
    target.constraints.forEach((c, i) => {
      prompt += `${i + 1}. ${c}\n`;
    });
  }

  prompt += `

## YOUR TASK

As the Blue Team, you must:

1. **Propose a complete system design** that addresses the target
2. **Document your architecture** - how it works, components, data flow
3. **Describe security measures** - what defenses are in place
4. **State your assumptions** - what you're assuming about the environment/users

## GUIDELINES

- Be thorough but realistic
- Consider common attack vectors
- Document trade-offs you're making
- Be explicit about what you're NOT defending against

## OUTPUT FORMAT

Respond with a JSON object:

{
  "summary": "Brief overview of the system",
  "architecture": "Detailed description of how it works",
  "securityMeasures": ["measure 1", "measure 2", ...],
  "assumptions": ["assumption 1", "assumption 2", ...]
}

IMPORTANT: Return ONLY valid JSON, no markdown formatting.`;

  return prompt;
}

function validateProposal(proposal: BlueTeamProposal): void {
  if (!proposal.summary || proposal.summary.length < 20) {
    throw new Error("Blue Team proposal missing or too brief");
  }

  if (!proposal.architecture || proposal.architecture.length < 50) {
    throw new Error("Blue Team architecture description insufficient");
  }

  if (!proposal.securityMeasures || proposal.securityMeasures.length === 0) {
    throw new Error("Blue Team must specify security measures");
  }

  if (!proposal.assumptions || proposal.assumptions.length === 0) {
    throw new Error("Blue Team must state assumptions");
  }
}
