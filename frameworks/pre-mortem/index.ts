/**
 * Pre-mortem Framework
 * Identify failure modes before committing to a decision
 */

import { createProvider } from "@core/providers";
import { getAPIKey } from "@core/config";
import { runPreMortem } from "./orchestrator";
import type { Plan, PreMortemConfig, PreMortemResult } from "./types";
import type { RunFlags } from "@core/types";
import { DEFAULT_CONFIG } from "./types";

/**
 * Main entry point for CLI
 */
export async function run(
  input: Plan | { content: string },
  flags: RunFlags = {}
): Promise<PreMortemResult> {
  // If input is plain text, wrap it as a plan
  const plan: Plan =
    "description" in input
      ? input
      : {
          description: input.content || "",
        };

  // Get configuration
  const config: PreMortemConfig = {
    ...DEFAULT_CONFIG,
    ...(flags.config || {}),
  };

  const cliFlags = flags as Record<string, unknown>;

  // Override from flags
  if (cliFlags.pessimists) {
    config.parameters.numPessimists = parseInt(String(cliFlags.pessimists), 10);
  }

  // Create provider
  const providerName = flags.provider || "anthropic";
  const apiKey = getAPIKey(providerName);
  const provider = createProvider({
    name: providerName,
    apiKey,
  });

  // Run pre-mortem
  const result = await runPreMortem(
    plan,
    config,
    provider,
    flags.debug ?? false
  );

  return result;
}

// Re-export for programmatic use
export { runPreMortem };
export * from "./types";
