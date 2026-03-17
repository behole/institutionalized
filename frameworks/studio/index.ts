/**
 * Studio Critique Framework
 * Creative work evaluation with peer feedback
 */

import { createProvider } from "@core/providers";
import { getAPIKey } from "@core/config";
import { runStudio } from "./orchestrator";
import type { CreativeWork, StudioConfig, StudioResult } from "./types";
import type { RunFlags } from "@core/types";
import { DEFAULT_CONFIG } from "./types";

/**
 * Main entry point for CLI
 */
export async function run(
  input: CreativeWork | { content: string },
  flags: RunFlags = {}
): Promise<StudioResult> {
  const cliFlags = flags as Record<string, unknown>;

  // If input is plain text, wrap it as creative work
  const work: CreativeWork =
    "work" in input
      ? input
      : {
          work: input.content || "",
          workType: String(cliFlags.workType || "general") as CreativeWork["workType"],
        };

  // Get configuration
  const config: StudioConfig = {
    ...DEFAULT_CONFIG,
    ...(flags.config || {}),
  };

  // Override from flags
  if (cliFlags.peers) {
    config.parameters.numPeers = parseInt(String(cliFlags.peers), 10);
  }

  if (cliFlags.noCreatorResponse) {
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
    flags.debug ?? false
  );

  return result;
}

// Re-export for programmatic use
export { runStudio };
export * from "./types";
