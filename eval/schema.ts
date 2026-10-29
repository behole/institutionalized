/**
 * Eval case schema: ground-truth + rubric definitions for framework-vs-baseline
 * quality measurement.
 */
import { z } from 'zod';

/**
 * Binary ground truth: the case has a known-correct decision.
 * Framework and baseline are scored on matching it.
 */
export const groundTruthSchema = z.object({
  /** 'binary' = known correct decision; 'rubric' = LLM-judged criteria */
  kind: z.enum(['binary', 'rubric']),
  /** For binary cases: the defensible decision, e.g. 'delay' | 'launch' */
  correctDecision: z.string().optional(),
  /** For rubric cases: weighted criteria the output must satisfy */
  criteria: z
    .array(
      z.object({
        name: z.string(),
        description: z.string(),
        weight: z.number().min(0).max(1),
      })
    )
    .optional(),
});

export const evalCaseSchema = z.object({
  name: z.string(),
  description: z.string(),
  /** Per-framework input fragments, keyed by framework name (camelCase). */
  inputs: z.record(z.string(), z.unknown()),
  groundTruth: groundTruthSchema,
});

export type EvalCase = z.infer<typeof evalCaseSchema>;
export type GroundTruth = z.infer<typeof groundTruthSchema>;

/**
 * A single judged comparison: framework output vs single-call baseline.
 */
export interface EvalComparison {
  caseName: string;
  framework: string;
  baselineScore: number; // 0..1
  frameworkScore: number; // 0..1
  baselineCost: number;
  frameworkCost: number;
  baselineDurationMs: number;
  frameworkDurationMs: number;
  judgeNotes: string;
}

export interface EvalSummary {
  framework: string;
  model: string;
  cases: number;
  meanBaseline: number;
  meanFramework: number;
  lift: number; // frameworkScore - baselineScore
  meanBaselineCost: number;
  meanFrameworkCost: number;
  comparisons: EvalComparison[];
}
