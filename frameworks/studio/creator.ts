/**
 * Creator - responds to feedback
 */

import type { LLMProvider } from "@core/types";
import { parseJSON } from "@core/orchestrator";
import type { CreativeWork, PeerObservation, CritiqueRound, CreatorResponse, StudioConfig } from "./types";

export async function respondToFeedback(
  work: CreativeWork,
  observations: PeerObservation[],
  critiques: CritiqueRound[],
  config: StudioConfig,
  provider: LLMProvider
): Promise<CreatorResponse> {
  const prompt = buildPrompt(work, observations, critiques);

  const response = await provider.call({
    model: config.models.creator,
    temperature: 0.6,
    messages: [{ role: "user", content: prompt }],
    maxTokens: 2048,
  });

  const creatorResponse = parseJSON<CreatorResponse>(response.content);
  return creatorResponse;
}

function buildPrompt(
  work: CreativeWork,
  observations: PeerObservation[],
  critiques: CritiqueRound[]
): string {
  let prompt = `You are the CREATOR responding to peer feedback in a studio critique.

## YOUR WORK
${work.work}

## PEER OBSERVATIONS

`;

  observations.forEach((obs) => {
    prompt += `### ${obs.peer}\n`;
    if (obs.observations.length > 0) {
      prompt += `Observations:\n`;
      obs.observations.forEach((o) => (prompt += `- ${o}\n`));
    }
    if (obs.questions.length > 0) {
      prompt += `Questions:\n`;
      obs.questions.forEach((q) => (prompt += `- ${q}\n`));
    }
    prompt += `\n`;
  });

  prompt += `## PEER CRITIQUES\n\n`;

  critiques.forEach((critique) => {
    prompt += `### ${critique.peer}\n`;
    if (critique.strengths.length > 0) {
      prompt += `Strengths:\n`;
      critique.strengths.forEach((s) => (prompt += `- ${s}\n`));
    }
    if (critique.weaknesses.length > 0) {
      prompt += `Weaknesses:\n`;
      critique.weaknesses.forEach((w) => (prompt += `- ${w}\n`));
    }
    if (critique.suggestions.length > 0) {
      prompt += `Suggestions:\n`;
      critique.suggestions.forEach((s) => (prompt += `- ${s}\n`));
    }
    prompt += `\n`;
  });

  prompt += `

## YOUR TASK

Respond to the feedback:

1. **Clarify** - Answer questions, explain choices
2. **Share intent** - What were you trying to achieve?
3. **Identify takeaways** - What resonates? What will you change?

## GUIDELINES

- Be open to feedback
- Explain your thinking
- Don't be defensive
- Show what you've learned

## OUTPUT FORMAT

{
  "clarifications": ["Answer to question/observation 1", ...],
  "intentions": ["I was trying to...", "My goal was...", ...],
  "takeaways": ["I will...", "I learned...", "I need to..."]
}

IMPORTANT: Return ONLY valid JSON.`;

  return prompt;
}
