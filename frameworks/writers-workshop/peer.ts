import type { Manuscript, WritersWorkshopConfig, PeerReview } from "./types";
import { parseJSON } from "@core/orchestrator";
import type { LLMProvider } from "@core/types";

export function buildPeerReviewPrompt(
  manuscript: Manuscript,
  reviewerId: string,
  config: WritersWorkshopConfig
): { system: string; user: string } {
  const system = `You are a peer reviewer in a writers' workshop (Clarion/Clarion West style).
Your role is to provide constructive feedback on a manuscript.

You MUST respond with valid JSON matching this structure:
{
  "reviewerId": "string",
  "positive": {
    "whatWorks": "string - overall positive assessment",
    "strengths": ["array of specific strengths with examples"],
    "memorableMoments": ["array of memorable moments from the text"]
  },
  "constructive": {
    "questions": ["array of clarifying questions for the author"],
    "confusionPoints": ["array of points that were confusing"],
    "suggestions": ["array of concrete suggestions for improvement"],
    "craftConcerns": ["array of craft-level concerns (structure, voice, pacing, etc)"]
  },
  "overallImpression": "string - brief overall impression"
}

Be specific, kind, and constructive. Quote from the text when possible.`;

  const user = `MANUSCRIPT: "${manuscript.title}"
${manuscript.genre ? `Genre: ${manuscript.genre}` : ""}
${manuscript.wordCount ? `Word Count: ${manuscript.wordCount}` : ""}
${manuscript.authorIntent ? `Author's Intent: ${manuscript.authorIntent}` : ""}

CONTENT:
${manuscript.content.substring(0, 8000)}${manuscript.content.length > 8000 ? "\n... [truncated for review]" : ""}

Provide your workshop feedback following the Clarion method. Respond ONLY with valid JSON matching the required structure.`;

  return { system, user };
}

export function parsePeerReviewResponse(text: string, reviewerId: string): PeerReview {
  try {
    return parseJSON<PeerReview>(text);
  } catch {
    return {
      reviewerId,
      positive: {
        whatWorks: "Unable to generate detailed feedback",
        strengths: ["Manuscript received"],
        memorableMoments: [],
      },
      constructive: {
        questions: ["Please try again with a shorter excerpt"],
        confusionPoints: [],
        suggestions: ["Consider breaking into smaller sections for review"],
        craftConcerns: [],
      },
      overallImpression: "Review generation encountered an error",
    };
  }
}

export async function conductPeerReview(
  manuscript: Manuscript,
  reviewerId: string,
  config: WritersWorkshopConfig,
  provider: LLMProvider
): Promise<PeerReview> {
  const { system, user } = buildPeerReviewPrompt(manuscript, reviewerId, config);

  try {
    const response = await provider.call({
      model: config.models[reviewerId],
      messages: [{ role: "user", content: user }],
      temperature: config.parameters.temperature,
      systemPrompt: system,
      maxTokens: 4096,
    });
    return parseJSON<PeerReview>(response.content);
  } catch (error) {
    console.warn(`Failed to get review from ${reviewerId}:`, error);
    return {
      reviewerId,
      positive: {
        whatWorks: "Unable to generate detailed feedback",
        strengths: ["Manuscript received"],
        memorableMoments: [],
      },
      constructive: {
        questions: ["Please try again with a shorter excerpt"],
        confusionPoints: [],
        suggestions: ["Consider breaking into smaller sections for review"],
        craftConcerns: [],
      },
      overallImpression: "Review generation encountered an error",
    };
  }
}
