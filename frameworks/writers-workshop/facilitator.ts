import type { Manuscript, WritersWorkshopConfig, PeerReview, DiscussionPoint } from "./types";
import { generateObject } from "@institutional-reasoning/core";

export async function facilitateDiscussion(
  manuscript: Manuscript,
  peerReviews: PeerReview[],
  config: WritersWorkshopConfig
): Promise<DiscussionPoint[]> {
  const model = config.models.facilitator;
  
  const systemPrompt = `You are a workshop facilitator synthesizing peer feedback into a structured discussion.
Your role is to:
1. Identify common themes across reviews
2. Note areas of agreement and disagreement
3. Surface important questions for the author
4. Organize feedback into actionable discussion points

You MUST respond with valid JSON matching this structure:
{
  "discussion": [
    {
      "topic": "string - the discussion topic",
      "perspectives": ["array of different perspectives on this topic"],
      "consensus": "string - areas of agreement (optional)",
      "disagreement": "string - areas of disagreement (optional)"
    }
  ]
}

Be balanced and comprehensive.`;

  const reviewsSummary = peerReviews.map(r => `
${r.reviewerId}:
- Strengths: ${r.positive.strengths.join("; ")}
- Questions: ${r.constructive.questions.join("; ")}
- Suggestions: ${r.constructive.suggestions.join("; ")}
- Concerns: ${r.constructive.craftConcerns.join("; ")}
`).join("\n");

  const userPrompt = `MANUSCRIPT: "${manuscript.title}"

PEER REVIEWS:
${reviewsSummary}

Synthesize this feedback into discussion points. Identify 3-5 key topics that emerged across reviews. Note different perspectives, consensus areas, and disagreements. Respond ONLY with valid JSON matching the required structure.`;

  try {
    const result = await generateObject<{
      discussion: DiscussionPoint[];
    }>({
      model,
      system: systemPrompt,
      prompt: userPrompt,
      temperature: 0.5,
    });

    return result.discussion;
  } catch (error) {
    console.warn("Failed to facilitate discussion:", error);
    return [{
      topic: "General Feedback",
      perspectives: peerReviews.map(r => `${r.reviewerId}: ${r.overallImpression}`),
    }];
  }
}
