/**
 * Design Critique Framework
 * Structured feedback for design work-in-progress
 */

import { createProvider } from "@core/providers";
import { getAPIKey } from "@core/config";
import { parseJSON, executeParallel } from "@core/orchestrator";
import type { LLMProvider } from "@core/types";
import type { DesignWork, PeerFeedback, StakeholderInput, CritiqueSynthesis, DesignCritiqueConfig, DesignCritiqueResult } from "./types";
import { DEFAULT_CONFIG } from "./types";

export async function run(
  input: DesignWork | { content: string },
  flags: Record<string, any> = {}
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
  if (flags.peers) {
    config.parameters.peerCount = parseInt(flags.peers, 10);
  }

  const providerName = flags.provider || "anthropic";
  const apiKey = getAPIKey(providerName);
  const provider = createProvider({ name: providerName, apiKey });

  const verbose = flags.verbose || false;

  if (verbose) console.log("\n🎨 DESIGN CRITIQUE\n");

  // Phase 1: Peer feedback
  const peerFeedback = await gatherPeerFeedback(design, config, provider, verbose);

  // Phase 2: Stakeholder input
  const stakeholderInput = await gatherStakeholderInput(design, config, provider, verbose);

  // Phase 3: Facilitator synthesis
  const synthesis = await synthesizeCritique(design, peerFeedback, stakeholderInput, config, provider, verbose);

  if (verbose) {
    console.log(`\nStrengths Identified: ${synthesis.strengths.length}`);
    console.log(`Areas for Improvement: ${synthesis.areasForImprovement.length}`);
    console.log(`Next Steps: ${synthesis.nextSteps.length}\n`);
  }

  return {
    design,
    peerFeedback,
    stakeholderInput,
    synthesis,
    metadata: { timestamp: new Date().toISOString(), config },
  };
}

async function gatherPeerFeedback(
  design: DesignWork,
  config: DesignCritiqueConfig,
  provider: LLMProvider,
  verbose: boolean
): Promise<PeerFeedback[]> {
  if (verbose) console.log("Phase 1: Gathering peer feedback...\n");

  const perspectives = [
    "UX/Interaction Designer",
    "Visual/Brand Designer",
    "Accessibility Specialist",
  ].slice(0, config.parameters.peerCount);

  const tasks = perspectives.map((perspective, i) => async () => {
    if (verbose) console.log(`  ${perspective} reviewing...`);

    const response = await provider.call({
      model: config.models.peer,
      temperature: config.parameters.temperature,
      messages: [{
        role: "user",
        content: `You are a ${perspective} participating in a design critique.

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
      }],
      maxTokens: 2048,
    });

    const parsed = parseJSON<Omit<PeerFeedback, "peerId">>(response.content);
    return {
      peerId: `peer-${i + 1}`,
      ...parsed,
    };
  });

  return executeParallel(tasks);
}

async function gatherStakeholderInput(
  design: DesignWork,
  config: DesignCritiqueConfig,
  provider: LLMProvider,
  verbose: boolean
): Promise<StakeholderInput[]> {
  if (verbose) console.log("\nPhase 2: Gathering stakeholder input...\n");

  const tasks = config.stakeholderTypes.map((stakeholderType) => async () => {
    if (verbose) console.log(`  ${stakeholderType} providing input...`);

    const response = await provider.call({
      model: config.models.stakeholder,
      temperature: config.parameters.temperature,
      messages: [{
        role: "user",
        content: `You are representing the ${stakeholderType} perspective in a design critique.

DESIGN: ${design.title}
GOALS: ${design.goals.join(", ")}

Provide input from your stakeholder perspective in JSON:
{
  "stakeholderType": "${stakeholderType}",
  "priorities": ["priority 1", ...],
  "concerns": ["concern 1", ...],
  "requirements": ["requirement 1", ...]
}`,
      }],
      maxTokens: 1024,
    });

    return parseJSON<StakeholderInput>(response.content);
  });

  return executeParallel(tasks);
}

async function synthesizeCritique(
  design: DesignWork,
  peerFeedback: PeerFeedback[],
  stakeholderInput: StakeholderInput[],
  config: DesignCritiqueConfig,
  provider: LLMProvider,
  verbose: boolean
): Promise<CritiqueSynthesis> {
  if (verbose) console.log("\nPhase 3: Facilitator synthesizing critique...\n");

  const peerText = peerFeedback.map((p) =>
    `${p.perspective}:\nWorks: ${p.observations.works.join(", ")}\nDoesn't Work: ${p.observations.doesntWork.join(", ")}\nQuestions: ${p.observations.questions.join(", ")}\nSuggestions: ${p.observations.suggestions.join(", ")}`
  ).join("\n\n");

  const stakeholderText = stakeholderInput.map((s) =>
    `${s.stakeholderType}:\nPriorities: ${s.priorities.join(", ")}\nConcerns: ${s.concerns.join(", ")}\nRequirements: ${s.requirements.join(", ")}`
  ).join("\n\n");

  const response = await provider.call({
    model: config.models.facilitator,
    temperature: config.parameters.temperature,
    messages: [{
      role: "user",
      content: `You are facilitating a design critique session.

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
    }],
    maxTokens: 2048,
  });

  return parseJSON<CritiqueSynthesis>(response.content);
}

export * from "./types";
