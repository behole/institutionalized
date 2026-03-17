/**
 * Writers' Workshop Framework
 * Manuscript feedback in Clarion/Clarion West style
 */

import type { Manuscript, WritersWorkshopConfig, WritersWorkshopResult } from "./types";
import type { RunFlags } from "@core/types";
import { DEFAULT_CONFIG } from "./types";
import { createProvider } from "@core/providers";
import { getAPIKey } from "@core/config";

/**
 * Main entry point for CLI
 */
export async function run(
  input: Manuscript | { content: string },
  flags: RunFlags = {}
): Promise<WritersWorkshopResult> {
  // If input is plain text, wrap it as a manuscript
  const manuscriptInput: Manuscript =
    "content" in input && "title" in input
      ? input as Manuscript
      : {
          title: "Untitled Manuscript",
          content: input.content || "",
        };

  // Merge config with flags
  const config: WritersWorkshopConfig = {
    ...DEFAULT_CONFIG,
    ...(flags.config || {}),
  };

  // Create provider from flags
  const providerName = (flags as Record<string, unknown>).provider as string || "anthropic";
  const provider = createProvider({ name: providerName, apiKey: getAPIKey(providerName) });

  // Import and run the orchestrator
  const { runWorkshop } = await import("./orchestrator");
  return runWorkshop(manuscriptInput, config, provider);
}

// Re-export types for programmatic use
export * from "./types";
