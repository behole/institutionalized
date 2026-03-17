/**
 * Courtroom Framework
 * Adversarial evaluation for binary decisions
 */

import { runCourtroom } from "./orchestrator";
import type { Case, CourtroomConfig, CourtroomResult } from "./types";
import type { RunFlags } from "@core/types";
import { DEFAULT_CONFIG } from "./types";
import { createProvider } from "@core/providers";
import { getAPIKey } from "@core/config";

/**
 * Main entry point for CLI
 */
export async function run(
  input: Case | { content: string },
  flags: RunFlags = {}
): Promise<CourtroomResult> {
  // If input is plain text, wrap it as a case
  const caseInput: Case =
    "question" in input
      ? input
      : {
          question: "Should this be approved?",
          context: [input.content || ""],
        };

  // Merge config with flags
  const config: CourtroomConfig = {
    ...DEFAULT_CONFIG,
    ...(flags.config || {}),
  };

  // Create provider from flags
  const providerName = flags.provider || "anthropic";
  const provider = createProvider({
    name: providerName,
    apiKey: getAPIKey(providerName),
  });

  return runCourtroom(caseInput, config, provider);
}

// Re-export types and orchestrator for programmatic use
export { runCourtroom };
export * from "./types";
