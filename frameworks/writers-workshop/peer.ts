import type { Manuscript, WritersWorkshopConfig, PeerReview } from "./types";
import { generateObject } from "@institutional-reasoning/core";

export async function conductPeerReview(
  manuscript: Manuscript,
  reviewerId: string,
  config: WritersWorkshopConfig
): Promise<PeerReview> {
  const model = config.models[reviewerId];
  
  const systemPrompt = `You are a peer reviewer in a writers' workshop (Clarion/Clarion West style).
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

  const userPrompt = `MANUSCRIPT: "${manuscript.title}"
${manuscript.genre ? `Genre: ${manuscript.genre}` : ""}
${manuscript.wordCount ? `Word Count: ${manuscript.wordCount}` : ""}
${manuscript.authorIntent ? `Author's Intent: ${manuscript.authorIntent}` : ""}

CONTENT:
${manuscript.content.substring(0, 8000)}${manuscript.content.length > 8000 ? "\n... [truncated for review]" : ""}

Provide your workshop feedback following the Clarion method. Respond ONLY with valid JSON matching the required structure.`;

  try {
    return await generateObject<PeerReview>({
      model,
      system: systemPrompt,
      prompt: userPrompt,
      temperature: config.parameters.temperature,
    });
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
