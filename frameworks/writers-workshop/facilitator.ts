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

Synthesize this feedback into discussion points:
1. Identify 3-5 key topics that emerged across reviews
2. Note different perspectives on each topic
3. Highlight areas of consensus
4. Flag any significant disagreements

Format each discussion point with the topic, various perspectives, and any consensus reached.`;

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
