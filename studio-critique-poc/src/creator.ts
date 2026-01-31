/**
 * Creator agent - responds to critique
 */

import type { LLMProvider } from "../../core/types";
import type {
  Work,
  PeerCritique,
  InstructorAssessment,
  CreatorResponse,
  StudioCritiqueConfig,
} from "./types";

export async function respondToCritique(
  work: Work,
  critiques: PeerCritique[],
  assessment: InstructorAssessment,
  config: StudioCritiqueConfig,
  provider: LLMProvider
): Promise<CreatorResponse> {
  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt(work, critiques, assessment);

  const response = await provider.call({
    model: config.models.creator,
    temperature: 0.7,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });

  const creatorResponse = parseResponse(response.content);
  validateResponse(creatorResponse, critiques);

  return creatorResponse;
}

function buildSystemPrompt(): string {
  return `You are the creator responding after hearing peer and instructor feedback on your work.

YOUR ROLE:
- Clarify questions raised during critique
- Note where intention differed from reception
- Outline revision plan

GUIDELINES:
- Be receptive, not defensive
- Acknowledge valid points
- Explain intent where misunderstood
- Commit to specific changes
- Ask for clarification if needed

OUTPUT FORMAT:
{
  "clarifications": ["answer to question 1", ...],
  "intendedVsReceived": "Where your intent wasn't clear",
  "revisionPlan": "Specific changes you'll make"
}

RESPONSE PRINCIPLES:
- Distinguish between "I didn't communicate this" and "I disagree"
- Most confusion is your communication failure, not their misunderstanding
- Focus on what you'll change, not justifying what you did
- Commit to concrete revisions

DO NOT:
- Dismiss feedback ("you misunderstood")
- Over-explain to defend choices
- Argue with critiques
- Make vague promises ("I'll improve it")`;
}

function buildUserPrompt(
  work: Work,
  critiques: PeerCritique[],
  assessment: InstructorAssessment
): string {
  let prompt = `You created this work:\n\n${work.content}\n\n`;

  if (work.context) {
    prompt += `Your original context: ${work.context}\n\n`;
  }

  prompt += `PEER CRITIQUES:\n\n`;
  critiques.forEach((critique) => {
    if (critique.questions.length > 0) {
      prompt += `${critique.peer} Questions:\n`;
      critique.questions.forEach((q) => (prompt += `  - ${q}\n`));
      prompt += `\n`;
    }
  });

  prompt += `INSTRUCTOR ASSESSMENT:\n`;
  prompt += `Synthesis: ${assessment.synthesis}\n`;
  prompt += `Areas to Revise:\n`;
  assessment.areasToRevise.forEach((area) => (prompt += `  - ${area}\n`));
  prompt += `\nNext Steps: ${assessment.nextSteps}\n\n`;

  prompt += `Respond to the critique as a JSON object.`;

  return prompt;
}

function parseResponse(content: string): CreatorResponse {
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Creator: No JSON found in response");
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]);

    return {
      clarifications: parsed.clarifications || [],
      intendedVsReceived: parsed.intendedVsReceived,
      revisionPlan: parsed.revisionPlan,
    };
  } catch (error) {
    throw new Error(`Creator: Failed to parse JSON - ${error}`);
  }
}

function validateResponse(
  response: CreatorResponse,
  critiques: PeerCritique[]
): void {
  const totalQuestions = critiques.reduce(
    (sum, c) => sum + c.questions.length,
    0
  );

  // Should address most questions
  if (
    totalQuestions > 0 &&
    response.clarifications.length < totalQuestions * 0.5
  ) {
    throw new Error(
      `Creator: Should address at least half of the ${totalQuestions} questions asked`
    );
  }

  if (
    !response.intendedVsReceived ||
    response.intendedVsReceived.trim().length < 30
  ) {
    throw new Error(
      "Creator: Must explain where intention differed from reception"
    );
  }

  if (!response.revisionPlan || response.revisionPlan.trim().length < 50) {
    throw new Error(
      "Creator: Revision plan must be specific (at least 50 characters)"
    );
  }

  // Check for defensiveness
  const defensivePhrases = [
    "you misunderstood",
    "that's not what I meant",
    "actually",
    "you're wrong",
  ];

  const allText =
    response.clarifications.join(" ") +
    " " +
    response.intendedVsReceived +
    " " +
    response.revisionPlan;

  const isDefensive = defensivePhrases.some((phrase) =>
    allText.toLowerCase().includes(phrase)
  );

  if (isDefensive) {
    throw new Error("Creator: Response appears defensive - be receptive");
  }

  // Check revision plan is specific
  const vaguePlans = [
    "I'll improve it",
    "I'll fix the issues",
    "I'll make changes",
    "I'll work on it",
  ];

  const planLower = response.revisionPlan.toLowerCase();
  const isVague = vaguePlans.some(
    (plan) => planLower.includes(plan) && planLower.length < 100
  );

  if (isVague) {
    throw new Error("Creator: Revision plan too vague - be specific");
  }
}
