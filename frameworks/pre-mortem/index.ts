/**
 * Pre-mortem Framework
 * Identify failure modes before committing to a decision
 */

import { createProvider } from "@core/providers";
import { getAPIKey } from "@core/config";
import { runPreMortem } from "./orchestrator";
import type { Plan, PreMortemConfig, PreMortemResult } from "./types";
import { DEFAULT_CONFIG } from "./types";

/**
 * Main entry point for CLI
 */
export async function run(
  input: Plan | { content: string },
  flags: Record<string, any> = {}
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

  // Override from flags
  if (flags.pessimists) {
    config.parameters.numPessimists = parseInt(flags.pessimists, 10);
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
    flags.verbose || false
  );

  return result;
}

// Re-export for programmatic use
export { runPreMortem };
export * from "./types";
