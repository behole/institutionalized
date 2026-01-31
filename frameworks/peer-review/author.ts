/**
 * Author agent - responds to reviewer critiques
 */

import type { LLMProvider } from "../../core/types";
import type { Submission, Review, Rebuttal, PeerReviewConfig } from "./types";

export async function createRebuttal(
  submission: Submission,
  reviews: Review[],
  config: PeerReviewConfig,
  provider: LLMProvider
): Promise<Rebuttal> {
  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt(submission, reviews);

  const response = await provider.call({
    model: config.models.author,
    temperature: 0.7, // Creative but focused
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });

  const rebuttal = parseRebuttal(response.content);
  validateRebuttal(rebuttal, reviews);

  return rebuttal;
}

function buildSystemPrompt(): string {
  return `You are the author of the submitted work, responding to peer reviews.

YOUR ROLE:
- Address reviewer concerns honestly
- Clarify misunderstandings
- Acknowledge valid criticisms
- Explain your choices when appropriate
- Commit to improvements where needed

GUIDELINES:
- Be professional and respectful
- Don't be defensive - reviewers are trying to help
- Distinguish between misunderstandings (explain) and real issues (acknowledge)
- Be specific: reference exact reviewer comments
- Show you've considered feedback carefully

OUTPUT FORMAT:
You must respond with a JSON object containing:
{
  "generalResponse": "Overall response thanking reviewers and summarizing key points",
  "pointByPoint": [
    {
      "reviewer": "Reviewer 1",
      "weakness": "Quote the exact weakness from their review",
      "response": "Your detailed response"
    },
    ...
  ]
}

RESPONSE TYPES:
1. Clarification: "This is a misunderstanding - the work actually addresses this by..."
2. Acknowledgment: "This is a valid concern. I will revise to..."
3. Justification: "I chose this approach because... but I understand the concern"
4. Partial agreement: "I agree with X but not Y because..."

DO NOT:
- Dismiss valid criticisms
- Argue without evidence
- Ignore major concerns
- Be defensive or hostile`;
}

function buildUserPrompt(submission: Submission, reviews: Review[]): string {
  let prompt = `You are the author of this work:\n\n${submission.work}\n\n`;
  prompt += `You have received ${reviews.length} reviews. Please respond to each reviewer's concerns.\n\n`;

  reviews.forEach((review) => {
    prompt += `---\n${review.reviewer} REVIEW:\n\n`;
    prompt += `Summary: ${review.summary}\n\n`;

    if (review.strengths.length > 0) {
      prompt += `Strengths:\n`;
      review.strengths.forEach((s) => (prompt += `- ${s}\n`));
      prompt += `\n`;
    }

    if (review.weaknesses.length > 0) {
      prompt += `Weaknesses:\n`;
      review.weaknesses.forEach((w) => (prompt += `- ${w}\n`));
      prompt += `\n`;
    }

    if (review.questions.length > 0) {
      prompt += `Questions:\n`;
      review.questions.forEach((q) => (prompt += `- ${q}\n`));
      prompt += `\n`;
    }

    prompt += `Recommendation: ${review.recommendation.toUpperCase()}\n`;
    prompt += `Confidence: ${review.confidence}/5\n\n`;
  });

  prompt += `Provide your rebuttal as a JSON object. Address all significant concerns.`;

  return prompt;
}

function parseRebuttal(content: string): Rebuttal {
  // Extract JSON from response
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Author: No JSON found in rebuttal response");
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]);

    return {
      generalResponse: parsed.generalResponse,
      pointByPoint: parsed.pointByPoint || [],
    };
  } catch (error) {
    throw new Error(`Author: Failed to parse rebuttal JSON - ${error}`);
  }
}

function validateRebuttal(rebuttal: Rebuttal, reviews: Review[]): void {
  // Check required fields
  if (
    !rebuttal.generalResponse ||
    rebuttal.generalResponse.trim().length === 0
  ) {
    throw new Error("Author: General response is required");
  }

  // Must address at least one concern
  if (rebuttal.pointByPoint.length === 0) {
    throw new Error(
      "Author: Must address at least one reviewer concern point-by-point"
    );
  }

  // Count total weaknesses and questions from all reviews
  const totalConcerns = reviews.reduce(
    (sum, review) => sum + review.weaknesses.length + review.questions.length,
    0
  );

  // Should address at least 50% of concerns
  const minResponses = Math.ceil(totalConcerns * 0.5);
  if (rebuttal.pointByPoint.length < minResponses) {
    throw new Error(
      `Author: Should address at least ${minResponses} concerns (found ${rebuttal.pointByPoint.length})`
    );
  }

  // Check each response has substance
  rebuttal.pointByPoint.forEach((response, i) => {
    if (!response.reviewer || response.reviewer.trim().length === 0) {
      throw new Error(`Author: Response ${i + 1} missing reviewer reference`);
    }

    if (!response.weakness || response.weakness.trim().length === 0) {
      throw new Error(`Author: Response ${i + 1} missing weakness quote`);
    }

    if (!response.response || response.response.trim().length === 0) {
      throw new Error(`Author: Response ${i + 1} missing actual response`);
    }

    // Check for generic/dismissive responses
    const dismissivePhrases = [
      "i disagree",
      "this is wrong",
      "not true",
      "incorrect",
    ];

    const responseText = response.response.toLowerCase();
    const isDismissive = dismissivePhrases.some(
      (phrase) =>
        responseText.includes(phrase) && responseText.length < 100
    );

    if (isDismissive) {
      throw new Error(
        `Author: Response ${i + 1} appears dismissive - provide substantive explanation`
      );
    }
  });

  // Validate reviewer references exist
  const reviewerNames = reviews.map((r) => r.reviewer);
  rebuttal.pointByPoint.forEach((response, i) => {
    if (!reviewerNames.includes(response.reviewer)) {
      throw new Error(
        `Author: Response ${i + 1} references unknown reviewer "${response.reviewer}"`
      );
    }
  });
}
