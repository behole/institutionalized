/**
 * Reviewer agent - conducts independent review with specific focus
 */

import type { LLMProvider } from "../../core/types";
import type { Submission, Review, PeerReviewConfig } from "./types";

export async function conductReview(
  reviewerNumber: number,
  submission: Submission,
  config: PeerReviewConfig,
  provider: LLMProvider
): Promise<Review> {
  const reviewType = submission.reviewType || "general";
  const focus = getReviewerFocus(reviewerNumber, reviewType);

  const systemPrompt = buildSystemPrompt(focus, reviewType);
  const userPrompt = buildUserPrompt(submission);

  const response = await provider.call({
    model: config.models.reviewers,
    temperature: config.parameters.reviewerTemperature,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });

  const review = parseReview(response.content, reviewerNumber);
  validateReview(review);

  return review;
}

function getReviewerFocus(reviewerNumber: number, reviewType: string): string {
  const focuses: Record<string, string[]> = {
    academic: [
      "Methodology and rigor",
      "Theoretical contribution",
      "Literature review and citations",
      "Clarity and writing quality",
    ],
    technical: [
      "Technical accuracy",
      "Clarity and completeness",
      "Code quality and examples",
      "API design and usability",
    ],
    creative: [
      "Originality and concept",
      "Execution and craft",
      "Audience and impact",
      "Coherence and structure",
    ],
    general: [
      "Overall quality",
      "Clarity and organization",
      "Completeness",
      "Impact and value",
    ],
  };

  const focusAreas = focuses[reviewType] || focuses.general;
  return focusAreas[(reviewerNumber - 1) % focusAreas.length];
}

function buildSystemPrompt(focus: string, reviewType: string): string {
  return `You are an expert peer reviewer conducting an independent review.

YOUR ROLE:
- Focus area: ${focus}
- Review type: ${reviewType}
- Provide honest, constructive feedback
- Identify both strengths and weaknesses
- Ask clarifying questions when needed

GUIDELINES:
- Be specific: cite exact passages or sections
- Be fair: acknowledge strengths before weaknesses
- Be constructive: suggest improvements, not just criticism
- Be thorough: don't skip issues to be polite
- Assess confidence: how certain are you of your evaluation?

OUTPUT FORMAT:
You must respond with a JSON object containing:
{
  "summary": "2-3 sentence overall assessment",
  "strengths": ["strength 1", "strength 2", ...],
  "weaknesses": ["weakness 1", "weakness 2", ...],
  "questions": ["question 1", "question 2", ...],
  "recommendation": "accept" | "revise" | "reject",
  "confidence": 1-5 (1=uncertain, 5=very confident)
}

RECOMMENDATION CRITERIA:
- Accept: Minor issues only, ready to publish
- Revise: Good foundation, needs specific improvements
- Reject: Fundamental issues that can't be fixed with revision`;
}

function buildUserPrompt(submission: Submission): string {
  let prompt = `Please review the following submission:\n\n`;
  prompt += `WORK TO REVIEW:\n${submission.work}\n\n`;

  if (submission.context && submission.context.length > 0) {
    prompt += `SUPPORTING CONTEXT:\n`;
    submission.context.forEach((ctx, i) => {
      prompt += `[Context ${i + 1}]: ${ctx}\n\n`;
    });
  }

  prompt += `Provide your independent review as a JSON object.`;

  return prompt;
}

function parseReview(content: string, reviewerNumber: number): Review {
  // Extract JSON from response (may be wrapped in markdown or text)
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error(`Reviewer ${reviewerNumber}: No JSON found in response`);
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]);

    return {
      reviewer: `Reviewer ${reviewerNumber}`,
      summary: parsed.summary,
      strengths: parsed.strengths || [],
      weaknesses: parsed.weaknesses || [],
      questions: parsed.questions || [],
      recommendation: parsed.recommendation,
      confidence: parsed.confidence,
    };
  } catch (error) {
    throw new Error(
      `Reviewer ${reviewerNumber}: Failed to parse JSON - ${error}`
    );
  }
}

function validateReview(review: Review): void {
  // Check required fields
  if (!review.summary || review.summary.trim().length === 0) {
    throw new Error(`${review.reviewer}: Summary is required`);
  }

  if (!["accept", "revise", "reject"].includes(review.recommendation)) {
    throw new Error(
      `${review.reviewer}: Invalid recommendation "${review.recommendation}"`
    );
  }

  if (review.confidence < 1 || review.confidence > 5) {
    throw new Error(
      `${review.reviewer}: Confidence must be 1-5, got ${review.confidence}`
    );
  }

  // Check for substance
  if (review.strengths.length === 0 && review.weaknesses.length === 0) {
    throw new Error(
      `${review.reviewer}: Must identify at least one strength or weakness`
    );
  }

  // Check for specificity
  const genericPhrases = [
    "good work",
    "needs improvement",
    "well done",
    "could be better",
  ];

  const allText =
    review.summary +
    " " +
    review.strengths.join(" ") +
    " " +
    review.weaknesses.join(" ");

  const hasOnlyGeneric = genericPhrases.some(
    (phrase) =>
      allText.toLowerCase().includes(phrase) && allText.length < 200
  );

  if (hasOnlyGeneric) {
    throw new Error(
      `${review.reviewer}: Review appears too generic - be more specific`
    );
  }
}
