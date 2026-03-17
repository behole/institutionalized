/**
 * War Gaming Framework
 * Military scenario testing for strategic planning
 */

import type { Scenario, WarGamingConfig, WarGamingResult } from "./types";
import type { RunFlags } from "@core/types";
import { DEFAULT_CONFIG } from "./types";
import { createProvider } from "@core/providers";
import { getAPIKey } from "@core/config";

/**
 * Main entry point for CLI
 */
export async function run(
  input: Scenario | { content: string },
  flags: RunFlags = {}
): Promise<WarGamingResult> {
  // If input is plain text, wrap it as a scenario
  const scenarioInput: Scenario =
    "description" in input
      ? input
      : {
          description: input.content || "",
          context: [],
        };

  // Merge config with flags
  const config: WarGamingConfig = {
    ...DEFAULT_CONFIG,
    ...(flags.config || {}),
  };

  // Create provider from flags
  const providerName = (flags as Record<string, unknown>).provider as string || "anthropic";
  const provider = createProvider({ name: providerName, apiKey: getAPIKey(providerName) });

  // Import and run the orchestrator
  const { runWarGaming } = await import("./orchestrator");
  return runWarGaming(scenarioInput, config, provider);
}

// Re-export types for programmatic use
export * from "./types";
