/**
 * Regulatory Impact Assessment Framework
 * Government policy analysis for comprehensive impact prediction
 */

import type { Policy, RegulatoryImpactConfig, RegulatoryImpactResult } from "./types";
import type { RunFlags } from "@core/types";
import { DEFAULT_CONFIG } from "./types";
import { createProvider } from "@core/providers";
import { getAPIKey } from "@core/config";

/**
 * Main entry point for CLI
 */
export async function run(
  input: Policy | { content: string },
  flags: RunFlags = {}
): Promise<RegulatoryImpactResult> {
  // If input is plain text, wrap it as a policy
  const policyInput: Policy =
    "description" in input && "objectives" in input
      ? input as Policy
      : {
          title: "Policy Proposal",
          description: input.content || "",
          objectives: [],
          scope: "Not specified",
          stakeholders: [],
        };

  // Merge config with flags
  const config: RegulatoryImpactConfig = {
    ...DEFAULT_CONFIG,
    ...(flags.config || {}),
  };

  // Create provider from flags
  const providerName = (flags as Record<string, unknown>).provider as string || "anthropic";
  const provider = createProvider({ name: providerName, apiKey: getAPIKey(providerName) });

  // Import and run the orchestrator
  const { runAssessment } = await import("./orchestrator");
  return runAssessment(policyInput, config, provider);
}

// Re-export types for programmatic use
export * from "./types";
