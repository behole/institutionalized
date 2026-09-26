/**
 * SWOT Analysis Framework — engine port.
 *
 * Flow: internal analysis → external analysis → strategic synthesis.
 * All provider/model/audit/logging concerns owned by the engine.
 */
import type { EventSink } from '@core/engine';
import { defineFramework } from '@core/engine';
import { parseJSON } from '@core/orchestrator';
import type { RunFlags } from '@core/types';
import type {
  Situation,
  InternalAnalysis,
  ExternalAnalysis,
  StrategicRecommendations,
  SWOTConfig,
  SWOTResult,
} from './types';
import { DEFAULT_CONFIG } from './types';

export const swot = defineFramework<Situation | { content: string }, SWOTResult>({
  name: 'swot',
  description:
    'Strategic situational assessment: internal strengths/weaknesses, external opportunities/threats, strategies',
  normalize(raw) {
    if (typeof raw === 'object' && raw !== null && 'entity' in raw) {
      return raw as Situation;
    }
    const content = (raw as { content?: string })?.content ?? '';
    return { entity: 'Unnamed Entity', description: content };
  },
  async run(rawSituation, session) {
    const situation = rawSituation as Situation;
    const config: SWOTConfig = {
      ...DEFAULT_CONFIG,
      ...(session.flags.config as Partial<SWOTConfig> | undefined),
    };
    const explicitModel = session.models.override;
    if (explicitModel) {
      config.models = {
        internalAnalyst: explicitModel,
        externalAnalyst: explicitModel,
        strategist: explicitModel,
      };
    }

    // Phase 1: Internal analysis (Strengths & Weaknesses)
    session.phase('Internal Analysis', 'Strengths & Weaknesses');
    const internalResponse = await session.step({
      name: 'internal-analyst',
      prompt: `You are an internal analyst conducting a SWOT analysis.

ENTITY: ${situation.entity}

DESCRIPTION:
${situation.description}

${situation.currentState ? `CURRENT STATE:\n${situation.currentState}\n` : ''}
${situation.goals ? `GOALS:\n${situation.goals.map((g) => `- ${g}`).join('\n')}\n` : ''}

Analyze internal factors in JSON:
{
  "strengths": ["strength 1", ...],
  "weaknesses": ["weakness 1", ...],
  "capabilities": ["capability 1", ...],
  "limitations": ["limitation 1", ...],
  "resources": ["resource 1", ...]
}

Focus on internal capabilities, resources, and limitations.`,
      temperature: config.parameters.temperature,
    });
    const internal = parseJSON<InternalAnalysis>(internalResponse.content);

    // Phase 2: External analysis (Opportunities & Threats)
    session.phase('External Analysis', 'Opportunities & Threats');
    const externalResponse = await session.step({
      name: 'external-analyst',
      prompt: `You are an external analyst conducting a SWOT analysis.

ENTITY: ${situation.entity}

DESCRIPTION:
${situation.description}

${situation.currentState ? `CURRENT STATE:\n${situation.currentState}\n` : ''}
${situation.goals ? `GOALS:\n${situation.goals.map((g) => `- ${g}`).join('\n')}\n` : ''}

Analyze external factors in JSON:
{
  "opportunities": ["opportunity 1", ...],
  "threats": ["threat 1", ...],
  "marketTrends": ["trend 1", ...],
  "competitiveLandscape": ["competitor insight 1", ...],
  "externalForces": ["force 1", ...]
}

Focus on external environment, market, competition, and uncontrollable factors.`,
      temperature: config.parameters.temperature,
    });
    const external = parseJSON<ExternalAnalysis>(externalResponse.content);

    // Phase 3: Strategic synthesis
    session.phase('Strategic Synthesis');
    const strategyResponse = await session.step({
      name: 'strategist',
      prompt: `You are a strategy consultant synthesizing a SWOT analysis.

ENTITY: ${situation.entity}

INTERNAL ANALYSIS:
Strengths: ${internal.strengths.join(', ')}
Weaknesses: ${internal.weaknesses.join(', ')}

EXTERNAL ANALYSIS:
Opportunities: ${external.opportunities.join(', ')}
Threats: ${external.threats.join(', ')}

Formulate strategies in JSON:
{
  "soStrategies": ["aggressive strategy 1", ...],
  "woStrategies": ["turnaround strategy 1", ...],
  "stStrategies": ["defensive strategy 1", ...],
  "wtStrategies": ["survival strategy 1", ...],
  "recommendation": "overall strategic recommendation"
}

Cross-reference internal and external factors to derive actionable strategies.`,
      temperature: config.parameters.temperature,
    });
    const strategies = parseJSON<StrategicRecommendations>(strategyResponse.content);

    session.note(
      `Strengths: ${internal.strengths.length} | Weaknesses: ${internal.weaknesses.length} | Opportunities: ${external.opportunities.length} | Threats: ${external.threats.length}`
    );

    return {
      situation,
      internal,
      external,
      strategies,
      metadata: {
        timestamp: new Date().toISOString(),
        config,
      },
    };
  },
});

/** Backward-compatible entry returning the bare result. */
export async function run(
  input: Situation | { content: string },
  flags: RunFlags = {},
  sinks: EventSink[] = []
): Promise<SWOTResult> {
  const { result, auditLog } = await swot(input, flags, sinks);
  result.metadata.costUSD = auditLog.metadata.totalCost;
  return result;
}

export * from './types';
