/**
 * Differential Diagnosis Framework — engine port.
 *
 * Flow: differential generation → diagnostic test recommendation → specialist
 * synthesis. All provider/model/audit/logging concerns owned by the engine.
 */
import type { EventSink } from '@core/engine';
import { defineFramework, Session } from '@core/engine';
import { parseJSON } from '@core/orchestrator';
import type { RunFlags } from '@core/types';
import type {
  Symptoms,
  Diagnosis,
  DiagnosticTest,
  FinalDiagnosis,
  DifferentialDiagnosisConfig,
  DifferentialDiagnosisResult,
} from './types';
import { DEFAULT_CONFIG } from './types';

export const differentialDiagnosis = defineFramework<
  Symptoms | { content: string },
  DifferentialDiagnosisResult
>({
  name: 'differential-diagnosis',
  description:
    'Systematic elimination and diagnostic reasoning: differentials, tests, final diagnosis',
  normalize(raw) {
    if (typeof raw === 'object' && raw !== null && 'presenting' in raw) {
      return raw as Symptoms;
    }
    const content = (raw as { content?: string })?.content ?? '';
    return { presenting: content, symptoms: [] };
  },
  async run(rawInput, session) {
    const symptoms = rawInput as Symptoms;
    const config: DifferentialDiagnosisConfig = {
      ...DEFAULT_CONFIG,
      ...(session.flags.config as Partial<DifferentialDiagnosisConfig> | undefined),
    };
    const explicitModel = session.models.override;
    if (explicitModel) {
      config.models = {
        diagnostician: explicitModel,
        specialist: explicitModel,
      };
    }

    // Phase 1: Generate differential diagnoses
    session.phase(
      'Differential Generation',
      `up to ${config.parameters.maxDifferentials} diagnoses`
    );
    const differentials = await generateDifferentials(symptoms, config, session);

    // Phase 2: Recommend diagnostic tests
    session.phase('Diagnostic Tests');
    const recommendedTests = await recommendTests(symptoms, differentials, config, session);

    // Phase 3: Synthesize final diagnosis
    session.phase('Final Diagnosis');
    const finalDiagnosis = await synthesizeDiagnosis(
      symptoms,
      differentials,
      recommendedTests,
      config,
      session
    );

    session.note(
      `Differentials: ${differentials.length} | Most likely: ${finalDiagnosis.mostLikely} | Confidence: ${finalDiagnosis.confidence}`
    );

    return {
      symptoms,
      differentials,
      recommendedTests,
      finalDiagnosis,
      metadata: {
        timestamp: new Date().toISOString(),
        config,
        decision: 'unclear',
      },
    };
  },
});

async function generateDifferentials(
  symptoms: Symptoms,
  config: DifferentialDiagnosisConfig,
  session: Session
): Promise<Diagnosis[]> {
  const response = await session.step({
    name: 'diagnostician-differential',
    prompt: `You are a diagnostician using systematic differential diagnosis.

PRESENTING PROBLEM:
${symptoms.presenting}

SYMPTOMS:
${symptoms.symptoms.map((s, i) => `${i + 1}. ${s}`).join('\n')}

${symptoms.history ? `HISTORY:\n${symptoms.history}\n` : ''}
${symptoms.context ? `CONTEXT:\n${symptoms.context}\n` : ''}

Generate up to ${config.parameters.maxDifferentials} differential diagnoses, ordered by likelihood. Include both common and serious conditions. Return in JSON:
{
  "diagnoses": [
    {
      "diagnosis": "condition name",
      "likelihood": <0-100>,
      "supportingSymptoms": ["symptom 1", ...],
      "contradictingSymptoms": ["symptom 1", ...],
      "testingStrategy": ["test 1", ...],
      "reasoning": "why this is in the differential"
    },
    ...
  ]
}`,
    temperature: config.parameters.temperature,
    maxTokens: 3072,
  });

  const parsed = parseJSON<{ diagnoses: Diagnosis[] }>(response.content);
  return parsed.diagnoses;
}

async function recommendTests(
  symptoms: Symptoms,
  differentials: Diagnosis[],
  config: DifferentialDiagnosisConfig,
  session: Session
): Promise<DiagnosticTest[]> {
  const differentialsText = differentials
    .map((d) => `${d.diagnosis} (${d.likelihood}%): ${d.reasoning}`)
    .join('\n');

  const response = await session.step({
    name: 'diagnostician-tests',
    prompt: `Recommend diagnostic tests to distinguish between these differentials.

PRESENTING: ${symptoms.presenting}

DIFFERENTIALS:
${differentialsText}

Recommend tests with high discriminating power in JSON:
{
  "tests": [
    {
      "test": "test name",
      "purpose": "what it distinguishes",
      "expectedFindings": {"diagnosis1": "finding", "diagnosis2": "finding", ...},
      "discriminatingPower": <0-10>
    },
    ...
  ]
}

Prioritize tests that help rule in/out multiple differentials.`,
    temperature: config.parameters.temperature,
    maxTokens: 2048,
  });

  const parsed = parseJSON<{ tests: DiagnosticTest[] }>(response.content);
  return parsed.tests;
}

async function synthesizeDiagnosis(
  symptoms: Symptoms,
  differentials: Diagnosis[],
  tests: DiagnosticTest[],
  config: DifferentialDiagnosisConfig,
  session: Session
): Promise<FinalDiagnosis> {
  const differentialsText = differentials
    .map(
      (d) =>
        `${d.diagnosis} (${d.likelihood}%): Supporting: ${d.supportingSymptoms.join(', ')} | Contradicting: ${d.contradictingSymptoms.join(', ')}`
    )
    .join('\n');

  const testsText = tests
    .map((t) => `${t.test}: ${t.purpose} (discriminating power: ${t.discriminatingPower})`)
    .join('\n');

  const response = await session.step({
    name: 'specialist-synthesis',
    prompt: `Synthesize the diagnostic workup.

PRESENTING: ${symptoms.presenting}

DIFFERENTIALS:
${differentialsText}

RECOMMENDED TESTS:
${testsText}

Provide final assessment in JSON:
{
  "mostLikely": "most likely diagnosis",
  "confidence": "low" | "medium" | "high" | "definitive",
  "differentials": [
    {"diagnosis": "...", "likelihood": <0-100>, "reasoning": "..."},
    ...
  ],
  "criticalTests": ["test 1", ...],
  "treatmentRecommendations": ["recommendation 1", ...],
  "monitoringPlan": ["monitor 1", ...]
}`,
    temperature: config.parameters.temperature,
    maxTokens: 2048,
  });

  return parseJSON<FinalDiagnosis>(response.content);
}

/** Backward-compatible entry returning the bare result. */
export async function run(
  input: Symptoms | { content: string },
  flags: RunFlags = {},
  sinks: EventSink[] = []
): Promise<DifferentialDiagnosisResult> {
  const { result, auditLog } = await differentialDiagnosis(input, flags, sinks);
  result.metadata.costUSD = auditLog.metadata.totalCost;
  return result;
}

export * from './types';
