/**
 * Eval CLI: run framework-vs-baseline comparisons.
 *
 * Usage:
 *   bun eval/run.ts --frameworks courtroom,pre-mortem --cases product-launch --model openai/gpt-4o-mini
 *   bun eval/run.ts --all
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { runEvalCase, summarize } from './runner';
import type { EvalCase, EvalSummary } from './schema';
import { evalCaseSchema } from './schema';
import { run as runCourtroom } from '../frameworks/courtroom';
import { run as runPeerReview } from '../frameworks/peer-review';
import { run as runRedBlue } from '../frameworks/red-blue';
import { run as runPreMortem } from '../frameworks/pre-mortem';

const FRAMEWORK_RUNNERS: Record<
  string,
  (input: unknown, flags?: Record<string, unknown>) => Promise<unknown>
> = {
  courtroom: runCourtroom,
  'peer-review': runPeerReview,
  'red-blue': runRedBlue,
  'pre-mortem': runPreMortem,
};

const CASES_DIR = join(import.meta.dir, 'cases');

function parseArgs(): { frameworks: string[]; cases: string[]; model: string; provider: string } {
  const args = process.argv.slice(2);
  const get = (flag: string, fallback?: string): string | undefined => {
    const i = args.indexOf(flag);
    return i >= 0 ? args[i + 1] : fallback;
  };
  const frameworks =
    get('--frameworks', get('--all', '') ? Object.keys(FRAMEWORK_RUNNERS).join(',') : '') ?? '';
  const cases = get('--cases', '') ?? '';
  const model = get('--model', 'openai/gpt-4o-mini')!;
  const provider = get('--provider', model.startsWith('openai/') ? 'openrouter' : 'anthropic')!;
  return {
    frameworks: frameworks.split(',').filter(Boolean),
    cases: cases.split(',').filter(Boolean),
    model,
    provider,
  } as { frameworks: string[]; cases: string[]; model: string; provider: string };
}

function loadCase(name: string): EvalCase {
  const raw = JSON.parse(readFileSync(join(CASES_DIR, `${name}.json`), 'utf8'));
  // Seed case files store per-framework inputs at the top level;
  // nest them under `inputs` for the schema.
  const { name: _name, description, groundTruth, ...rest } = raw;
  const fixed = { name: _name, description, inputs: rest, groundTruth };
  const parsed = evalCaseSchema.safeParse(fixed);
  if (!parsed.success) {
    throw new Error(
      `Case ${name} invalid: ${parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`
    );
  }
  return parsed.data;
}

async function main(): Promise<void> {
  const { frameworks, cases, model, provider } = parseArgs();
  if (frameworks.length === 0 || cases.length === 0) {
    console.error(
      'Usage: bun eval/run.ts --frameworks courtroom,pre-mortem --cases product-launch [--model ...] [--provider ...]'
    );
    process.exit(1);
  }

  const INPUT_KEYS: Record<string, string> = {
    courtroom: 'courtroom',
    'peer-review': 'peerReview',
    'red-blue': 'redBlueTeam',
    'pre-mortem': 'preMortem',
  };

  const results: EvalSummary[] = [];
  for (const framework of frameworks) {
    const runFn = FRAMEWORK_RUNNERS[framework];
    if (!runFn) {
      throw new Error(`Unknown framework: ${framework}`);
    }
    const comparisons = [];
    for (const caseName of cases) {
      const evalCase = loadCase(caseName);
      const inputKey = INPUT_KEYS[framework] ?? framework;
      if (evalCase.inputs[inputKey] === undefined) {
        console.log(`SKIP ${framework} × ${caseName}: no input fragment`);
        continue;
      }
      console.log(`RUN ${framework} × ${caseName} ...`);
      try {
        comparisons.push(
          await runEvalCase(evalCase, framework, runFn, { provider, model } as never)
        );
      } catch (error) {
        console.error(`  FAILED: ${(error as Error).message.slice(0, 200)}`);
      }
    }
    if (comparisons.length > 0) {
      const summary = summarize(comparisons, framework, model);
      results.push(summary);
      console.log(
        `\n=== ${framework} ===\nbaseline: ${summary.meanBaseline.toFixed(2)} | framework: ${summary.meanFramework.toFixed(2)} | lift: ${summary.lift >= 0 ? '+' : ''}${summary.lift.toFixed(2)} | cost: $${summary.meanBaselineCost.toFixed(4)} vs $${summary.meanFrameworkCost.toFixed(4)}`
      );
    }
  }

  const outDir = join(import.meta.dir, 'results');
  mkdirSync(outDir, { recursive: true });
  const outFile = join(
    outDir,
    `${provider}-${model.replace(/[^a-z0-9]/gi, '_')}-${Date.now()}.json`
  );
  writeFileSync(outFile, JSON.stringify(results, null, 2));
  console.log(`\nResults written: ${outFile}`);
}

main();
