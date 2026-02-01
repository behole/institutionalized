/**
 * Dissertation Committee Framework
 * Multi-stage work validation with advisor and committee
 */

import type { DissertationWork, DissertationCommitteeConfig, DissertationCommitteeResult } from "./types";
import { DEFAULT_CONFIG } from "./types";

/**
 * Main entry point for CLI
 */
export async function run(
  input: DissertationWork | { content: string },
  flags: Record<string, any> = {}
): Promise<DissertationCommitteeResult> {
  // If input is plain text, wrap it as a dissertation work
  const workInput: DissertationWork =
    "title" in input && "abstract" in input
      ? input as DissertationWork
      : {
          title: "Untitled Work",
          abstract: input.content || "",
          field: "General",
          stage: "draft",
          content: input.content || "",
        };

  // Merge config with flags
  const config: DissertationCommitteeConfig = {
    ...DEFAULT_CONFIG,
    ...(flags.config || {}),
  };

  // Import and run the orchestrator
  const { runCommitteeReview } = await import("./orchestrator");
  return runCommitteeReview(workInput, config);
}

// Re-export types for programmatic use
export * from "./types";
