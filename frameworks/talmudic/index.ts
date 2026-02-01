/**
 * Talmudic Dialectic Framework
 * Multi-interpretation reasoning from Jewish textual tradition
 */

import type { TextualProblem, TalmudicConfig, TalmudicResult } from "./types";
import { DEFAULT_CONFIG } from "./types";

/**
 * Main entry point for CLI
 */
export async function run(
  input: TextualProblem | { content: string },
  flags: Record<string, any> = {}
): Promise<TalmudicResult> {
  // If input is plain text, wrap it as a problem
  const problemInput: TextualProblem =
    "text" in input
      ? input as TextualProblem
      : {
          text: input.content || "",
        };

  // Merge config with flags
  const config: TalmudicConfig = {
    ...DEFAULT_CONFIG,
    ...(flags.config || {}),
  };

  // Import and run the orchestrator
  const { runTalmudicAnalysis } = await import("./orchestrator");
  return runTalmudicAnalysis(problemInput, config);
}

// Re-export types for programmatic use
export * from "./types";
