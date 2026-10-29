/**
 * Pipelines: framework chains where each stage's output feeds the next.
 *
 * A pipeline is a first-class artifact, not ad-hoc glue: stages run in order,
 * adapters map the previous stage's result into the next stage's input shape,
 * and every underlying framework event is tagged with its stage so consumers
 * (CLI, site dashboards, skill streams) can render the whole deliberation.
 */
import type { EngineEvent, EventSink } from './events';
import type { RunFlags } from '../types';

/** Events the pipeline layer adds around the per-framework EngineEvents. */
export type PipelineEvent =
  | { type: 'pipeline-start'; pipeline: string; stages: string[]; issue: string }
  | {
      type: 'stage-start';
      pipeline: string;
      stageIndex: number;
      framework: string;
      label: string;
      input: unknown;
    }
  | {
      type: 'stage-end';
      pipeline: string;
      stageIndex: number;
      framework: string;
      decision: string;
      cost: number;
      durationMs: number;
    }
  | {
      type: 'pipeline-end';
      pipeline: string;
      decision: string;
      stageDecisions: string[];
      cost: number;
      durationMs: number;
      summary: string;
    };

export type PipelineSink = (event: PipelineEvent | (EngineEvent & { stageIndex: number })) => void;

/** A framework stage function: the backward-compatible run() wrapper (patches costUSD). */
export type FrameworkStageRunner = (
  raw: unknown,
  flags?: RunFlags,
  sinks?: EventSink[]
) => Promise<unknown>;

/** Maps the previous stage's result into this stage's input shape. */
export type StageAdapter = (prev: unknown, issue: string) => unknown;

export interface PipelineStage {
  framework: string;
  label: string;
  adapter: StageAdapter;
  /** Per-stage parameter slimming (small agent counts for interactive use). */
  config?: Record<string, unknown>;
  /** Advisory stages (AAR, retrospectives) don't override the pipeline verdict. Default: true. */
  decisive?: boolean;
}

export interface PipelineDefinition {
  name: string;
  label: string;
  description: string;
  /** Which issue keywords route here (client-side suggestion + server fallback). */
  keywords: string[];
  stages: PipelineStage[];
}

export interface PipelineRunOutput {
  stageResults: unknown[];
  stageDecisions: string[];
  finalDecision: string;
  totalCost: number;
  durationMs: number;
  events: (PipelineEvent | (EngineEvent & { stageIndex: number }))[];
}

/** Normalize a framework result's metadata.decision (engine contract). */
function decisionOf(result: unknown): string {
  return (result as { metadata?: { decision?: string } })?.metadata?.decision ?? 'unclear';
}

function costOf(result: unknown): number {
  return (result as { metadata?: { costUSD?: number } })?.metadata?.costUSD ?? 0;
}

/**
 * Run a pipeline: stages sequentially, each adapter mapping the previous
 * result. All framework events are re-emitted tagged with their stageIndex.
 */
export async function runPipeline(
  def: PipelineDefinition,
  issue: string,
  runners: Record<string, FrameworkStageRunner>,
  flags: RunFlags = {},
  sinks: PipelineSink[] = []
): Promise<PipelineRunOutput> {
  const startTime = Date.now();
  const events: (PipelineEvent | (EngineEvent & { stageIndex: number }))[] = [];
  const stageResults: unknown[] = [];
  const stageDecisions: string[] = [];
  let totalCost = 0;

  const emit = (event: PipelineEvent | (EngineEvent & { stageIndex: number })) => {
    events.push(event);
    for (const sink of sinks) {
      sink(event);
    }
  };

  emit({
    type: 'pipeline-start',
    pipeline: def.name,
    stages: def.stages.map((s) => s.label),
    issue,
  });

  for (let i = 0; i < def.stages.length; i++) {
    const stage = def.stages[i];
    const runner = runners[stage.framework];
    if (!runner) {
      throw new Error(`Pipeline references unknown framework: ${stage.framework}`);
    }

    const prev = stageResults[i - 1];
    const input = i === 0 ? stage.adapter(undefined, issue) : stage.adapter(prev, issue);

    emit({
      type: 'stage-start',
      pipeline: def.name,
      stageIndex: i,
      framework: stage.framework,
      label: stage.label,
      input,
    });

    const stageStart = Date.now();
    const taggedSink: EventSink = (e) =>
      emit({ ...e, stageIndex: i } as EngineEvent & { stageIndex: number });

    try {
      const result = await runner(
        input,
        { ...flags, ...(stage.config ? { config: stage.config } : {}) },
        [taggedSink]
      );
      stageResults.push(result);
      const decision = decisionOf(result);
      stageDecisions.push(decision);
      totalCost += costOf(result);
      emit({
        type: 'stage-end',
        pipeline: def.name,
        stageIndex: i,
        framework: stage.framework,
        decision,
        cost: costOf(result),
        durationMs: Date.now() - stageStart,
      });
    } catch (error) {
      // A failed stage ends the pipeline with what we have; downstream stages
      // can't proceed without their upstream input.
      const cause =
        error instanceof AggregateError
          ? error.errors.map((e) => (e instanceof Error ? e.message : String(e))).join(' | ')
          : error instanceof Error
            ? error.message
            : String(error);
      emit({
        type: 'pipeline-end',
        pipeline: def.name,
        decision: 'unclear',
        stageDecisions,
        cost: totalCost,
        durationMs: Date.now() - startTime,
        summary: `Stage ${i + 1} (${stage.label}) failed: ${cause.slice(0, 300)}`,
      });
      throw error;
    }
  }

  // The pipeline verdict is the last DECISIVE stage's decision; advisory
  // stages (AAR, retrospectives) inform but don't override.
  let finalDecision = 'unclear';
  for (let i = 0; i < def.stages.length; i++) {
    if (def.stages[i].decisive !== false && stageDecisions[i] !== undefined) {
      finalDecision = stageDecisions[i];
    }
  }
  emit({
    type: 'pipeline-end',
    pipeline: def.name,
    decision: finalDecision,
    stageDecisions,
    cost: totalCost,
    durationMs: Date.now() - startTime,
    summary: summarizePipeline(def, stageResults, issue),
  });

  return {
    stageResults,
    stageDecisions,
    finalDecision,
    totalCost,
    durationMs: Date.now() - startTime,
    events,
  };
}

/** One-sentence pipeline summary from the final stage's result. */
function summarizePipeline(
  def: PipelineDefinition,
  stageResults: unknown[],
  issue: string
): string {
  const last = stageResults[stageResults.length - 1] as Record<string, unknown> | undefined;
  if (!last) {
    return 'No stages produced a result.';
  }

  // Common summary fields across frameworks, in preference order
  for (const path of [
    'verdict.rationale',
    'decision.rationale',
    'assessment.recommendation',
    'observerReport.overallAssessment',
    'learnings.keyInsights.0',
  ]) {
    let cursor: unknown = last;
    for (const key of path.split('.')) {
      cursor = (cursor as Record<string, unknown>)?.[key];
    }
    if (typeof cursor === 'string' && cursor.length > 0) {
      return `${def.label} on "${issue.slice(0, 80)}": ${cursor.slice(0, 200)}`;
    }
  }
  return `${def.label} completed on "${issue.slice(0, 80)}".`;
}
