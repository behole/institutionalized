/**
 * Talmudic Dialectic Framework
 * Multi-interpretation reasoning from Jewish textual tradition
 */

import type { TextualProblem, TalmudicConfig, TalmudicResult } from "./types";
import type { RunFlags } from "@core/types";
import { DEFAULT_CONFIG } from "./types";
import { createProvider } from "@core/providers";
import { getAPIKey } from "@core/config";

/**
 * Main entry point for CLI
 */
export async function run(
  input: TextualProblem | { content: string },
  flags: RunFlags = {}
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

  // Create provider from flags
  const providerName = (flags as Record<string, unknown>).provider as string || "anthropic";
  const provider = createProvider({ name: providerName, apiKey: getAPIKey(providerName) });

  // Import and run the orchestrator
  const { runTalmudicAnalysis } = await import("./orchestrator");
  return runTalmudicAnalysis(problemInput, config, provider);
}

// Re-export types for programmatic use
export * from "./types";
