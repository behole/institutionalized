/**
 * Grant Review Panel Framework
 * Comparative prioritization and resource allocation
 */

import { createProvider } from "@core/providers";
import { getAPIKey } from "@core/config";
import { parseJSON, executeParallel } from "@core/orchestrator";
import type { LLMProvider } from "@core/types";
import type { GrantProposal, ReviewerScore, PanelRanking, GrantPanelConfig, GrantPanelResult } from "./types";
import { DEFAULT_CONFIG } from "./types";

export async function run(
  input: { proposals: GrantProposal[] } | { content: string },
  flags: Record<string, any> = {}
): Promise<GrantPanelResult> {
  const proposals: GrantProposal[] = "proposals" in input
    ? input.proposals
    : parseProposalsFromContent(input.content || "");

  const config: GrantPanelConfig = { ...DEFAULT_CONFIG, ...(flags.config || {}) };
  if (flags.budget) {
    config.totalBudget = parseInt(flags.budget, 10);
  }
  if (flags.reviewers) {
    config.parameters.reviewersPerProposal = parseInt(flags.reviewers, 10);
  }

  const providerName = flags.provider || "anthropic";
  const apiKey = getAPIKey(providerName);
  const provider = createProvider({ name: providerName, apiKey });

  const verbose = flags.verbose || false;

  if (verbose) console.log("\n💰 GRANT REVIEW PANEL\n");

  // Phase 1: Independent reviewer scoring
  const reviews = await scoreProposals(proposals, config, provider, verbose);

  // Phase 2: Panel calibration and ranking
  const ranking = await calibrateAndRank(proposals, reviews, config, provider, verbose);

  if (verbose) {
    console.log(`\nProposals Reviewed: ${proposals.length}`);
    console.log(`Recommended for Funding: ${ranking.allocations.length}`);
    console.log(`Total Allocated: $${ranking.allocations.reduce((sum, a) => sum + a.amount, 0).toLocaleString()}\n`);
  }

  return {
    proposals,
    reviews,
    ranking,
    metadata: { timestamp: new Date().toISOString(), config },
  };
}

function parseProposalsFromContent(content: string): GrantProposal[] {
  // Simple parser - in real use, this would be more sophisticated
  return [{
    id: "p1",
    title: "Proposal from Content",
    abstract: content.slice(0, 200),
    requestedAmount: 100000,
    duration: "12 months",
    document: content,
  }];
}

async function scoreProposals(
  proposals: GrantProposal[],
  config: GrantPanelConfig,
  provider: LLMProvider,
  verbose: boolean
): Promise<ReviewerScore[]> {
  if (verbose) console.log("Phase 1: Independent reviewer scoring...\n");

  const tasks: Array<() => Promise<ReviewerScore>> = [];

  for (const proposal of proposals) {
    for (let i = 0; i < config.parameters.reviewersPerProposal; i++) {
      tasks.push(async () => {
        if (verbose) console.log(`  Reviewer ${i + 1} scoring "${proposal.title}"...`);

        const response = await provider.call({
          model: config.models.reviewer,
          temperature: config.parameters.temperature,
          messages: [{
            role: "user",
            content: `You are a grant reviewer evaluating proposals.

PROPOSAL: ${proposal.title}
REQUESTED: $${proposal.requestedAmount.toLocaleString()} for ${proposal.duration}

ABSTRACT:
${proposal.abstract}

FULL PROPOSAL:
${proposal.document}

Score this proposal (0-10 scale for each criterion) in JSON:
{
  "proposalId": "${proposal.id}",
  "scores": {
    "impact": <0-10>,
    "feasibility": <0-10>,
    "innovation": <0-10>,
    "qualifications": <0-10>
  },
  "overallScore": <0-10>,
  "strengths": ["strength 1", ...],
  "weaknesses": ["weakness 1", ...],
  "comments": "overall assessment"
}`,
          }],
          maxTokens: 1536,
        });

        return parseJSON<ReviewerScore>(response.content);
      });
    }
  }

  return executeParallel(tasks);
}

async function calibrateAndRank(
  proposals: GrantProposal[],
  reviews: ReviewerScore[],
  config: GrantPanelConfig,
  provider: LLMProvider,
  verbose: boolean
): Promise<PanelRanking> {
  if (verbose) console.log("\nPhase 2: Panel calibration and ranking...\n");

  const reviewsByProposal = proposals.map((p) => ({
    proposal: p,
    reviews: reviews.filter((r) => r.proposalId === p.id),
  }));

  const reviewsText = reviewsByProposal.map(({ proposal, reviews }) => {
    const avgScore = reviews.reduce((sum, r) => sum + r.overallScore, 0) / reviews.length;
    return `Proposal: ${proposal.title} (${proposal.id})\nRequested: $${proposal.requestedAmount.toLocaleString()}\nAverage Score: ${avgScore.toFixed(2)}\nReviews: ${reviews.map(r => `Score: ${r.overallScore}, Strengths: ${r.strengths.join(", ")}, Weaknesses: ${r.weaknesses.join(", ")}`).join(" | ")}\n`;
  }).join("\n---\n\n");

  const response = await provider.call({
    model: config.models.panel,
    temperature: config.parameters.temperature,
    messages: [{
      role: "user",
      content: `You are the grant review panel chair calibrating scores and making funding decisions.

TOTAL BUDGET: $${config.totalBudget.toLocaleString()}

PROPOSALS AND REVIEWS:
${reviewsText}

Rank proposals and make funding recommendations in JSON:
{
  "rankedProposals": [
    {
      "proposalId": "...",
      "title": "...",
      "consensusScore": <0-10>,
      "fundingRecommendation": "fund" | "fund_if_available" | "do_not_fund",
      "rationale": "..."
    },
    ...
  ],
  "fundingLine": <index where funding runs out>,
  "totalBudget": ${config.totalBudget},
  "allocations": [
    {"proposalId": "...", "amount": <number>},
    ...
  ],
  "summary": "overall funding decision summary"
}

Rank by quality, allocate budget to highest-ranked proposals until exhausted.`,
    }],
    maxTokens: 2048,
  });

  return parseJSON<PanelRanking>(response.content);
}

export * from "./types";
