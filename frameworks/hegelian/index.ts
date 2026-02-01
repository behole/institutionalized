/**
 * Hegelian Dialectic Framework
 * Thesis-Antithesis-Synthesis for resolving contradictions
 */

import type { DialecticalProblem, HegelianConfig, HegelianResult } from "./types";
import { DEFAULT_CONFIG } from "./types";

/**
 * Main entry point for CLI
 */
export async function run(
  input: DialecticalProblem | { content: string },
  flags: Record<string, any> = {}
): Promise<HegelianResult> {
  // If input is plain text, wrap it as a problem
  const problemInput: DialecticalProblem =
    "context" in input && "thesis" in input
      ? input as DialecticalProblem
      : {
          context: input.content || "",
          thesis: "Initial position to be examined",
        };

  // Merge config with flags
  const config: HegelianConfig = {
    ...DEFAULT_CONFIG,
    ...(flags.config || {}),
  };

  // Import and run the orchestrator
  const { runDialectic } = await import("./orchestrator");
  return runDialectic(problemInput, config);
}

// Re-export types for programmatic use
export * from "./types";
