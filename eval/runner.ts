/**
 * Runner: executes framework vs single-call baseline on eval cases and judges
 * both outputs. Binary cases score on matching ground truth; rubric cases are
 * scored by an LLM judge against weighted criteria.
 */
import type { EvalCase, EvalComparison, EvalSummary } from './schema';
import { judgeResponseSchema } from './judge';
import { createProvider } from '../core/providers';

export interface EvalOptions {
  provider: 'anthropic' | 'openai' | 'openrouter';
  model: string;
  /** Framework entry functions: framework name → run(input, flags) */
  frameworks: Record<string, (input: unknown, flags?: Record<string, unknown>) => Promise<unknown>>;
  /** Max characters of output shown to the judge. */
  maxOutputChars?: number;
}

/** Map framework name → per-framework input key used in case files. */
const INPUT_KEY: Record<string, string> = {
  courtroom: 'courtroom',
  'peer-review': 'peerReview',
  'red-blue': 'redBlueTeam',
  'pre-mortem': 'preMortem',
};

/** Single-call baseline prompts, per framework. Same input, one shot, no structure. */
const BASELINE_PROMPTS: Record<string, (input: unknown) => string> = {
  courtroom: (input) => {
    const i = input as { question?: string; context?: string[] };
    return `You are deciding: ${i.question}
Context:
${i.context?.map((c) => `- ${c}`).join('\n')}

Give your decision (proceed or don't proceed), your reasoning, and your confidence (0-1).`;
  },
  'peer-review': (input) => {
    const i = input as { work?: string };
    return `Review the following work submission. Identify strengths, weaknesses, and give a final decision (accept/revise/reject) with reasoning referencing specific reviewer-style observations.

${i.work}`;
  },
  'red-blue': (input) => {
    const i = input as { system?: string; context?: string[] };
    return `Analyze this system for risks: describe how it works, attack it — find vulnerabilities and attack scenarios — then give an overall risk assessment.

System: ${i.system}
${i.context?.map((c) => `- ${c}`).join('\n') ?? ''}`;
  },
  'pre-mortem': (input) => {
    const i = input as { description?: string; context?: string[] };
    return `Imagine this plan has already failed spectacularly. List the most likely failure scenarios and the top risks with mitigations.

Plan: ${i.description}
Context: ${i.context?.join('; ')}`;
  },
};

/** Every engine-ported framework writes a normalized decision into result.metadata.decision. */
export function extractNormalizedDecision(result: unknown): string {
  const decision = (result as { metadata?: { decision?: string } })?.metadata?.decision;
  return decision ?? 'unknown';
}

export function extractBaselineDecision(content: string): string {
  const lower = content.toLowerCase();
  const noMatch =
    /\b(delay|postpone|hold off|don'?t launch|do not launch|don'?t proceed|do not proceed|reject|not approved|no-go)\b/.test(
      lower
    );
  const yesMatch = /\b(launch now|approve|go ahead|proceed|ship it|green ?light)\b/.test(lower);
  if (noMatch) {
    return 'delay';
  }
  if (yesMatch) {
    return 'launch';
  }
  return 'unclear';
}

