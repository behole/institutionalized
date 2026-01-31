/**
 * Orchestrator - coordinates the full peer review process
 */

import type { LLMProvider } from "../../core/types";
import type {
  Submission,
  Review,
  Rebuttal,
  EditorDecision,
  PeerReviewConfig,
  PeerReviewResult,
} from "./types";
import { conductReview } from "./reviewer";
import { createRebuttal } from "./author";
import { makeDecision } from "./editor";

export async function runPeerReview(
  submission: Submission,
  config: PeerReviewConfig,
  provider: LLMProvider,
  verbose: boolean = false
): Promise<PeerReviewResult> {
  if (verbose) {
    console.log("\n🔬 PEER REVIEW PROCESS INITIATED");
    console.log(`Configuration:`);
    console.log(`  - Reviewers: ${config.parameters.numReviewers}`);
    console.log(`  - Rebuttal: ${config.parameters.enableRebuttal ? "Enabled" : "Disabled"}`);
    console.log(`  - Models: ${config.models.reviewers} (reviewers), ${config.models.editor} (editor)`);
    console.log("\n");
  }

  // Phase 1: Independent Reviews (parallel)
  if (verbose) {
    console.log("📝 PHASE 1: INDEPENDENT REVIEWS");
    console.log(
      `Running ${config.parameters.numReviewers} reviewers in parallel...\n`
    );
  }

  const reviewPromises = Array.from(
    { length: config.parameters.numReviewers },
    (_, i) => conductReview(i + 1, submission, config, provider)
  );

  const reviews = await Promise.all(reviewPromises);

  if (verbose) {
    reviews.forEach((review) => {
      console.log(`${review.reviewer}:`);
      console.log(
        `  Recommendation: ${review.recommendation.toUpperCase()} (confidence: ${review.confidence}/5)`
      );
      console.log(`  Strengths: ${review.strengths.length}`);
      console.log(`  Weaknesses: ${review.weaknesses.length}`);
      console.log(`  Questions: ${review.questions.length}`);
      console.log();
    });
  }

  // Phase 2: Author Rebuttal (optional)
  let rebuttal: Rebuttal | undefined;

  if (config.parameters.enableRebuttal) {
    if (verbose) {
      console.log("✍️  PHASE 2: AUTHOR REBUTTAL");
      console.log("Author responding to reviews...\n");
    }

    rebuttal = await createRebuttal(submission, reviews, config, provider);

    if (verbose) {
      console.log(`Rebuttal provided:`);
      console.log(
        `  Point-by-point responses: ${rebuttal.pointByPoint.length}`
      );
      console.log();
    }
  }

  // Phase 3: Editor Decision
  if (verbose) {
    console.log("⚖️  PHASE 3: EDITORIAL DECISION");
    console.log("Editor synthesizing all perspectives...\n");
  }

  const decision = await makeDecision(
    submission,
    reviews,
    rebuttal,
    config,
    provider
  );

  if (verbose) {
    console.log(`FINAL DECISION: ${decision.decision.toUpperCase()}`);
    console.log(`Rationale: ${decision.rationale}`);
    if (decision.requiredChanges && decision.requiredChanges.length > 0) {
      console.log(`Required changes: ${decision.requiredChanges.length}`);
    }
    if (
      decision.optionalSuggestions &&
      decision.optionalSuggestions.length > 0
    ) {
      console.log(
        `Optional suggestions: ${decision.optionalSuggestions.length}`
      );
    }
    console.log("\n✅ PEER REVIEW COMPLETE\n");
  }

  return {
    submission,
    reviews,
    rebuttal,
    decision,
    metadata: {
      timestamp: new Date().toISOString(),
      config,
    },
  };
}

export function getDefaultConfig(): PeerReviewConfig {
  return {
    models: {
      reviewers: "claude-3-5-sonnet-20241022",
      author: "claude-3-7-sonnet-20250219",
      editor: "claude-3-7-sonnet-20250219",
    },
    parameters: {
      numReviewers: 3,
      enableRebuttal: true,
      reviewerTemperature: 0.7,
      editorTemperature: 0.3,
    },
  };
}

export function formatResult(result: PeerReviewResult): string {
  let output = "\n" + "=".repeat(80) + "\n";
  output += "PEER REVIEW RESULT\n";
  output += "=".repeat(80) + "\n\n";

  // Decision summary
  output += `DECISION: ${result.decision.decision.toUpperCase()}\n`;
  output += `Rationale: ${result.decision.rationale}\n\n`;

  // Reviews summary
  output += `REVIEWS (${result.reviews.length}):\n`;
  result.reviews.forEach((review) => {
    output += `\n${review.reviewer}:\n`;
    output += `  Recommendation: ${review.recommendation.toUpperCase()} (confidence: ${review.confidence}/5)\n`;
    output += `  Summary: ${review.summary}\n`;

    if (review.strengths.length > 0) {
      output += `  Strengths:\n`;
      review.strengths.forEach((s) => (output += `    - ${s}\n`));
    }

    if (review.weaknesses.length > 0) {
      output += `  Weaknesses:\n`;
      review.weaknesses.forEach((w) => (output += `    - ${w}\n`));
    }

    if (review.questions.length > 0) {
      output += `  Questions:\n`;
      review.questions.forEach((q) => (output += `    - ${q}\n`));
    }
  });

  // Rebuttal
  if (result.rebuttal) {
    output += `\nAUTHOR REBUTTAL:\n`;
    output += `  ${result.rebuttal.generalResponse}\n\n`;
    output += `  Point-by-Point Responses:\n`;
    result.rebuttal.pointByPoint.forEach((response) => {
      output += `\n  ${response.reviewer} - "${response.weakness}":\n`;
      output += `    ${response.response}\n`;
    });
  }

  // Editorial reasoning
  output += `\nEDITORIAL REASONING:\n`;
  output += `${result.decision.reasoning}\n\n`;

  // Required changes
  if (
    result.decision.requiredChanges &&
    result.decision.requiredChanges.length > 0
  ) {
    output += `REQUIRED CHANGES:\n`;
    result.decision.requiredChanges.forEach((change, i) => {
      output += `  ${i + 1}. ${change}\n`;
    });
    output += `\n`;
  }

  // Optional suggestions
  if (
    result.decision.optionalSuggestions &&
    result.decision.optionalSuggestions.length > 0
  ) {
    output += `OPTIONAL SUGGESTIONS:\n`;
    result.decision.optionalSuggestions.forEach((suggestion, i) => {
      output += `  ${i + 1}. ${suggestion}\n`;
    });
    output += `\n`;
  }

  output += "=".repeat(80) + "\n";

  return output;
}
