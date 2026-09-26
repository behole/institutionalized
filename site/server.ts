/**
 * Demo site server: LED dashboard + live pipeline deliberation streaming.
 *
 * Bun.serve: static files from site/, POST /api/run starts a pipeline,
 * GET /api/stream/:id streams the run's events + generated "thinking
 * moments" over SSE.
 *
 * Provider: OpenCode go free-tier models via env:
 *   OPENAI_BASE_URL, OPENAI_API_KEY, OPENAI_EXTRA_HEADERS
 */
import { runPipeline, routePipeline, getPipeline, PIPELINES } from '../core/engine';
import type { PipelineDefinition, EventSink } from '../core/engine';
import { run as runCourtroom } from '../frameworks/courtroom';
import { run as runPreMortem } from '../frameworks/pre-mortem';
import { run as runAar } from '../frameworks/aar';
import { run as runRedBlue } from '../frameworks/red-blue';
import { run as runPeerReview } from '../frameworks/peer-review';
import { run as runSixHats } from '../frameworks/six-hats';
import { run as runPhdDefense } from '../frameworks/phd-defense';
import { run as runGrantPanel } from '../frameworks/grant-panel';
import { run as runIntelligenceAnalysis } from '../frameworks/intelligence-analysis';
import { run as runDesignCritique } from '../frameworks/design-critique';
import { run as runConsensusCircle } from '../frameworks/consensus-circle';
import { run as runDifferentialDiagnosis } from '../frameworks/differential-diagnosis';
import { run as runTumorBoard } from '../frameworks/tumor-board';
import { run as runWarGaming } from '../frameworks/war-gaming';
import { run as runWritersWorkshop } from '../frameworks/writers-workshop';
import { run as runRegulatoryImpact } from '../frameworks/regulatory-impact';
import { run as runDevilsAdvocate } from '../frameworks/devils-advocate';
import { run as runDelphi } from '../frameworks/delphi';
import { run as runHegelian } from '../frameworks/hegelian';
import { run as runParliamentary } from '../frameworks/parliamentary';
import { run as runSocratic } from '../frameworks/socratic';
import { run as runStudio } from '../frameworks/studio';
import { run as runSwot } from '../frameworks/swot';
import { run as runTalmudic } from '../frameworks/talmudic';
import { run as runDissertationCommittee } from '../frameworks/dissertation-committee';
import { run as runArchitectureReview } from '../frameworks/architecture-review';
import { courtroom } from '../frameworks/courtroom';
import { preMortem } from '../frameworks/pre-mortem';
import { aar } from '../frameworks/aar';
import { redBlue } from '../frameworks/red-blue';
import { peerReview } from '../frameworks/peer-review';
import { sixHats } from '../frameworks/six-hats';
import { phdDefense } from '../frameworks/phd-defense';
import { grantPanel } from '../frameworks/grant-panel';
import { intelligenceAnalysis } from '../frameworks/intelligence-analysis';
import { designCritique } from '../frameworks/design-critique';
import { consensusCircle } from '../frameworks/consensus-circle';
import { differentialDiagnosis } from '../frameworks/differential-diagnosis';
import { tumorBoard } from '../frameworks/tumor-board';
import { warGaming } from '../frameworks/war-gaming';
import { writersWorkshop } from '../frameworks/writers-workshop';
import { regulatoryImpact } from '../frameworks/regulatory-impact';
import { devilsAdvocate } from '../frameworks/devils-advocate';
import { delphi } from '../frameworks/delphi';
import { hegelian } from '../frameworks/hegelian';
import { parliamentary } from '../frameworks/parliamentary';
import { socratic } from '../frameworks/socratic';
import { studio } from '../frameworks/studio';
import { swot } from '../frameworks/swot';
import { talmudic } from '../frameworks/talmudic';
import { dissertationCommittee } from '../frameworks/dissertation-committee';
import { architectureReview } from '../frameworks/architecture-review';

const PORT = Number(process.env.PORT ?? 7788);
const MODEL = process.env.DEMO_MODEL ?? 'space-bunny-free';
const MOMENT_MODEL = process.env.DEMO_MOMENT_MODEL ?? MODEL;

