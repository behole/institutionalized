/**
 * Peer Review Framework
 * Academic-style validation with author rebuttal
 */

import { createProvider } from "@core/providers";
import { getAPIKey } from "@core/config";
import { runPeerReview, getDefaultConfig, formatResult } from "./orchestrator";
import type { Submission, PeerReviewConfig, PeerReviewResult } from "./types";
import type { RunFlags } from "@core/types";

/**
 * Main entry point for CLI
 */
export async function run(
  input: Submission | { content: string },
  flags: RunFlags = {}
): Promise<PeerReviewResult> {
  const cliFlags = flags as Record<string, unknown>;

  // If input is plain text, wrap it as a submission
  const submission: Submission =
    "work" in input
      ? input
      : {
          work: input.content || "",
          reviewType: String(cliFlags.reviewType || "general"),
        };

  // Get configuration
  const config: PeerReviewConfig = {
    ...getDefaultConfig(),
    ...(flags.config || {}),
  };

  // Override from flags
  if (cliFlags.reviewers) {
    config.parameters.numReviewers = parseInt(String(cliFlags.reviewers), 10);
  }

  if (cliFlags.noRebuttal) {
    config.parameters.enableRebuttal = false;
  }

  // Create provider (default to Anthropic)
  const providerName = flags.provider || "anthropic";
  const apiKey = getAPIKey(providerName);
  const provider = createProvider({
    name: providerName,
    apiKey,
  });

  const verbose = flags.debug ?? false;

  // Run peer review
  const result = await runPeerReview(
    submission,
    config,
    provider,
    verbose
  );

  // Print formatted result if verbose
  if (verbose) {
    console.log(formatResult(result));
  }

  return result;
}

// Re-export for programmatic use
export { runPeerReview, getDefaultConfig, formatResult };
export * from "./types";