function extractCost(result: unknown): number {
  return (result as { metadata?: { costUSD?: number } })?.metadata?.costUSD ?? 0;
}

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n)}…` : s;
}

function apiKeyFor(provider: string): string {
  const key = process.env[provider.toUpperCase() + '_API_KEY'];
  if (!key) {
    throw new Error(`Missing ${provider.toUpperCase()}_API_KEY for eval`);
  }
  return key;
}

export async function runEvalCase(
  evalCase: EvalCase,
  frameworkName: string,
  runFn: (input: unknown, flags?: Record<string, unknown>) => Promise<unknown>,
  opts: EvalOptions
): Promise<EvalComparison> {
  const inputKey = INPUT_KEY[frameworkName] ?? frameworkName;
  const fwInput = evalCase.inputs[inputKey] ?? evalCase.inputs;

  // 1. Run the framework through the engine
  const fwStart = Date.now();
  const fwResult = await runFn(fwInput, { provider: opts.provider, model: opts.model });
  const fwDurationMs = Date.now() - fwStart;
  const fwCost = extractCost(fwResult);

  // 2. Run the single-call baseline
  const provider = createProvider({ name: opts.provider, apiKey: apiKeyFor(opts.provider) });
  const baselineStart = Date.now();
  const baselineResponse = await provider.call({
    model: opts.model,
    messages: [{ role: 'user', content: BASELINE_PROMPTS[frameworkName](fwInput) }],
    temperature: 0.7,
    maxTokens: 2048,
  });
  const baselineDurationMs = Date.now() - baselineStart;
  const baselineCost = provider.calculateCost(baselineResponse.usage, opts.model);

  // 3. Score: binary ground truth or rubric judge
  if (evalCase.groundTruth.kind === 'binary' && evalCase.groundTruth.correctDecision) {
    const gt = evalCase.groundTruth.correctDecision;
    const fwDecision = extractNormalizedDecision(fwResult);
    const baselineDecision = extractBaselineDecision(baselineResponse.content);
    return {
      caseName: evalCase.name,
      framework: frameworkName,
      baselineScore: baselineDecision === gt ? 1 : 0,
      frameworkScore: fwDecision === gt ? 1 : 0,
      baselineCost,
      frameworkCost: fwCost,
      baselineDurationMs,
      frameworkDurationMs: fwDurationMs,
      judgeNotes: `binary ground truth: ${gt}; framework=${fwDecision}, baseline=${baselineDecision}`,
    };
  }

  const maxChars = opts.maxOutputChars ?? 8000;
  const judged = await judgeOutputs({
    criteria: evalCase.groundTruth.criteria ?? [],
    frameworkOutput: truncate(JSON.stringify(fwResult, null, 2), maxChars),
    baselineOutput: truncate(baselineResponse.content, maxChars),
    provider: opts.provider,
    model: opts.model,
  });
  return {
    caseName: evalCase.name,
    framework: frameworkName,
    baselineScore: judged.baselineScore,
    frameworkScore: judged.frameworkScore,
    baselineCost,
    frameworkCost: fwCost,
    baselineDurationMs,
    frameworkDurationMs: fwDurationMs,
    judgeNotes: judged.judgeNotes,
  };
}

/** Blind, order-randomized LLM judge scoring both outputs against weighted criteria. */
async function judgeOutputs(args: {
  criteria: Array<{ name: string; description: string; weight: number }>;
  frameworkOutput: string;
  baselineOutput: string;
  provider: 'anthropic' | 'openai' | 'openrouter';
  model: string;
}): Promise<{ baselineScore: number; frameworkScore: number; judgeNotes: string }> {
  const fwIsA = Math.random() >= 0.5;
  const a = fwIsA ? args.frameworkOutput : args.baselineOutput;
  const b = fwIsA ? args.baselineOutput : args.frameworkOutput;

  const criteriaText = args.criteria
    .map((c) => `- ${c.name} (weight ${c.weight}): ${c.description}`)
    .join('\n');

  const provider = createProvider({ name: args.provider, apiKey: apiKeyFor(args.provider) });
  const response = await provider.call({
    model: args.model,
    messages: [
      {
        role: 'user',
        content: `You are evaluating two candidate outputs (A and B) for the same decision task. Score each against these weighted criteria:

${criteriaText}

CANDIDATE A:
${a}

CANDIDATE B:
${b}

Score each candidate 0.0-1.0 (weighted across criteria). Judge substance, specificity, and actionability — not length or formatting. Respond ONLY with JSON:
{"scores":[{"candidate":"A","score":0.0,"rationale":"one sentence"},{"candidate":"B","score":0.0,"rationale":"one sentence"}]}`,
      },
    ],
    temperature: 0.0,
    maxTokens: 1024,
  });

  const parsed = judgeResponseSchema.parse(JSON.parse(extractJson(response.content)));
  const aScore = parsed.scores.find((s) => s.candidate === 'A')?.score ?? 0;
  const bScore = parsed.scores.find((s) => s.candidate === 'B')?.score ?? 0;
  return {
    frameworkScore: fwIsA ? aScore : bScore,
    baselineScore: fwIsA ? bScore : aScore,
    judgeNotes: parsed.scores.map((s) => `${s.candidate}: ${s.rationale}`).join(' | '),
  };
}

/** Extract the first JSON object from an LLM response (handles code fences). */
function extractJson(text: string): string {
  const fence = text.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
  if (fence) {
    return fence[1];
  }
  const bare = text.match(/\{[\s\S]*\}/);
  if (bare) {
    return bare[0];
  }
  throw new Error(`No JSON in judge response: ${text.slice(0, 200)}`);
}

export function summarize(
  comparisons: EvalComparison[],
  framework: string,
  model: string
): EvalSummary {
  const n = comparisons.length || 1;
  const meanBaseline = comparisons.reduce((s, c) => s + c.baselineScore, 0) / n;
  const meanFramework = comparisons.reduce((s, c) => s + c.frameworkScore, 0) / n;
  return {
    framework,
    model,
    cases: comparisons.length,
    meanBaseline,
    meanFramework,
    lift: meanFramework - meanBaseline,
    meanBaselineCost: comparisons.reduce((s, c) => s + c.baselineCost, 0) / n,
    meanFrameworkCost: comparisons.reduce((s, c) => s + c.frameworkCost, 0) / n,
    comparisons,
  };
}
