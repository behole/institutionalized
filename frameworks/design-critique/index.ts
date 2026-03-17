/**
 * Design Critique Framework
 * Structured feedback for design work-in-progress
 */

import { createProvider } from "@core/providers";
import { getAPIKey } from "@core/config";
import { parseJSON, FrameworkRunner } from "@core/orchestrator";
import type { LLMProvider, RunFlags } from "@core/types";
import type { DesignWork, PeerFeedback, StakeholderInput, CritiqueSynthesis, DesignCritiqueConfig, DesignCritiqueResult } from "./types";
import { DEFAULT_CONFIG } from "./types";

export async function run(
  input: DesignWork | { content: string },
  flags: RunFlags = {}
): Promise<DesignCritiqueResult> {
  const design: DesignWork = "title" in input
    ? input
    : {
        title: "Untitled Design",
        stage: "prototype",
        description: input.content || "",
        goals: [],
        artifacts: input.content || "",
      };

  const config: DesignCritiqueConfig = { ...DEFAULT_CONFIG, ...(flags.config || {}) };
  const cliFlags = flags as Record<string, unknown>;
  if (cliFlags.peers) {
    config.parameters.peerCount = parseInt(String(cliFlags.peers), 10);
  }

  const providerName = flags.provider || "anthropic";
  const apiKey = getAPIKey(providerName);
  const provider = createProvider({ name: providerName, apiKey });

  const verbose = flags.debug ?? false;

  if (verbose) console.log("\n🎨 DESIGN CRITIQUE\n");

  const runner = new FrameworkRunner<DesignWork, DesignCritiqueResult>("design-critique", design);

  // Phase 1: Peer feedback
  const peerFeedback = await gatherPeerFeedback(design, config, provider, runner, verbose);

  // Phase 2: Stakeholder input
  const stakeholderInput = await gatherStakeholderInput(design, config, provider, runner, verbose);

  // Phase 3: Facilitator synthesis
  const synthesis = await synthesizeCritique(design, peerFeedback, stakeholderInput, config, provider, runner, verbose);

  if (verbose) {
    console.log(`\nStrengths Identified: ${synthesis.strengths.length}`);
    console.log(`Areas for Improvement: ${synthesis.areasForImprovement.length}`);
    console.log(`Next Steps: ${synthesis.nextSteps.length}\n`);
  }

  const result: DesignCritiqueResult = {
    design,
    peerFeedback,
    stakeholderInput,
    synthesis,
    metadata: { timestamp: new Date().toISOString(), config },
  };

  const { auditLog } = await runner.finalize(result, "complete");

  return {
    ...result,
    metadata: { ...result.metadata, costUSD: auditLog.metadata.totalCost },
  };
}

async function gatherPeerFeedback(
  design: DesignWork,
  config: DesignCritiqueConfig,
  provider: LLMProvider,
  runner: FrameworkRunner<DesignWork, DesignCritiqueResult>,
  verbose: boolean
): Promise<PeerFeedback[]> {
  if (verbose) console.log("Phase 1: Gathering peer feedback...\n");

  const perspectives = [
    "UX/Interaction Designer",
    "Visual/Brand Designer",
    "Accessibility Specialist",
  ].slice(0, config.parameters.peerCount);

  const responses = await runner.runParallel(
    perspectives.map((perspective, i) => {
      if (verbose) console.log(`  ${perspective} reviewing...`);
      return {
        name: `peer-${i + 1}`,
        provider,
        model: config.models.peer,
        prompt: `You are a ${perspective} participating in a design critique.

DESIGN: ${design.title} (${design.stage} stage)

DESCRIPTION:
${design.description}

GOALS:
${design.goals.map((g) => `- ${g}`).join("\n")}

${design.constraints ? `CONSTRAINTS:\n${design.constraints.map((c) => `- ${c}`).join("\n")}\n` : ""}

ARTIFACTS:
${design.artifacts}

Provide structured feedback from your perspective in JSON:
{
  "perspective": "${perspective}",
  "observations": {
    "works": ["what works well", ...],
    "doesntWork": ["what doesn't work", ...],
    "questions": ["clarifying question", ...],
    "suggestions": ["suggestion", ...]
  },
  "categories": {
    "usability": ["usability observation", ...],
    "aesthetics": ["aesthetic observation", ...],
    "functionality": ["functionality observation", ...],
    "accessibility": ["accessibility observation", ...]
  }
}`,
        temperature: config.parameters.temperature,
        maxTokens: 2048,
      };
    })
  );

  return responses.map((response, i) => {
    const parsed = parseJSON<Omit<PeerFeedback, "peerId">>(response.content);
    return {
      peerId: `peer-${i + 1}`,
      ...parsed,
    };
  });
}

