/**
 * Design Critique Framework — engine port.
 *
 * Flow: parallel peer feedback (design perspectives) → parallel stakeholder
 * input → facilitator synthesis. All provider/model/audit/logging concerns
 * owned by the engine.
 */
import type { EventSink } from '@core/engine';
import { defineFramework, Session } from '@core/engine';
import { parseJSON } from '@core/orchestrator';
import type { RunFlags } from '@core/types';
import type {
  DesignWork,
  PeerFeedback,
  StakeholderInput,
  CritiqueSynthesis,
  DesignCritiqueConfig,
  DesignCritiqueResult,
} from './types';
import { DEFAULT_CONFIG } from './types';

export const designCritique = defineFramework<
  DesignWork | { content: string },
  DesignCritiqueResult
>({
  name: 'design-critique',
  description:
    'Structured work-in-progress feedback: peer perspectives, stakeholder input, facilitator synthesis',
  normalize(raw) {
    if (typeof raw === 'object' && raw !== null && 'title' in raw) {
      return raw as DesignWork;
    }
    const content = (raw as { content?: string })?.content ?? '';
    return {
      title: 'Untitled Design',
      stage: 'prototype',
      description: content,
      goals: [],
      artifacts: content,
    };
  },
  async run(rawInput, session) {
    const design = rawInput as DesignWork;
    const config: DesignCritiqueConfig = {
      ...DEFAULT_CONFIG,
      ...(session.flags.config as Partial<DesignCritiqueConfig> | undefined),
    };
    const explicitModel = session.models.override;
    if (explicitModel) {
      config.models = {
        peer: explicitModel,
        stakeholder: explicitModel,
        facilitator: explicitModel,
      };
    }

    // Phase 1: Peer feedback
    session.phase('Peer Feedback', `${config.parameters.peerCount} design perspectives`);
    const peerFeedback = await gatherPeerFeedback(design, config, session);

    // Phase 2: Stakeholder input
    session.phase('Stakeholder Input', `${config.stakeholderTypes.length} stakeholder types`);
    const stakeholderInput = await gatherStakeholderInput(design, config, session);

    // Phase 3: Facilitator synthesis
    session.phase('Facilitator Synthesis');
    const synthesis = await synthesizeCritique(
      design,
      peerFeedback,
      stakeholderInput,
      config,
      session
    );

    session.note(
      `Strengths: ${synthesis.strengths.length} | Areas for improvement: ${synthesis.areasForImprovement.length} | Next steps: ${synthesis.nextSteps.length}`
    );

    return {
      design,
      peerFeedback,
      stakeholderInput,
      synthesis,
      metadata: {
        timestamp: new Date().toISOString(),
        config,
        decision: synthesis.prioritizedFeedback.some((f) => f.priority === 'critical')
          ? 'delay'
          : 'unclear',
      },
    };
  },
});

async function gatherPeerFeedback(
  design: DesignWork,
  config: DesignCritiqueConfig,
  session: Session
): Promise<PeerFeedback[]> {
  const perspectives = [
    'UX/Interaction Designer',
    'Visual/Brand Designer',
    'Accessibility Specialist',
  ].slice(0, config.parameters.peerCount);

  const responses = await session.parallel(
    perspectives.map((perspective, i) => ({
      name: `peer-${i + 1}`,
      prompt: `You are a ${perspective} participating in a design critique.

DESIGN: ${design.title} (${design.stage} stage)

DESCRIPTION:
${design.description}

GOALS:
${design.goals.map((g) => `- ${g}`).join('\n')}

${design.constraints ? `CONSTRAINTS:\n${design.constraints.map((c) => `- ${c}`).join('\n')}\n` : ''}

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
    }))
  );

  return responses.map((response, i) => {
    const parsed = parseJSON<Omit<PeerFeedback, 'peerId'>>(response.content);
    return {
      peerId: `peer-${i + 1}`,
      ...parsed,
    };
  });
}

async function gatherStakeholderInput(
  design: DesignWork,
  config: DesignCritiqueConfig,
  session: Session
): Promise<StakeholderInput[]> {
  const responses = await session.parallel(
    config.stakeholderTypes.map((stakeholderType) => ({
      name: `stakeholder-${stakeholderType.toLowerCase().replace(/\s+/g, '-')}`,
      prompt: `You are representing the ${stakeholderType} perspective in a design critique.

DESIGN: ${design.title}
GOALS: ${design.goals.join(', ')}

Provide input from your stakeholder perspective in JSON:
{
  "stakeholderType": "${stakeholderType}",
  "priorities": ["priority 1", ...],
  "concerns": ["concern 1", ...],
  "requirements": ["requirement 1", ...]
}`,
      temperature: config.parameters.temperature,
      maxTokens: 1024,
    }))
  );

  return responses.map((response) => parseJSON<StakeholderInput>(response.content));
}

async function synthesizeCritique(
  design: DesignWork,
  peerFeedback: PeerFeedback[],
  stakeholderInput: StakeholderInput[],
  config: DesignCritiqueConfig,
  session: Session
): Promise<CritiqueSynthesis> {
  const peerText = peerFeedback
    .map(
      (p) =>
        `${p.perspective}:\nWorks: ${p.observations.works.join(', ')}\nDoesn't Work: ${p.observations.doesntWork.join(', ')}\nQuestions: ${p.observations.questions.join(', ')}\nSuggestions: ${p.observations.suggestions.join(', ')}`
    )
    .join('\n\n');

  const stakeholderText = stakeholderInput
    .map(
      (s) =>
        `${s.stakeholderType}:\nPriorities: ${s.priorities.join(', ')}\nConcerns: ${s.concerns.join(', ')}\nRequirements: ${s.requirements.join(', ')}`
    )
    .join('\n\n');

  const response = await session.step({
    name: 'facilitator',
    prompt: `You are facilitating a design critique session.

DESIGN: ${design.title} (${design.stage})
GOALS: ${design.goals.join(', ')}

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
    temperature: config.parameters.temperature,
    maxTokens: 2048,
  });

  return parseJSON<CritiqueSynthesis>(response.content);
}

/** Backward-compatible entry returning the bare result. */
export async function run(
  input: DesignWork | { content: string },
  flags: RunFlags = {},
  sinks: EventSink[] = []
): Promise<DesignCritiqueResult> {
  const { result, auditLog } = await designCritique(input, flags, sinks);
  result.metadata.costUSD = auditLog.metadata.totalCost;
  return result;
}

export * from './types';
