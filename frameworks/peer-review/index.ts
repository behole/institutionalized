/**
 * Peer Review Framework
 * Academic-style validation with author rebuttal
 */

import { createProvider } from "@core/providers";
import { getAPIKey } from "@core/config";
import { runPeerReview, getDefaultConfig, formatResult } from "./orchestrator";
import type { Submission, PeerReviewConfig, PeerReviewResult } from "./types";

/**
 * Main entry point for CLI
 */
export async function run(
  input: Submission | { content: string },
  flags: Record<string, any> = {}
): Promise<PeerReviewResult> {
  // If input is plain text, wrap it as a submission
  const submission: Submission =
    "work" in input
      ? input
      : {
          work: input.content || "",
          reviewType: flags.reviewType || "general",
        };

  // Get configuration
  const config: PeerReviewConfig = {
    ...getDefaultConfig(),
    ...(flags.config || {}),
  };

  // Override from flags
  if (flags.reviewers) {
    config.parameters.numReviewers = parseInt(flags.reviewers, 10);
  }

  if (flags.noRebuttal) {
    config.parameters.enableRebuttal = false;
  }

  // Create provider (default to Anthropic)
  const providerName = flags.provider || "anthropic";
  const apiKey = getAPIKey(providerName);
  const provider = createProvider({
    name: providerName,
    apiKey,
  });

  // Run peer review
  const result = await runPeerReview(
    submission,
    config,
    provider,
    flags.verbose || false
  );

  // Print formatted result if verbose
  if (flags.verbose) {
    console.log(formatResult(result));
  }

  return result;
}

// Re-export for programmatic use
export { runPeerReview, getDefaultConfig, formatResult };
export * from "./types";
