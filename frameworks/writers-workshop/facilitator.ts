import type { Manuscript, WritersWorkshopConfig, PeerReview, DiscussionPoint } from "./types";
import { parseJSON } from "@core/orchestrator";
import type { LLMProvider } from "@core/types";

export function buildFacilitatorPrompt(
  manuscript: Manuscript,
  peerReviews: PeerReview[],
  config: WritersWorkshopConfig
): { system: string; user: string } {
  const system = `You are a workshop facilitator synthesizing peer feedback into a structured discussion.
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

  const user = `MANUSCRIPT: "${manuscript.title}"

PEER REVIEWS:
${reviewsSummary}

Synthesize this feedback into discussion points. Identify 3-5 key topics that emerged across reviews. Note different perspectives, consensus areas, and disagreements. Respond ONLY with valid JSON matching the required structure.`;

  return { system, user };
}

export function parseFacilitatorResponse(text: string): DiscussionPoint[] {
  const result = parseJSON<{ discussion: DiscussionPoint[] }>(text);
  return result.discussion;
}

export async function facilitateDiscussion(
  manuscript: Manuscript,
  peerReviews: PeerReview[],
  config: WritersWorkshopConfig,
  provider: LLMProvider
): Promise<DiscussionPoint[]> {
  const { system, user } = buildFacilitatorPrompt(manuscript, peerReviews, config);

  try {
    const response = await provider.call({
      model: config.models.facilitator,
      messages: [{ role: "user", content: user }],
      temperature: 0.5,
      systemPrompt: system,
      maxTokens: 4096,
    });

    const result = parseJSON<{
      discussion: DiscussionPoint[];
    }>(response.content);

    return result.discussion;
  } catch (error) {
    console.warn("Failed to facilitate discussion:", error);
    return [{
      topic: "General Feedback",
      perspectives: peerReviews.map(r => `${r.reviewerId}: ${r.overallImpression}`),
    }];
  }
}
