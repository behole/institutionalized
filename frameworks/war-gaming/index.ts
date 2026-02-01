/**
 * War Gaming Framework
 * Military scenario testing for strategic planning
 */

import type { Scenario, WarGamingConfig, WarGamingResult } from "./types";
import { DEFAULT_CONFIG } from "./types";

/**
 * Main entry point for CLI
 */
export async function run(
  input: Scenario | { content: string },
  flags: Record<string, any> = {}
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

  // Import and run the orchestrator
  const { runWarGaming } = await import("./orchestrator");
  return runWarGaming(scenarioInput, config);
}

// Re-export types for programmatic use
export * from "./types";
