/**
 * Writers' Workshop Framework
 * Manuscript feedback in Clarion/Clarion West style
 */

import type { Manuscript, WritersWorkshopConfig, WritersWorkshopResult } from "./types";
import { DEFAULT_CONFIG } from "./types";

/**
 * Main entry point for CLI
 */
export async function run(
  input: Manuscript | { content: string },
  flags: Record<string, any> = {}
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

  // Import and run the orchestrator
  const { runWorkshop } = await import("./orchestrator");
  return runWorkshop(manuscriptInput, config);
}

// Re-export types for programmatic use
export * from "./types";
