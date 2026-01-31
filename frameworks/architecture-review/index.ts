/**
 * Architecture Review Board Framework
 * Multi-domain system design validation
 */

import { createProvider } from "@core/providers";
import { getAPIKey } from "@core/config";
import { parseJSON, executeParallel } from "@core/orchestrator";
import type { LLMProvider } from "@core/types";
import type { ArchitectureProposal, SpecialistReview, BoardDecision, ArchitectureReviewConfig, ArchitectureReviewResult } from "./types";
import { DEFAULT_CONFIG } from "./types";

export async function run(
  input: ArchitectureProposal | { content: string },
  flags: Record<string, any> = {}
): Promise<ArchitectureReviewResult> {
  const proposal: ArchitectureProposal = "title" in input
    ? input
    : {
        title: "Untitled Architecture",
        summary: "",
        design: input.content || "",
      };

  const config: ArchitectureReviewConfig = { ...DEFAULT_CONFIG, ...(flags.config || {}) };
  if (flags.domains) {
    config.domains = flags.domains.split(",");
  }

  const providerName = flags.provider || "anthropic";
  const apiKey = getAPIKey(providerName);
  const provider = createProvider({ name: providerName, apiKey });

  const verbose = flags.verbose || false;

  if (verbose) console.log("\n🏛️  ARCHITECTURE REVIEW BOARD\n");

  // Phase 1: Domain specialists review
  const reviews = await conductReviews(proposal, config, provider, verbose);

  // Phase 2: Board chair synthesizes decision
  const decision = await synthesizeDecision(proposal, reviews, config, provider, verbose);

  if (verbose) {
    console.log(`\nDecision: ${decision.decision.toUpperCase()}`);
    console.log(`Critical Issues: ${decision.criticalIssues.length}`);
    console.log(`Required Changes: ${decision.requiredChanges.length}\n`);
  }

  return {
    proposal,
    reviews,
    decision,
    metadata: { timestamp: new Date().toISOString(), config },
  };
}

async function conductReviews(
  proposal: ArchitectureProposal,
  config: ArchitectureReviewConfig,
  provider: LLMProvider,
  verbose: boolean
): Promise<SpecialistReview[]> {
  if (verbose) console.log("Phase 1: Domain specialist reviews...\n");

  const tasks = config.domains.map((domain) => async () => {
    if (verbose) console.log(`  ${domain} specialist reviewing...`);

    const response = await provider.call({
      model: config.models.specialist,
      temperature: config.parameters.temperature,
      messages: [{
        role: "user",
        content: `You are an Architecture Review Board member specializing in: ${domain}

ARCHITECTURE PROPOSAL: ${proposal.title}

SUMMARY:
${proposal.summary}

${proposal.requirements ? `REQUIREMENTS:\n${proposal.requirements}\n` : ""}

${proposal.constraints ? `CONSTRAINTS:\n${proposal.constraints}\n` : ""}

DESIGN DOCUMENT:
${proposal.design}

Review this architecture from your domain perspective (${domain}) and provide assessment in JSON:
{
  "domain": "${domain}",
  "concerns": ["concern 1", "concern 2", ...],
  "recommendations": ["recommendation 1", ...],
  "riskLevel": "low" | "medium" | "high" | "critical",
  "verdict": "approve" | "approve_with_conditions" | "revise" | "reject",
  "rationale": "explanation of your verdict"
}

Be thorough and identify potential issues specific to your domain.`,
      }],
      maxTokens: 2048,
    });

    return parseJSON<SpecialistReview>(response.content);
  });

  return executeParallel(tasks);
}

async function synthesizeDecision(
  proposal: ArchitectureProposal,
  reviews: SpecialistReview[],
  config: ArchitectureReviewConfig,
  provider: LLMProvider,
  verbose: boolean
): Promise<BoardDecision> {
  if (verbose) console.log("\nPhase 2: Board chair synthesizing decision...\n");

  const reviewsText = reviews.map((review) =>
    `${review.domain}:\nVerdict: ${review.verdict}\nRisk Level: ${review.riskLevel}\nConcerns: ${review.concerns.join(", ")}\nRecommendations: ${review.recommendations.join(", ")}\nRationale: ${review.rationale}\n`
  ).join("\n---\n\n");

  const response = await provider.call({
    model: config.models.chair,
    temperature: config.parameters.temperature,
    messages: [{
      role: "user",
      content: `You are the Architecture Review Board chair.

PROPOSAL: ${proposal.title}

SPECIALIST REVIEWS:
${reviewsText}

Based on all specialist reviews, render the board's decision in JSON:
{
  "decision": "approved" | "approved_with_conditions" | "major_revisions" | "rejected",
  "summary": "decision summary paragraph",
  "criticalIssues": ["critical issue 1", ...],
  "requiredChanges": ["required change 1", ...],
  "recommendations": ["recommendation 1", ...],
  "tradeoffs": ["identified tradeoff 1", ...]
}

Decision criteria:
- "approved": No significant concerns, ready to proceed
- "approved_with_conditions": Minor issues, can proceed with documented conditions
- "major_revisions": Significant concerns requiring redesign and re-review
- "rejected": Fundamental flaws, not viable approach`,
    }],
    maxTokens: 2048,
  });

  return parseJSON<BoardDecision>(response.content);
}

export * from "./types";