/** Framework execution registry: run() wrappers (patch costUSD, return bare result). */
const RUNNERS: Record<
  string,
  (raw: unknown, flags?: Record<string, unknown>, sinks?: unknown[]) => Promise<unknown>
> = {
  courtroom: runCourtroom,
  'pre-mortem': runPreMortem,
  aar: runAar,
  'red-blue': runRedBlue,
  'peer-review': runPeerReview,
  'six-hats': runSixHats,
  'phd-defense': runPhdDefense,
  'grant-panel': runGrantPanel,
  'intelligence-analysis': runIntelligenceAnalysis,
  'design-critique': runDesignCritique,
  'consensus-circle': runConsensusCircle,
  'differential-diagnosis': runDifferentialDiagnosis,
  'tumor-board': runTumorBoard,
  'war-gaming': runWarGaming,
  'writers-workshop': runWritersWorkshop,
  'regulatory-impact': runRegulatoryImpact,
  'devils-advocate': runDevilsAdvocate,
  delphi: runDelphi,
  hegelian: runHegelian,
  parliamentary: runParliamentary,
  socratic: runSocratic,
  studio: runStudio,
  swot: runSwot,
  talmudic: runTalmudic,
  'dissertation-committee': runDissertationCommittee,
  'architecture-review': runArchitectureReview,
};

/** Framework metadata from the engine definitions (single source of truth). */
const FRAMEWORK_DEFS: Record<string, { description: string }> = {
  courtroom,
  'pre-mortem': preMortem,
  aar,
  'red-blue': redBlue,
  'peer-review': peerReview,
  'six-hats': sixHats,
  'phd-defense': phdDefense,
  'grant-panel': grantPanel,
  'intelligence-analysis': intelligenceAnalysis,
  'design-critique': designCritique,
  'consensus-circle': consensusCircle,
  'differential-diagnosis': differentialDiagnosis,
  'tumor-board': tumorBoard,
  'war-gaming': warGaming,
  'writers-workshop': writersWorkshop,
  'regulatory-impact': regulatoryImpact,
  'devils-advocate': devilsAdvocate,
  delphi,
  hegelian,
  parliamentary,
  socratic,
  studio,
  swot,
  talmudic,
  'dissertation-committee': dissertationCommittee,
  'architecture-review': architectureReview,
};

interface StreamUpdate {
  t: string;
  [key: string]: unknown;
}

interface Run {
  id: string;
  pipeline: string;
  issue: string;
  updates: StreamUpdate[];
  subscribers: Set<(u: StreamUpdate) => void>;
  done: boolean;
  error?: string;
}

const runs = new Map<string, Run>();

/** Serializes moment-generation calls — garnish must not compete with agents. */
let momentQueue: Promise<void> = Promise.resolve();

function push(run: Run, update: StreamUpdate): void {
  run.updates.push(update);
  for (const sub of run.subscribers) {
    sub(update);
  }
}

/** Generate one conversational "thinking moment" from an agent's output excerpt. */
function generateMoment(run: Run, stageIndex: number, agent: string, excerpt: string): void {
  if (!excerpt || excerpt.length < 40) {
    return;
  }
  momentQueue = momentQueue
    .then(() => doGenerateMoment(run, stageIndex, agent, excerpt))
    .catch(() => {});
}

