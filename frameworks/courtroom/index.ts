/**
 * Courtroom Framework — engine port.
 *
 * Flow: prosecution → defense → parallel jury deliberation → vote tally →
 * conditional judge verdict. Prompt/parse content lives in the role files,
 * untouched. All provider/audit/logging concerns are owned by the engine.
 */
import type { EventSink } from '@core/engine';
import { defineFramework } from '@core/engine';
import type { RunFlags } from '@core/types';
import type {
  Case,
  CourtroomConfig,
  CourtroomResult,
  Defense,
  Prosecution,
  JuryVerdict,
  Verdict,
} from './types';
import { DEFAULT_CONFIG } from './types';
import { buildProsecutionPrompt, parseProsecutionResponse } from './prosecutor';
import { buildDefensePrompt, parseDefenseResponse } from './defense';
import { buildJurorPrompt, parseJurorVerdict } from './jury';
import { buildVerdictPrompt, parseVerdictResponse } from './judge';

export const courtroom = defineFramework<Case | { content: string }, CourtroomResult>({
  name: 'courtroom',
  description:
    'Adversarial evaluation for binary decisions: prosecution, defense, jury vote, judge verdict',
  normalize(raw) {
    if (typeof raw === 'object' && raw !== null && 'question' in raw) {
      return raw as Case;
    }
    const content = (raw as { content?: string })?.content ?? '';
    return { question: 'Should this be approved?', context: [content] };
  },
  async run(caseInput, session) {
    const config: CourtroomConfig = {
      ...DEFAULT_CONFIG,
      ...(session.flags.config as Partial<CourtroomConfig> | undefined),
    };
    // Engine-level model override wins over legacy per-role config models.
    // Map registry roles back to this framework's legacy role names.
    const explicitModel = session.models.override;
    if (explicitModel) {
      config.models = {
        prosecutor: explicitModel,
        defense: explicitModel,
        jury: explicitModel,
        judge: explicitModel,
      };
    }
    const caseData = caseInput as Case;

    // Phase 1: Prosecution builds the case
    session.phase('Prosecution');
    const prosecutionStep = await session.step({
      name: 'prosecutor',
      prompt: buildProsecutionPrompt(caseData, config),
    });
    const prosecution = parseProsecutionResponse(
      prosecutionStep.content,
      caseData.context.join('\n'),
      config
    );

    // Phase 2: Defense mounts rebuttal
    session.phase('Defense');
    const defenseStep = await session.step({
      name: 'defense',
      prompt: buildDefensePrompt(caseData, prosecution, config),
    });
    const defense = parseDefenseResponse(defenseStep.content, prosecution);

    // Phase 3: Jury deliberates in parallel
    session.phase('Jury Deliberation', `${config.parameters.jurySize} jurors in parallel`);
    const jurorSteps = await session.parallel(
      Array.from({ length: config.parameters.jurySize }, (_, i) => ({
        name: `juror-${i + 1}`,
        prompt: buildJurorPrompt(caseData, prosecution, defense, config, i + 1),
        temperature: config.parameters.juryTemperature,
      }))
    );
    const jurors = jurorSteps.map((s, i) => parseJurorVerdict(s.content, i + 1));

    const guiltyCount = jurors.filter((j) => j.vote === 'guilty').length;
    const notGuiltyCount = jurors.filter((j) => j.vote === 'not_guilty').length;
    const abstainCount = jurors.length - guiltyCount - notGuiltyCount;
    const proceedsToJudge = guiltyCount >= config.parameters.juryThreshold;

    const jury: JuryVerdict = {
      jurors,
      guiltyCount,
      notGuiltyCount,
      abstainCount,
      proceedsToJudge,
    };
    session.note(
      `Votes: ${guiltyCount} guilty, ${notGuiltyCount} not guilty, ${abstainCount} abstain — ` +
        (proceedsToJudge ? 'proceeds to judge' : 'case dismissed')
    );

    // Phase 4: Judge verdict (conditional on jury threshold)
    let verdict: Verdict;
    if (proceedsToJudge) {
      session.phase("Judge's Verdict");
      const verdictStep = await session.step({
        name: 'judge',
        prompt: buildVerdictPrompt(caseData, prosecution, defense, jury, config),
        temperature: config.parameters.judgeTemperature,
        maxTokens: 4096,
      });
      verdict = parseVerdictResponse(verdictStep.content);
    } else {
      verdict = {
        decision: 'dismissed' as const,
        reasoning: `Jury did not reach threshold (${jury.guiltyCount}/${config.parameters.juryThreshold} guilty votes). Case dismissed.`,
        rationale: 'Jury threshold not met',
        confidence: jury.guiltyCount / config.parameters.jurySize,
      };
    }

    return {
      case: caseData,
      prosecution,
      defense,
      jury,
      verdict,
      metadata: {
        timestamp: new Date().toISOString(),
        duration: 0, // engine records duration; audit log carries timings
        costUSD: 0, // replaced from audit log below
        decision: verdict.decision === 'not_guilty' ? 'approve' : 'delay',
        modelUsage: {
          prosecutor: 'registry:reasoning',
          defense: 'registry:reasoning',
          jury: 'registry:reasoning',
          judge: 'registry:judge',
        },
      },
    };
  },
});

/**
 * Backward-compatible entry: runs the framework, patches cost/duration from
 * the audit log, returns the bare result (legacy contract).
 */
export async function run(
  input: Case | { content: string },
  flags: RunFlags = {},
  sinks: EventSink[] = []
): Promise<CourtroomResult> {
  const { result, auditLog, session } = await courtroom(input, flags, sinks);
  result.metadata.costUSD = auditLog.metadata.totalCost;
  const runEnd = [...session.events].reverse().find((e) => e.type === 'run-end');
  if (runEnd && runEnd.type === 'run-end') {
    result.metadata.duration = runEnd.durationMs;
  }
  return result;
}

export { runCourtroom } from './orchestrator';
export * from './types';
