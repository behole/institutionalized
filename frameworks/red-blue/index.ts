/**
 * Red Team / Blue Team Framework
 * Adversarial stress-testing for security and architecture
 */

import { createProvider } from "@core/providers";
import { getAPIKey } from "@core/config";
import { runRedBlue } from "./orchestrator";
import type { Target, RedBlueConfig, RedBlueResult } from "./types";
import { DEFAULT_CONFIG } from "./types";

/**
 * Main entry point for CLI
 */
export async function run(
  input: Target | { content: string },
  flags: Record<string, any> = {}
): Promise<RedBlueResult> {
  // If input is plain text, wrap it as a target
  const target: Target =
    "system" in input
      ? input
      : {
          system: input.content || "",
        };

  // Get configuration
  const config: RedBlueConfig = {
    ...DEFAULT_CONFIG,
    ...(flags.config || {}),
  };

  // Override from flags
  if (flags.rounds) {
    config.parameters.rounds = parseInt(flags.rounds, 10);
  }

  // Create provider
  const providerName = flags.provider || "anthropic";
  const apiKey = getAPIKey(providerName);
  const provider = createProvider({
    name: providerName,
    apiKey,
  });

  // Run red-blue exercise
  const result = await runRedBlue(
    target,
    config,
    provider,
    flags.verbose || false
  );

  return result;
}

// Re-export for programmatic use
export { runRedBlue };
export * from "./types";
