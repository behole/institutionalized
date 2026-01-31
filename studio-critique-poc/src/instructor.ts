/**
 * Instructor agent - synthesizes peer feedback and provides guidance
 */

import type { LLMProvider } from "../../core/types";
import type {
  Work,
  PeerCritique,
  InstructorAssessment,
  StudioCritiqueConfig,
} from "./types";

export async function assessWork(
  work: Work,
  critiques: PeerCritique[],
  config: StudioCritiqueConfig,
  provider: LLMProvider
): Promise<InstructorAssessment> {
  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt(work, critiques);

  const response = await provider.call({
    model: config.models.instructor,
    temperature: config.parameters.instructorTemperature,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });

  const assessment = parseAssessment(response.content);
  validateAssessment(assessment, critiques);

  return assessment;
}

function buildSystemPrompt(): string {
  return `You are the instructor leading a studio critique. You've heard peer feedback - now provide your expert assessment.

YOUR ROLE:
- Synthesize peer feedback (patterns, agreements, disagreements)
- Separate technical/craft issues from conceptual/idea issues
- Identify what's working that should be kept
- Identify what needs revision
- Provide concrete next steps
- Determine if work is ready to ship

GUIDELINES:
- Build on peer insights (don't just repeat them)
- Look for patterns across critiques
- MUST reference specific peers by name (e.g. "Peer 1 noted..." "Peer 2 identified...")
- Distinguish fixable issues from fundamental problems
- Prioritize feedback (what matters most)
- Be specific and actionable
- Balance support with honesty

OUTPUT FORMAT:
{
  "synthesis": "Integration of peer feedback with patterns identified",
  "technicalNotes": "Craft/execution observations (style, structure, technique)",
  "conceptualNotes": "Idea/content observations (clarity, originality, depth)",
  "strengthsToKeep": ["what's working", ...],
  "areasToRevise": ["what needs work", ...],
  "nextSteps": "Concrete guidance for revision",
  "readyToShip": true/false
}

SYNTHESIS PRINCIPLES:
1. Look for agreements across peers (consensus signals truth)
2. Explore disagreements (often reveal complexity)
3. Add your expert perspective (don't just summarize)
4. Connect technical and conceptual issues
5. Provide actionable path forward

DO NOT:
- Simply list peer comments
- Ignore minority opinions
- Be vague ("improve the writing")
- Overwhelm with too many changes at once`;
}

function buildUserPrompt(work: Work, critiques: PeerCritique[]): string {
  let prompt = `Provide instructor assessment for this work:\n\n`;

  if (work.context) {
    prompt += `CREATOR'S CONTEXT:\n${work.context}\n\n`;
  }

  prompt += `WORK:\n${work.content}\n\n`;
  prompt += `PEER CRITIQUES (${critiques.length}):\n\n`;

  critiques.forEach((critique) => {
    prompt += `${critique.peer}:\n`;
    prompt += `  Overall: ${critique.overallImpression}\n`;

    if (critique.whatWorks.length > 0) {
      prompt += `  What Works:\n`;
      critique.whatWorks.forEach((w) => (prompt += `    - ${w}\n`));
    }

    if (critique.whatDoesnt.length > 0) {
      prompt += `  What Doesn't:\n`;
      critique.whatDoesnt.forEach((d) => (prompt += `    - ${d}\n`));
    }

    if (critique.questions.length > 0) {
      prompt += `  Questions:\n`;
      critique.questions.forEach((q) => (prompt += `    - ${q}\n`));
    }

    prompt += `\n`;
  });

  prompt += `Provide your instructor assessment as a JSON object.`;

  return prompt;
}

function parseAssessment(content: string): InstructorAssessment {
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Instructor: No JSON found in assessment");
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]);

    return {
      synthesis: parsed.synthesis,
      technicalNotes: parsed.technicalNotes,
      conceptualNotes: parsed.conceptualNotes,
      strengthsToKeep: parsed.strengthsToKeep || [],
      areasToRevise: parsed.areasToRevise || [],
      nextSteps: parsed.nextSteps,
      readyToShip: parsed.readyToShip,
    };
  } catch (error) {
    throw new Error(`Instructor: Failed to parse JSON - ${error}`);
  }
}

function validateAssessment(
  assessment: InstructorAssessment,
  critiques: PeerCritique[]
): void {
  if (!assessment.synthesis || assessment.synthesis.trim().length < 50) {
    throw new Error("Instructor: Synthesis must be substantial");
  }

  if (!assessment.technicalNotes || assessment.technicalNotes.trim().length < 30) {
    throw new Error("Instructor: Technical notes required");
  }

  if (!assessment.conceptualNotes || assessment.conceptualNotes.trim().length < 30) {
    throw new Error("Instructor: Conceptual notes required");
  }

  if (!assessment.nextSteps || assessment.nextSteps.trim().length < 30) {
    throw new Error("Instructor: Next steps must be concrete and detailed");
  }

  // Should reference peer feedback
  const peerMentions = critiques.filter((c) =>
    assessment.synthesis.includes(c.peer)
  );

  if (peerMentions.length === 0) {
    throw new Error(
      "Instructor: Synthesis must reference specific peer feedback"
    );
  }

  // Should identify strengths or areas to revise
  if (
    assessment.strengthsToKeep.length === 0 &&
    assessment.areasToRevise.length === 0
  ) {
    throw new Error(
      "Instructor: Must identify strengths or areas to revise"
    );
  }

  // If not ready to ship, must have areas to revise
  if (!assessment.readyToShip && assessment.areasToRevise.length === 0) {
    throw new Error(
      "Instructor: If not ready to ship, must specify areas to revise"
    );
  }

  // Check next steps are actionable
  const vagueSteps = [
    "improve the work",
    "make it better",
    "revise as needed",
    "fix issues",
  ];

  const nextStepsLower = assessment.nextSteps.toLowerCase();
  const isVague = vagueSteps.some((step) => nextStepsLower.includes(step));

  if (isVague) {
    throw new Error("Instructor: Next steps too vague - be specific");
  }
}
