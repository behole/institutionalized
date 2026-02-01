/**
 * Regulatory Impact Assessment Framework
 * Government policy analysis for comprehensive impact prediction
 */

import type { Policy, RegulatoryImpactConfig, RegulatoryImpactResult } from "./types";
import { DEFAULT_CONFIG } from "./types";

/**
 * Main entry point for CLI
 */
export async function run(
  input: Policy | { content: string },
  flags: Record<string, any> = {}
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

  // Import and run the orchestrator
  const { runAssessment } = await import("./orchestrator");
  return runAssessment(policyInput, config);
}

// Re-export types for programmatic use
export * from "./types";
