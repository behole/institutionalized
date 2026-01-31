/**
 * Instructor - synthesizes feedback and provides guidance
 */

import type { LLMProvider } from "@core/types";
import { parseJSON } from "@core/orchestrator";
import type {
  CreativeWork,
  PeerObservation,
  CritiqueRound,
  CreatorResponse,
  InstructorSynthesis,
  StudioConfig,
} from "./types";

export async function synthesizeCritique(
  work: CreativeWork,
  observations: PeerObservation[],
  critiques: CritiqueRound[],
  creatorResponse: CreatorResponse | undefined,
  config: StudioConfig,
  provider: LLMProvider
): Promise<InstructorSynthesis> {
  const prompt = buildPrompt(work, observations, critiques, creatorResponse);

  const response = await provider.call({
    model: config.models.instructor,
    temperature: config.parameters.instructorTemperature,
    messages: [{ role: "user", content: prompt }],
    maxTokens: 3072,
  });

  const synthesis = parseJSON<InstructorSynthesis>(response.content);
  validateSynthesis(synthesis);

  return synthesis;
}

function buildPrompt(
  work: CreativeWork,
  observations: PeerObservation[],
  critiques: CritiqueRound[],
  creatorResponse?: CreatorResponse
): string {
  let prompt = `You are the INSTRUCTOR synthesizing a studio critique session.

## THE WORK (${work.workType || "general"})
${work.work.substring(0, 500)}${work.work.length > 500 ? "..." : ""}

## PEER FEEDBACK (${critiques.length} peers)

`;

  critiques.forEach((critique) => {
    prompt += `### ${critique.peer}\n`;
    prompt += `Strengths: ${critique.strengths.length} | `;
    prompt += `Weaknesses: ${critique.weaknesses.length} | `;
    prompt += `Suggestions: ${critique.suggestions.length}\n\n`;
  });

  if (creatorResponse) {
    prompt += `## CREATOR'S RESPONSE\n`;
    prompt += `Clarifications: ${creatorResponse.clarifications.length}\n`;
    prompt += `Intentions: ${creatorResponse.intentions.length}\n`;
    prompt += `Takeaways: ${creatorResponse.takeaways.length}\n\n`;
  }

  prompt += `

## YOUR TASK

As the instructor, synthesize the critique session into actionable guidance:

1. **Overall assessment** - Where does the work stand?
2. **Core feedback** - What are the most important points?
3. **Prioritized suggestions** - Order by impact
4. **Encouragement** - What's working that should continue?
5. **Next steps** - Concrete actions for improvement

## GUIDELINES

- Be constructive and supportive
- Focus on high-impact improvements
- Balance affirmation with challenge
- Make suggestions specific and actionable
- Consider the creator's goals and context

## OUTPUT FORMAT

{
  "overallAssessment": "Summary of where the work stands",
  "coreFeedback": ["Key point 1", "Key point 2", ...],
  "prioritizedSuggestions": ["Most important action", "Second priority", ...],
  "encouragement": "What's working well and should be preserved/amplified",
  "nextSteps": ["Specific action 1", "Specific action 2", ...]
}

IMPORTANT: Return ONLY valid JSON.`;

  return prompt;
}

function validateSynthesis(synthesis: InstructorSynthesis): void {
  if (!synthesis.overallAssessment || synthesis.overallAssessment.length < 20) {
    throw new Error("Instructor assessment too brief");
  }

  if (!synthesis.coreFeedback || synthesis.coreFeedback.length === 0) {
    throw new Error("Instructor must provide core feedback");
  }

  if (!synthesis.prioritizedSuggestions || synthesis.prioritizedSuggestions.length === 0) {
    throw new Error("Instructor must provide prioritized suggestions");
  }

  if (!synthesis.encouragement || synthesis.encouragement.length < 10) {
    throw new Error("Instructor must provide encouragement");
  }

  if (!synthesis.nextSteps || synthesis.nextSteps.length === 0) {
    throw new Error("Instructor must provide next steps");
  }
}
