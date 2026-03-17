/**
 * Hegelian Dialectic Framework
 * Thesis-Antithesis-Synthesis for resolving contradictions
 */

import type { DialecticalProblem, HegelianConfig, HegelianResult } from "./types";
import type { RunFlags } from "@core/types";
import { DEFAULT_CONFIG } from "./types";
import { createProvider } from "@core/providers";
import { getAPIKey } from "@core/config";

/**
 * Main entry point for CLI
 */
export async function run(
  input: DialecticalProblem | { content: string },
  flags: RunFlags = {}
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

  // Create provider from flags
  const providerName = (flags as Record<string, unknown>).provider as string || "anthropic";
  const provider = createProvider({ name: providerName, apiKey: getAPIKey(providerName) });

  // Import and run the orchestrator
  const { runDialectic } = await import("./orchestrator");
  return runDialectic(problemInput, config, provider);
}

// Re-export types for programmatic use
export * from "./types";
