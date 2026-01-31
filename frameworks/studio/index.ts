/**
 * Studio Critique Framework
 * Creative work evaluation with peer feedback
 */

import { createProvider } from "@core/providers";
import { getAPIKey } from "@core/config";
import { runStudio } from "./orchestrator";
import type { CreativeWork, StudioConfig, StudioResult } from "./types";
import { DEFAULT_CONFIG } from "./types";

/**
 * Main entry point for CLI
 */
export async function run(
  input: CreativeWork | { content: string },
  flags: Record<string, any> = {}
): Promise<StudioResult> {
  // If input is plain text, wrap it as creative work
  const work: CreativeWork =
    "work" in input
      ? input
      : {
          work: input.content || "",
          workType: flags.workType || "general",
        };

  // Get configuration
  const config: StudioConfig = {
    ...DEFAULT_CONFIG,
    ...(flags.config || {}),
  };

  // Override from flags
  if (flags.peers) {
    config.parameters.numPeers = parseInt(flags.peers, 10);
  }

  if (flags.noCreatorResponse) {
    config.parameters.enableCreatorResponse = false;
  }

  // Create provider
  const providerName = flags.provider || "anthropic";
  const apiKey = getAPIKey(providerName);
  const provider = createProvider({
    name: providerName,
    apiKey,
  });

  // Run studio critique
  const result = await runStudio(
    work,
    config,
    provider,
    flags.verbose || false
  );

  return result;
}

// Re-export for programmatic use
export { runStudio };
export * from "./types";
