/**
 * Editor agent - synthesizes reviews and rebuttal into final decision
 */

import type { LLMProvider } from "../../core/types";
import type {
  Submission,
  Review,
  Rebuttal,
  EditorDecision,
  PeerReviewConfig,
} from "./types";

export async function makeDecision(
  submission: Submission,
  reviews: Review[],
  rebuttal: Rebuttal | undefined,
  config: PeerReviewConfig,
  provider: LLMProvider
): Promise<EditorDecision> {
  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt(submission, reviews, rebuttal);

  const response = await provider.call({
    model: config.models.editor,
    temperature: config.parameters.editorTemperature,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });

  const decision = parseDecision(response.content);
  validateDecision(decision, reviews);

  return decision;
}

function buildSystemPrompt(): string {
  return `You are a senior editor making a final decision on a submission.

YOUR ROLE:
- Synthesize multiple reviewer perspectives
- Consider author's rebuttal (if provided)
- Make fair, evidence-based decisions
- Provide clear, actionable guidance

GUIDELINES:
- Weight reviewer confidence and expertise
- Don't just count votes - assess arguments
- Consider if concerns were adequately addressed in rebuttal
- Be specific about required changes
- Distinguish required vs. optional improvements

OUTPUT FORMAT:
You must respond with a JSON object containing:
{
  "decision": "accept" | "revise" | "reject",
  "reasoning": "Multi-paragraph synthesis explaining your decision",
  "requiredChanges": ["change 1", "change 2", ...],  // Only if revise
  "optionalSuggestions": ["suggestion 1", ...],      // Nice-to-haves
  "rationale": "One-sentence summary of decision"
}

DECISION CRITERIA:
- Accept: Work meets quality standards, minor issues only
- Revise: Fixable issues with clear path to acceptance
- Reject: Fundamental flaws that can't be fixed, or work doesn't meet standards

SYNTHESIS PRINCIPLES:
1. Reconcile conflicting reviews - explain why you weight certain concerns more
2. Evaluate rebuttal - did author adequately address concerns?
3. Be fair to author - acknowledge strengths, not just weaknesses
4. Be specific - actionable changes, not vague advice
5. Consider practical constraints - is revision feasible?

DO NOT:
- Simply count accept/revise/reject votes
- Ignore well-argued minority opinions
- Make vague demands like "improve quality"
- Contradict your own reasoning`;
}

function buildUserPrompt(
  submission: Submission,
  reviews: Review[],
  rebuttal: Rebuttal | undefined
): string {
  let prompt = `You are the editor for this submission:\n\n`;
  prompt += `WORK:\n${submission.work}\n\n`;

  if (submission.reviewType) {
    prompt += `Review Type: ${submission.reviewType}\n\n`;
  }

  prompt += `---\nREVIEWS:\n\n`;

  reviews.forEach((review) => {
    prompt += `${review.reviewer}:\n`;
    prompt += `Recommendation: ${review.recommendation.toUpperCase()} (confidence: ${review.confidence}/5)\n`;
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

    prompt += `---\n\n`;
  });

  if (rebuttal) {
    prompt += `AUTHOR REBUTTAL:\n\n`;
    prompt += `General Response:\n${rebuttal.generalResponse}\n\n`;
    prompt += `Point-by-Point Responses:\n`;
    rebuttal.pointByPoint.forEach((response) => {
      prompt += `\n${response.reviewer} - "${response.weakness}":\n`;
      prompt += `${response.response}\n`;
    });
    prompt += `\n---\n\n`;
  }

  prompt += `Provide your editorial decision as a JSON object. Synthesize all perspectives fairly.`;

  return prompt;
}

function parseDecision(content: string): EditorDecision {
  // Extract JSON from response
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Editor: No JSON found in decision response");
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]);

    return {
      decision: parsed.decision,
      reasoning: parsed.reasoning,
      requiredChanges: parsed.requiredChanges || [],
      optionalSuggestions: parsed.optionalSuggestions || [],
      rationale: parsed.rationale,
    };
  } catch (error) {
    throw new Error(`Editor: Failed to parse decision JSON - ${error}`);
  }
}

function validateDecision(decision: EditorDecision, reviews: Review[]): void {
  // Check required fields
  if (!["accept", "revise", "reject"].includes(decision.decision)) {
    throw new Error(`Editor: Invalid decision "${decision.decision}"`);
  }

  if (!decision.reasoning || decision.reasoning.trim().length < 100) {
    throw new Error(
      "Editor: Reasoning must be substantial (at least 100 characters)"
    );
  }

  if (!decision.rationale || decision.rationale.trim().length === 0) {
    throw new Error("Editor: Rationale is required");
  }

  // If revise, must have required changes
  if (decision.decision === "revise") {
    if (
      !decision.requiredChanges ||
      decision.requiredChanges.length === 0
    ) {
      throw new Error(
        'Editor: "revise" decision must specify required changes'
      );
    }

    // Check changes are specific
    const vagueChanges = decision.requiredChanges.filter(
      (change) =>
        change.length < 20 ||
        /improve|enhance|better|fix|update/.test(change.toLowerCase())
    );

    if (vagueChanges.length > 0) {
      throw new Error(
        `Editor: Required changes too vague: "${vagueChanges.join('", "')}"`
      );
    }
  }

  // Check reasoning references reviews
  const reviewerMentions = reviews.filter((review) =>
    decision.reasoning.includes(review.reviewer)
  );

  if (reviewerMentions.length === 0) {
    throw new Error(
      "Editor: Reasoning must reference specific reviewers (e.g. 'Reviewer 1')"
    );
  }

  // Check for synthesis (not just picking one reviewer)
  if (reviews.length > 1) {
    const uniqueMentions = new Set(
      reviewerMentions.map((r) => r.reviewer)
    ).size;

    if (uniqueMentions < 2 && reviews.length >= 2) {
      throw new Error(
        "Editor: Must synthesize multiple reviewers, not just pick one"
      );
    }
  }

  // Check reasoning doesn't contradict decision
  const reasoningLower = decision.reasoning.toLowerCase();

  if (decision.decision === "accept") {
    const rejectWords = [
      "fundamental flaw",
      "major issue",
      "significant problem",
      "cannot be fixed",
    ];
    const hasRejectWords = rejectWords.some((word) =>
      reasoningLower.includes(word)
    );

    if (hasRejectWords) {
      throw new Error(
        "Editor: Reasoning contains rejection language but decision is 'accept'"
      );
    }
  }

  if (decision.decision === "reject") {
    const acceptWords = ["minor issue", "small change", "easily fixed"];
    const hasAcceptWords = acceptWords.some((word) =>
      reasoningLower.includes(word)
    );

    if (hasAcceptWords) {
      throw new Error(
        "Editor: Reasoning suggests fixable issues but decision is 'reject'"
      );
    }
  }
}
