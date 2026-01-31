/**
 * Courtroom Framework
 * Adversarial evaluation for binary decisions
 */

import { runCourtroom } from "./orchestrator";
import type { Case, CourtroomConfig, CourtroomResult } from "./types";
import { DEFAULT_CONFIG } from "./types";

/**
 * Main entry point for CLI
 */
export async function run(
  input: Case | { content: string },
  flags: Record<string, any> = {}
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

  return runCourtroom(caseInput, config);
}

// Re-export types and orchestrator for programmatic use
export { runCourtroom };
export * from "./types";