async function doGenerateMoment(
  run: Run,
  stageIndex: number,
  agent: string,
  excerpt: string
): Promise<void> {
  if (!excerpt || excerpt.length < 40) {
    return;
  }
  try {
    const response = await fetch(`${process.env.OPENAI_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        ...extraHeaders(),
      },
      body: JSON.stringify({
        model: MOMENT_MODEL,
        temperature: 0.8,
        max_tokens: 400,
        messages: [
          {
            role: 'user',
            content:
              `You narrate a live multi-agent decision deliberation. An agent named "${agent}" just produced this output (may be raw JSON):\n\n${excerpt.slice(0, 1200)}\n\n` +
              `Write ONE short thinking-aloud sentence (max 140 chars) capturing its key move or finding. Conversational, like: "Actually this evidence counters that — beta users already see slowness." No quotes, no prefix.`,
          },
        ],
      }),
    });
    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string | null } }>;
    };
    const text = data.choices?.[0]?.message?.content?.trim();
    if (text && text.length > 0) {
      push(run, { t: 'moment', stageIndex, agent, text: text.slice(0, 200) });
    }
  } catch {
    // moments are best-effort garnish; never fail the run for them
  }
}

function extraHeaders(): Record<string, string> {
  const raw = process.env.OPENAI_EXTRA_HEADERS;
  if (!raw) {
    return {};
  }
  try {
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    return {};
  }
}

/** Kick off a single-framework run through the same event plumbing. */
function startSingleFrameworkRun(run: Run, framework: string): void {
  const def = FRAMEWORK_DEFS[framework];
  push(run, {
    t: 'pipeline-start',
    pipeline: framework,
    label: framework,
    stages: [def.description.slice(0, 60)],
  });

  const runner = RUNNERS[framework] as (
    raw: unknown,
    flags?: Record<string, unknown>,
    sinks?: EventSink[]
  ) => Promise<unknown>;
  const stageStart = Date.now();

  const taggedSink: EventSink = (e) => {
    const tagged = { ...e, stageIndex: 0 } as StreamUpdate;
    // Map engine events onto the wire protocol the client already speaks
    switch (tagged.type) {
      case 'agent-start':
        push(run, { t: 'agent-start', stageIndex: 0, agent: tagged.agent });
        break;
      case 'agent-end':
        push(run, { t: 'agent-end', stageIndex: 0, agent: tagged.agent, cost: tagged.cost });
        if (tagged.excerpt) {
          generateMoment(run, 0, tagged.agent ?? 'agent', tagged.excerpt);
        }
        break;
      case 'phase':
        push(run, { t: 'phase', stageIndex: 0, name: tagged.name, detail: tagged.detail });
        break;
      case 'note':
        push(run, { t: 'note', stageIndex: 0, text: tagged.message });
        break;
      default:
        break;
    }
  };

  runner(run.issue, { provider: 'openai', model: MODEL }, [taggedSink])
    .then((result) => {
      const r = result as { metadata?: { decision?: string; costUSD?: number } };
      const decision = r?.metadata?.decision ?? 'unclear';
      const cost = r?.metadata?.costUSD ?? 0;
      push(run, {
        t: 'stage-end',
        stageIndex: 0,
        framework,
        decision,
        cost,
        durationMs: Date.now() - stageStart,
      });
      push(run, {
        t: 'pipeline-end',
        decision,
        stageDecisions: [decision],
        cost,
        durationMs: Date.now() - stageStart,
        summary: `${framework} completed.`,
      });
      run.done = true;
      for (const sub of run.subscribers) {
        sub({ t: 'done' });
      }
      run.subscribers.clear();
    })
    .catch((error) => {
      run.error = error instanceof Error ? error.message : String(error);
      push(run, { t: 'pipeline-error', error: run.error });
      run.done = true;
      for (const sub of run.subscribers) {
        sub({ t: 'done' });
      }
      run.subscribers.clear();
    });
}

/** Kick off the pipeline in the background, pushing updates into the run. */
function startRun(run: Run, pipelineDef: PipelineDefinition): void {
  push(run, {
    t: 'pipeline-start',
    pipeline: pipelineDef.name,
    label: pipelineDef.label,
    stages: pipelineDef.stages.map((s) => s.label),
  });

  runPipeline(pipelineDef, run.issue, RUNNERS, { provider: 'openai', model: MODEL }, [
    (event) => {
      if ('type' in event) {
        const e = event as {
          type: string;
          stageIndex?: number;
          agent?: string;
          excerpt?: string;
          name?: string;
          message?: string;
          detail?: string;
        };
        switch (e.type) {
          case 'agent-start':
            push(run, { t: 'agent-start', stageIndex: e.stageIndex, agent: e.agent });
            break;
          case 'agent-end': {
            push(run, {
              t: 'agent-end',
              stageIndex: e.stageIndex,
              agent: e.agent,
              cost: (e as { cost?: number }).cost,
            });
            if (e.excerpt) {
              generateMoment(run, e.stageIndex ?? 0, e.agent ?? 'agent', e.excerpt);
            }
            break;
          }
          case 'phase':
            push(run, { t: 'phase', stageIndex: e.stageIndex, name: e.name, detail: e.detail });
            break;
          case 'note':
            push(run, { t: 'note', stageIndex: e.stageIndex, text: e.message });
            break;
          case 'stage-end':
            push(run, {
              t: 'stage-end',
              stageIndex: e.stageIndex,
              framework: (e as { framework?: string }).framework,
              decision: (e as { decision?: string }).decision,
              cost: (e as { cost?: number }).cost,
              durationMs: (e as { durationMs?: number }).durationMs,
            });
            break;
          default:
            break;
        }
      }
    },
  ])
    .then((out) => {
      const last = out.events.at(-1) as { summary?: string } | undefined;
      push(run, {
        t: 'pipeline-end',
        decision: out.finalDecision,
        stageDecisions: out.stageDecisions,
        cost: out.totalCost,
        durationMs: out.durationMs,
        summary: last?.summary ?? '',
      });
      run.done = true;
      for (const sub of run.subscribers) {
        sub({ t: 'done' });
      }
      run.subscribers.clear();
    })
    .catch((error) => {
      run.error = error instanceof Error ? error.message : String(error);
      push(run, { t: 'pipeline-error', error: run.error });
      run.done = true;
      for (const sub of run.subscribers) {
        sub({ t: 'done' });
      }
      run.subscribers.clear();
    });
}

function sseStream(run: Run): Response {
  let closed = false;
  const stream = new ReadableStream({
    start(controller) {
      const enc = new TextEncoder();
      const send = (u: StreamUpdate) => {
        if (closed) {
          return;
        }
        try {
          controller.enqueue(enc.encode(`data: ${JSON.stringify(u)}\n\n`));
        } catch {
          closed = true;
        }
      };

      // Replay buffered events, then subscribe live
      for (const u of run.updates) {
        send(u);
      }
      if (run.done) {
        send({ t: 'done' });
        controller.close();
        return;
      }

      const sub = (u: StreamUpdate) => send(u);
      run.subscribers.add(sub);
      const ping = setInterval(() => {
        if (!closed) {
          send({ t: 'ping' });
        }
      }, 15000);

      // Cleanup when the consumer cancels
      (controller as unknown as { _cleanup?: () => void })._cleanup = () => {
        clearInterval(ping);
        run.subscribers.delete(sub);
      };
    },
    cancel() {
      closed = true;
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}

/** LLM-based routing: classify the issue into a framework or pipeline. */
async function llmRoute(
  issue: string
): Promise<{ kind: 'framework' | 'pipeline'; name: string; reason: string } | null> {
  const catalog = Object.entries(FRAMEWORK_DEFS)
    .map(([name, def]) => `- ${name}: ${def.description}`)
    .join('\n');
  const pipelines = PIPELINES.map((p) => `- ${p.name}: ${p.description}`).join('\n');

  try {
    const response = await fetch(`${process.env.OPENAI_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        ...extraHeaders(),
      },
      body: JSON.stringify({
        model: MOMENT_MODEL,
        temperature: 0.2,
        max_tokens: 400,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'user',
            content:
              `Classify this issue into the single best deliberation format.\n\n` +
              `ISSUE: ${issue.slice(0, 1000)}\n\n` +
              `FRAMEWORKS:\n${catalog}\n\nPIPELINES:\n${pipelines}\n\n` +
              `Prefer a pipeline when the issue involves a real decision with risks (plan-hardening, security-review, proposal-review); a single framework when one focused lens is enough. ` +
              `Respond ONLY JSON: {"kind": "framework"|"pipeline", "name": "<exact name>", "reason": "<one sentence, max 100 chars>"}`,
          },
        ],
      }),
    });
    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string | null } }>;
    };
    const raw = data.choices?.[0]?.message?.content ?? '';
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) {
      return null;
    }
    const parsed = JSON.parse(match[0]) as { kind?: string; name?: string; reason?: string };
    const kind = parsed.kind === 'pipeline' ? 'pipeline' : 'framework';
    if (kind === 'framework' && !RUNNERS[parsed.name ?? '']) {
      return null;
    }
    if (kind === 'pipeline' && !getPipeline(parsed.name ?? '')) {
      return null;
    }
    return { kind, name: parsed.name!, reason: (parsed.reason ?? '').slice(0, 160) };
  } catch {
    return null; // router is best-effort; keyword fallback covers it
  }
}

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);

    if (url.pathname === '/api/pipelines') {
      return Response.json(
        PIPELINES.map((p) => ({
          name: p.name,
          label: p.label,
          description: p.description,
          keywords: p.keywords,
        }))
      );
    }

    if (url.pathname === '/api/frameworks') {
      return Response.json(
        Object.entries(FRAMEWORK_DEFS).map(([name, def]) => ({
          name,
          description: def.description,
        }))
      );
    }

    if (url.pathname === '/api/run' && req.method === 'POST') {
      const body = (await req.json()) as { issue?: string; pipeline?: string; framework?: string };
      const issue = (body.issue ?? '').trim();
      if (issue.length < 10) {
        return Response.json(
          { error: 'Describe the issue in at least a sentence.' },
          { status: 400 }
        );
      }

      const makeRun = (): Run => {
        const id = crypto.randomUUID();
        const run: Run = {
          id,
          pipeline: '',
          issue,
          updates: [],
          subscribers: new Set(),
          done: false,
        };
        runs.set(id, run);
        return run;
      };

      // Explicit framework selection → single-framework run
      if (body.framework) {
        if (!RUNNERS[body.framework]) {
          return Response.json({ error: `Unknown framework: ${body.framework}` }, { status: 400 });
        }
        const run = makeRun();
        run.pipeline = body.framework;
        startSingleFrameworkRun(run, body.framework);
        return Response.json({ id: run.id, routed: body.framework, label: body.framework });
      }

      // Explicit pipeline selection
      if (body.pipeline) {
        const def = getPipeline(body.pipeline);
        if (!def) {
          return Response.json({ error: 'Unknown pipeline' }, { status: 400 });
        }
        const run = makeRun();
        run.pipeline = def.name;
        startRun(run, def);
        return Response.json({ id: run.id, routed: def.name, label: def.label });
      }

      // Auto-route: LLM classification of the issue, keyword fallback
      const routed =
        (await llmRoute(issue)) ??
        (() => {
          const def = routePipeline(issue);
          return { kind: 'pipeline' as const, name: def.name, reason: 'keyword match' };
        })();

      const run = makeRun();
      run.pipeline = routed.name;
      push(run, { t: 'routed', kind: routed.kind, name: routed.name, reason: routed.reason });

      if (routed.kind === 'pipeline') {
        const def = getPipeline(routed.name)!;
        startRun(run, def);
        return Response.json({
          id: run.id,
          routed: routed.name,
          label: def.label,
          routeReason: routed.reason,
        });
      }
      startSingleFrameworkRun(run, routed.name);
      return Response.json({
        id: run.id,
        routed: routed.name,
        label: routed.name,
        routeReason: routed.reason,
      });
    }

    const streamMatch = url.pathname.match(/^\/api\/stream\/([a-f0-9-]+)$/);
    if (streamMatch && req.method === 'GET') {
      const run = runs.get(streamMatch[1]);
      if (!run) {
        return new Response('not found', { status: 404 });
      }
      return sseStream(run);
    }

    // Static: serve site/index.html at /
    if (url.pathname === '/' || url.pathname === '/index.html') {
      const html = await Bun.file(new URL('./index.html', import.meta.url)).text();
      return new Response(html, { headers: { 'Content-Type': 'text/html' } });
    }

    return new Response('not found', { status: 404 });
  },
});

console.log(`LED deliberation dashboard: http://localhost:${server.port}`);
console.log(`model: ${MODEL} | moment model: ${MOMENT_MODEL}`);
