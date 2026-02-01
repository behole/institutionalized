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

Follow this structure:
1. Start with what works (positive feedback first)
2. Identify specific strengths with examples
3. Note memorable moments
4. Ask clarifying questions
5. Point out confusion points
6. Offer concrete suggestions
7. Address craft concerns

Be specific, kind, and constructive. Quote from the text when possible.`;

  const userPrompt = `MANUSCRIPT: "${manuscript.title}"
${manuscript.genre ? `Genre: ${manuscript.genre}` : ""}
${manuscript.wordCount ? `Word Count: ${manuscript.wordCount}` : ""}
${manuscript.authorIntent ? `Author's Intent: ${manuscript.authorIntent}` : ""}

CONTENT:
${manuscript.content.substring(0, 8000)}${manuscript.content.length > 8000 ? "\n... [truncated for review]" : ""}

Provide your workshop feedback following the Clarion method:
1. What works well in this piece?
2. What are the specific strengths?
3. What moments stood out as memorable?
4. What questions do you have for the author?
5. What points were confusing?
6. What concrete suggestions can you offer?
7. What craft concerns should be addressed?`;

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
