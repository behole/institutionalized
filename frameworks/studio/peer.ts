/**
 * Peer - provides observations and critique
 */

import type { LLMProvider } from "@core/types";
import { parseJSON } from "@core/orchestrator";
import type { CreativeWork, PeerObservation, CritiqueRound, StudioConfig } from "./types";

export async function observeWork(
  peerNumber: number,
  work: CreativeWork,
  config: StudioConfig,
  provider: LLMProvider
): Promise<PeerObservation> {
  const prompt = buildObservationPrompt(peerNumber, work);

  const response = await provider.call({
    model: config.models.peers,
    temperature: config.parameters.peerTemperature,
    messages: [{ role: "user", content: prompt }],
    maxTokens: 2048,
  });

  const parsed = parseJSON<Omit<PeerObservation, "peer">>(response.content);

  return {
    peer: `Peer ${peerNumber}`,
    ...parsed,
  };
}

export async function critiqueWork(
  peerNumber: number,
  work: CreativeWork,
  config: StudioConfig,
  provider: LLMProvider
): Promise<CritiqueRound> {
  const prompt = buildCritiquePrompt(peerNumber, work);

  const response = await provider.call({
    model: config.models.peers,
    temperature: config.parameters.peerTemperature,
    messages: [{ role: "user", content: prompt }],
    maxTokens: 2048,
  });

  const parsed = parseJSON<Omit<CritiqueRound, "peer">>(response.content);

  return {
    peer: `Peer ${peerNumber}`,
    ...parsed,
  };
}

function buildObservationPrompt(peerNumber: number, work: CreativeWork): string {
  let prompt = `You are Peer ${peerNumber} in a STUDIO CRITIQUE session.

## CREATIVE WORK (${work.workType || "general"})

${work.work}
`;

  if (work.context && work.context.length > 0) {
    prompt += `\n## CONTEXT\n`;
    work.context.forEach((ctx) => (prompt += `- ${ctx}\n`));
  }

  if (work.creatorStatement) {
    prompt += `\n## CREATOR'S STATEMENT\n${work.creatorStatement}\n`;
  }

  prompt += `

## OBSERVATION PHASE

In studio critique, we start by OBSERVING without judging. Your role:

1. **Notice** - What do you see/read/experience?
2. **Wonder** - What questions arise?
3. **React** - What's your gut response?

Be specific. Avoid judgment words (good, bad, effective, weak).

## YOUR TASK

Provide neutral observations, genuine questions, and honest reactions.

## OUTPUT FORMAT

{
  "observations": ["I notice...", "I see...", "The work does..."],
  "questions": ["Why...", "How...", "What if..."],
  "reactions": ["I feel...", "I'm curious about...", "I'm confused by..."]
}

IMPORTANT: Return ONLY valid JSON.`;

  return prompt;
}

function buildCritiquePrompt(peerNumber: number, work: CreativeWork): string {
  let prompt = `You are Peer ${peerNumber} in a STUDIO CRITIQUE session.

## CREATIVE WORK (${work.workType || "general"})

${work.work}
`;

  if (work.context && work.context.length > 0) {
    prompt += `\n## CONTEXT\n`;
    work.context.forEach((ctx) => (prompt += `- ${ctx}\n`));
  }

  if (work.creatorStatement) {
    prompt += `\n## CREATOR'S STATEMENT\n${work.creatorStatement}\n`;
  }

  prompt += `

## CRITIQUE PHASE

Now provide constructive feedback:

1. **Strengths** - What works? What should be kept/amplified?
2. **Weaknesses** - What doesn't work? What gets in the way?
3. **Suggestions** - Specific, actionable improvements

## GUIDELINES

- Be honest but kind
- Be specific - cite examples from the work
- Focus on the work, not the creator
- Suggest, don't prescribe
- Consider the creator's stated intent

## OUTPUT FORMAT

{
  "strengths": ["strength 1", "strength 2", ...],
  "weaknesses": ["weakness 1", "weakness 2", ...],
  "suggestions": ["suggestion 1", "suggestion 2", ...]
}

IMPORTANT: Return ONLY valid JSON.`;

  return prompt;
}
