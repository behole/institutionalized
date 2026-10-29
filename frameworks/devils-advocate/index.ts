/**
 * Devil's Advocate Framework — engine port.
 *
 * Flow: opposition challenge → proposer rebuttal → arbiter verdict.
 * All provider/model/audit/logging concerns owned by the engine.
 */
import type { EventSink } from '@core/engine';
import { defineFramework } from '@core/engine';
import { parseJSON } from '@core/orchestrator';
import type { RunFlags } from '@core/types';
import type {
  Proposal,
  DevilsAdvocateConfig,
  DevilsAdvocateResult,
  Opposition,
  Rebuttal,
  Verdict,
} from './types';
import { DEFAULT_CONFIG } from './types';

export const devilsAdvocate = defineFramework<Proposal | { content: string }, DevilsAdvocateResult>(
  {
    name: 'devils-advocate',
    description: 'Formal challenge to test proposals: opposition, rebuttal, arbiter verdict',
    normalize(raw) {
      if (typeof raw === 'object' && raw !== null && 'description' in raw) {
        return raw as Proposal;
      }
      const content = (raw as { content?: string })?.content ?? '';
      return { description: content, rationale: [], benefits: [] };
    },
    async run(rawInput, session) {
      const proposal = rawInput as Proposal;
      const config: DevilsAdvocateConfig = {
        ...DEFAULT_CONFIG,
        ...(session.flags.config as Partial<DevilsAdvocateConfig> | undefined),
      };
      const explicitModel = session.models.override;
      if (explicitModel) {
        config.models = {
          advocate: explicitModel,
          proposer: explicitModel,
          arbiter: explicitModel,
        };
      }

      // Phase 1: Opposition
      session.phase('Opposition', "Devil's advocate challenges the proposal");
      const oppositionStep = await session.step({
        name: 'advocate',
        prompt: `You are the Devil's Advocate. Challenge this proposal:

${proposal.description}

Rationale: ${proposal.rationale.join('; ')}
Benefits: ${proposal.benefits.join('; ')}

Provide JSON:
{
  "objections": ["objection 1", ...],
  "counterArguments": ["counter 1", ...],
  "alternativeProposals": ["alternative 1", ...],
  "questionsNotAnswered": ["question 1", ...]
}`,
        temperature: config.parameters.advocateTemperature,
        maxTokens: 2048,
      });
      const opposition = parseJSON<Opposition>(oppositionStep.content);

      // Phase 2: Rebuttal
      session.phase('Rebuttal', 'Proposer responds to objections');
      const rebuttalStep = await session.step({
        name: 'proposer',
        prompt: `Respond to these objections to your proposal:

PROPOSAL: ${proposal.description}

OBJECTIONS:
${opposition.objections.map((o, i) => `${i + 1}. ${o}`).join('\n')}

Provide JSON:
{
  "addressedObjections": [{"objection": "...", "response": "..."}, ...],
  "strengthenedCase": "...",
  "concessions": ["concession 1", ...]
}`,
        temperature: 0.6,
        maxTokens: 2048,
      });
      const rebuttal = parseJSON<Rebuttal>(rebuttalStep.content);

      // Phase 3: Verdict
      session.phase('Verdict', 'Arbiter decides');
      const verdictStep = await session.step({
        name: 'arbiter',
        prompt: `As arbiter, decide on this proposal after seeing opposition and rebuttal.

PROPOSAL: ${proposal.description}
OBJECTIONS: ${opposition.objections.length}
REBUTTAL: ${rebuttal.strengthenedCase}

Provide JSON:
{
  "decision": "approved" | "approved-with-conditions" | "rejected",
  "reasoning": "...",
  "conditions": ["condition 1", ...],
  "verdict": "one sentence summary"
}`,
        temperature: config.parameters.arbiterTemperature,
        maxTokens: 2048,
      });
      const verdict = parseJSON<Verdict>(verdictStep.content);

      session.note(`Decision: ${verdict.decision.toUpperCase()} | Verdict: ${verdict.verdict}`);

      return {
        proposal,
        opposition,
        rebuttal,
        verdict,
        metadata: {
          timestamp: new Date().toISOString(),
          config,
          decision:
            verdict.decision === 'approved'
              ? 'approve'
              : verdict.decision === 'approved-with-conditions'
                ? 'delay'
                : 'reject',
        },
      };
    },
  }
);

/** Backward-compatible entry returning the bare result. */
export async function run(
  input: Proposal | { content: string },
  flags: RunFlags = {},
  sinks: EventSink[] = []
): Promise<DevilsAdvocateResult> {
  const { result, auditLog } = await devilsAdvocate(input, flags, sinks);
  result.metadata.costUSD = auditLog.metadata.totalCost;
  return result;
}

export * from './types';