async function gatherStakeholderInput(
  design: DesignWork,
  config: DesignCritiqueConfig,
  provider: LLMProvider,
  runner: FrameworkRunner<DesignWork, DesignCritiqueResult>,
  verbose: boolean
): Promise<StakeholderInput[]> {
  if (verbose) console.log("\nPhase 2: Gathering stakeholder input...\n");

  const responses = await runner.runParallel(
    config.stakeholderTypes.map((stakeholderType) => {
      if (verbose) console.log(`  ${stakeholderType} providing input...`);
      return {
        name: `stakeholder-${stakeholderType.toLowerCase().replace(/\s+/g, "-")}`,
        provider,
        model: config.models.stakeholder,
        prompt: `You are representing the ${stakeholderType} perspective in a design critique.

DESIGN: ${design.title}
GOALS: ${design.goals.join(", ")}

Provide input from your stakeholder perspective in JSON:
{
  "stakeholderType": "${stakeholderType}",
  "priorities": ["priority 1", ...],
  "concerns": ["concern 1", ...],
  "requirements": ["requirement 1", ...]
}`,
        temperature: config.parameters.temperature,
        maxTokens: 1024,
      };
    })
  );

  return responses.map((response) => parseJSON<StakeholderInput>(response.content));
}

async function synthesizeCritique(
  design: DesignWork,
  peerFeedback: PeerFeedback[],
  stakeholderInput: StakeholderInput[],
  config: DesignCritiqueConfig,
  provider: LLMProvider,
  runner: FrameworkRunner<DesignWork, DesignCritiqueResult>,
  verbose: boolean
): Promise<CritiqueSynthesis> {
  if (verbose) console.log("\nPhase 3: Facilitator synthesizing critique...\n");

  const peerText = peerFeedback.map((p) =>
    `${p.perspective}:\nWorks: ${p.observations.works.join(", ")}\nDoesn't Work: ${p.observations.doesntWork.join(", ")}\nQuestions: ${p.observations.questions.join(", ")}\nSuggestions: ${p.observations.suggestions.join(", ")}`
  ).join("\n\n");

  const stakeholderText = stakeholderInput.map((s) =>
    `${s.stakeholderType}:\nPriorities: ${s.priorities.join(", ")}\nConcerns: ${s.concerns.join(", ")}\nRequirements: ${s.requirements.join(", ")}`
  ).join("\n\n");

  const response = await runner.runAgent(
    "facilitator",
    provider,
    config.models.facilitator,
    `You are facilitating a design critique session.

DESIGN: ${design.title} (${design.stage})
GOALS: ${design.goals.join(", ")}

PEER FEEDBACK:
${peerText}

STAKEHOLDER INPUT:
${stakeholderText}

Synthesize the critique in JSON:
{
  "summary": "overall critique summary",
  "strengths": ["strength 1", ...],
  "areasForImprovement": ["area 1", ...],
  "prioritizedFeedback": [
    {
      "issue": "...",
      "priority": "critical" | "high" | "medium" | "low",
      "category": "usability | aesthetics | functionality | accessibility",
      "suggestions": ["...", ...]
    },
    ...
  ],
  "nextSteps": ["actionable next step", ...],
  "iterationDirection": "high-level guidance for next iteration"
}`,
    config.parameters.temperature,
    2048
  );

  return parseJSON<CritiqueSynthesis>(response.content);
}

export * from "./types";
