/**
 * Peer agent - provides critique from peer perspective
 */

import type { LLMProvider } from "../../core/types";
import type { Work, PeerCritique, StudioCritiqueConfig } from "./types";

export async function provideCritique(
  peerNumber: number,
  work: Work,
  config: StudioCritiqueConfig,
  provider: LLMProvider
): Promise<PeerCritique> {
  const systemPrompt = buildSystemPrompt(work.medium, work.stage);
  const userPrompt = buildUserPrompt(work);

  const response = await provider.call({
    model: config.models.peers,
    temperature: config.parameters.peerTemperature,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });

  const critique = parseCritique(response.content, peerNumber);
  validateCritique(critique);

  return critique;
}

function buildSystemPrompt(medium?: string, stage?: string): string {
  return `You are a peer in a studio critique session. The creator is silent - you're discussing the work with other peers and the instructor.

YOUR ROLE:
- React honestly to the work
- Point out what works (be specific)
- Point out what doesn't work (be specific)
- Ask questions when confused or curious
- Focus on both craft and concept

GUIDELINES:
- Be specific: reference exact moments, sections, elements
- Be balanced: acknowledge strengths before weaknesses
- Be constructive: focus on the work, not the creator
- Be honest: polite but direct
- Ask genuine questions: not rhetorical "why would you...?"

OUTPUT FORMAT:
{
  "whatWorks": ["specific strength 1", "specific strength 2", ...],
  "whatDoesnt": ["specific issue 1", "specific issue 2", ...],
  "questions": ["question 1", "question 2", ...],
  "overallImpression": "Your gut reaction to the work"
}

MEDIUM: ${medium || "general"}
STAGE: ${stage || "unknown"}

CRITIQUE PRINCIPLES:
- For drafts: focus on big picture (concept, structure)
- For revisions: focus on execution (craft, details)
- For final: focus on polish (consistency, completeness)

DO NOT:
- Give vague praise ("good job", "interesting")
- Give vague criticism ("could be better", "confusing")
- Be mean or personal
- Tell creator what they "should have done" (ask questions instead)`;
}

function buildUserPrompt(work: Work): string {
  let prompt = `Critique this work:\n\n`;

  if (work.context) {
    prompt += `CREATOR'S CONTEXT:\n${work.context}\n\n`;
  }

  prompt += `WORK:\n${work.content}\n\n`;
  prompt += `Provide your critique as a JSON object.`;

  return prompt;
}

function parseCritique(content: string, peerNumber: number): PeerCritique {
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error(`Peer ${peerNumber}: No JSON found in critique`);
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]);

    return {
      peer: `Peer ${peerNumber}`,
      whatWorks: parsed.whatWorks || [],
      whatDoesnt: parsed.whatDoesnt || [],
      questions: parsed.questions || [],
      overallImpression: parsed.overallImpression,
    };
  } catch (error) {
    throw new Error(`Peer ${peerNumber}: Failed to parse JSON - ${error}`);
  }
}

function validateCritique(critique: PeerCritique): void {
  // Must provide some feedback
  if (
    critique.whatWorks.length === 0 &&
    critique.whatDoesnt.length === 0
  ) {
    throw new Error(
      `${critique.peer}: Must identify at least one strength or weakness`
    );
  }

  if (
    !critique.overallImpression ||
    critique.overallImpression.trim().length < 20
  ) {
    throw new Error(
      `${critique.peer}: Overall impression must be substantial`
    );
  }

  // Check for vague feedback
  const vagueTerms = [
    "good job",
    "nice work",
    "could be better",
    "needs work",
    "interesting",
  ];

  const allText =
    critique.whatWorks.join(" ") +
    " " +
    critique.whatDoesnt.join(" ") +
    " " +
    critique.overallImpression;

  const hasOnlyVague = vagueTerms.some(
    (term) =>
      allText.toLowerCase().includes(term) && allText.length < 150
  );

  if (hasOnlyVague) {
    throw new Error(`${critique.peer}: Feedback too vague - be specific`);
  }

  // Check for personal attacks
  const personalPhrases = [
    "you should",
    "you shouldn't",
    "why would you",
    "you failed to",
  ];

  const hasPersonal = personalPhrases.some((phrase) =>
    allText.toLowerCase().includes(phrase)
  );

  if (hasPersonal) {
    throw new Error(
      `${critique.peer}: Focus on the work, not the creator (avoid "you should...")`
    );
  }

  // Validate each item has substance
  [...critique.whatWorks, ...critique.whatDoesnt].forEach((item, i) => {
    if (item.trim().length < 15) {
      throw new Error(
        `${critique.peer}: Feedback item ${i + 1} too brief - be specific`
      );
    }
  });
}
