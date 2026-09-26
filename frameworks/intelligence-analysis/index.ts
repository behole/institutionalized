/**
 * Intelligence Analysis (Competing Hypotheses) Framework — engine port.
 *
 * Flow: hypothesis generation → evidence evaluation → synthesis and ranking.
 * All provider/model/audit/logging concerns owned by the engine.
 */
import type { EventSink } from '@core/engine';
import { defineFramework, Session } from '@core/engine';
import { parseJSON } from '@core/orchestrator';
import type { RunFlags } from '@core/types';
import type {
  Problem,
  Hypothesis,
  EvidenceEvaluation,
  Analysis,
  IntelligenceAnalysisConfig,
  IntelligenceAnalysisResult,
} from './types';
import { DEFAULT_CONFIG } from './types';

export const intelligenceAnalysis = defineFramework<
  Problem | { content: string },
  IntelligenceAnalysisResult
>({
  name: 'intelligence-analysis',
  description:
    'Analysis of Competing Hypotheses (ACH): hypothesis generation, evidence evaluation, ranking',
  normalize(raw) {
    if (typeof raw === 'object' && raw !== null && 'question' in raw) {
      return raw as Problem;
    }
    const content = (raw as { content?: string })?.content ?? '';
    return { question: content, evidence: [] };
  },
  async run(rawInput, session) {
    const problem = rawInput as Problem;
    const config: IntelligenceAnalysisConfig = {
      ...DEFAULT_CONFIG,
      ...(session.flags.config as Partial<IntelligenceAnalysisConfig> | undefined),
    };
    const explicitModel = session.models.override;
    if (explicitModel) {
      config.models = {
        analyst: explicitModel,
        evaluator: explicitModel,
      };
    }

    // Phase 1: Generate competing hypotheses
    session.phase(
      'Hypothesis Generation',
      `at least ${config.parameters.minHypotheses} hypotheses`
    );
    const hypotheses = await generateHypotheses(problem, config, session);

    // Phase 2: Evaluate evidence against hypotheses
    session.phase('Evidence Evaluation');
    const evidenceEvaluation = await evaluateEvidence(problem, hypotheses, config, session);

    // Phase 3: Rank hypotheses and synthesize
    session.phase('Synthesis & Ranking');
    const analysis = await synthesizeAnalysis(
      problem,
      hypotheses,
      evidenceEvaluation,
      config,
      session
    );

    session.note(
      `Hypotheses: ${hypotheses.length} | Most likely: ${analysis.mostLikely} | Confidence: ${analysis.rankedHypotheses[0]?.confidence ?? 'N/A'}`
    );

    return {
      problem,
      hypotheses,
      evidenceEvaluation,
      analysis,
      metadata: {
        timestamp: new Date().toISOString(),
        config,
        decision: 'unclear',
      },
    };
  },
});

async function generateHypotheses(
  problem: Problem,
  config: IntelligenceAnalysisConfig,
  session: Session
): Promise<Hypothesis[]> {
  const response = await session.step({
    name: 'analyst-hypotheses',
    prompt: `You are an intelligence analyst using the Analysis of Competing Hypotheses (ACH) method.

QUESTION/PROBLEM:
${problem.question}

${problem.context ? `CONTEXT:\n${problem.context}\n` : ''}

AVAILABLE EVIDENCE:
${problem.evidence.map((e, i) => `${i + 1}. ${e}`).join('\n')}

Generate at least ${config.parameters.minHypotheses} competing hypotheses that could explain the situation. Include both likely and unlikely alternatives. Return in JSON:
{
  "hypotheses": [
    {
      "id": "h1",
      "hypothesis": "hypothesis statement",
      "plausibility": <0-10>,
      "supportingEvidence": ["evidence 1", ...],
      "contradictingEvidence": ["evidence 1", ...],
      "assumptions": ["assumption 1", ...]
    },
    ...
  ]
}`,
    temperature: config.parameters.temperature,
    maxTokens: 3072,
  });

  const parsed = parseJSON<{ hypotheses: Hypothesis[] }>(response.content);
  return parsed.hypotheses;
}

async function evaluateEvidence(
  problem: Problem,
  hypotheses: Hypothesis[],
  config: IntelligenceAnalysisConfig,
  session: Session
): Promise<EvidenceEvaluation[]> {
  const hypothesesText = hypotheses.map((h) => `${h.id}: ${h.hypothesis}`).join('\n');

  const response = await session.step({
    name: 'evaluator-evidence',
    prompt: `Evaluate each piece of evidence for its discriminating power.

HYPOTHESES:
${hypothesesText}

EVIDENCE:
${problem.evidence.map((e, i) => `E${i + 1}: ${e}`).join('\n')}

For each piece of evidence, assess in JSON:
{
  "evaluations": [
    {
      "evidence": "evidence text",
      "discriminatingPower": <0-10>,
      "supportedHypotheses": ["h1", ...],
      "contradictedHypotheses": ["h2", ...],
      "reliability": <0-10>,
      "analysis": "why this evidence matters"
    },
    ...
  ]
}

Focus on evidence that helps distinguish between hypotheses.`,
    temperature: config.parameters.temperature,
    maxTokens: 2048,
  });

  const parsed = parseJSON<{ evaluations: EvidenceEvaluation[] }>(response.content);
  return parsed.evaluations;
}

async function synthesizeAnalysis(
  problem: Problem,
  hypotheses: Hypothesis[],
  evidenceEvaluation: EvidenceEvaluation[],
  config: IntelligenceAnalysisConfig,
  session: Session
): Promise<Analysis> {
  const hypothesesText = hypotheses
    .map(
      (h) =>
        `${h.id}: ${h.hypothesis}\nPlausibility: ${h.plausibility}\nSupporting: ${h.supportingEvidence.join(', ')}\nContradicting: ${h.contradictingEvidence.join(', ')}`
    )
    .join('\n\n');

  const evidenceText = evidenceEvaluation
    .map(
      (e) =>
        `Evidence: ${e.evidence}\nDiscriminating Power: ${e.discriminatingPower}\nSupports: ${e.supportedHypotheses.join(', ')}\nContradicts: ${e.contradictedHypotheses.join(', ')}`
    )
    .join('\n\n');

  const response = await session.step({
    name: 'evaluator-synthesis',
    prompt: `Synthesize the analysis and rank hypotheses by likelihood.

PROBLEM: ${problem.question}

HYPOTHESES:
${hypothesesText}

EVIDENCE EVALUATION:
${evidenceText}

Provide final analysis in JSON:
{
  "rankedHypotheses": [
    {
      "hypothesisId": "...",
      "hypothesis": "...",
      "likelihood": <0-100>,
      "confidence": "low" | "medium" | "high",
      "rationale": "why this ranking"
    },
    ...
  ],
  "mostLikely": "hypothesis statement",
  "discriminatingEvidence": ["key evidence 1", ...],
  "remainingUncertainties": ["uncertainty 1", ...],
  "recommendations": ["next step 1", ...],
  "summary": "overall analysis summary"
}

Rank from most to least likely. Identify which evidence was most discriminating.`,
    temperature: config.parameters.temperature,
    maxTokens: 2048,
  });

  return parseJSON<Analysis>(response.content);
}

/** Backward-compatible entry returning the bare result. */
export async function run(
  input: Problem | { content: string },
  flags: RunFlags = {},
  sinks: EventSink[] = []
): Promise<IntelligenceAnalysisResult> {
  const { result, auditLog } = await intelligenceAnalysis(input, flags, sinks);
  result.metadata.costUSD = auditLog.metadata.totalCost;
  return result;
}

export * from './types';
