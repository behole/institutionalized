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
import type { PipelineDefinition } from '../core/engine';
import { run as runCourtroom } from '../frameworks/courtroom';
import { run as runPreMortem } from '../frameworks/pre-mortem';
import { run as runAar } from '../frameworks/aar';
import { run as runRedBlue } from '../frameworks/red-blue';
import { run as runPeerReview } from '../frameworks/peer-review';

const PORT = Number(process.env.PORT ?? 7788);
const MODEL = process.env.DEMO_MODEL ?? 'space-bunny-free';
const MOMENT_MODEL = process.env.DEMO_MOMENT_MODEL ?? MODEL;

const RUNNERS = {
  courtroom: runCourtroom,
  'pre-mortem': runPreMortem,
  aar: runAar,
  'red-blue': runRedBlue,
  'peer-review': runPeerReview,
} as const;

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

    if (url.pathname === '/api/run' && req.method === 'POST') {
      const body = (await req.json()) as { issue?: string; pipeline?: string };
      const issue = (body.issue ?? '').trim();
      if (issue.length < 10) {
        return Response.json(
          { error: 'Describe the issue in at least a sentence.' },
          { status: 400 }
        );
      }
      const def = body.pipeline ? getPipeline(body.pipeline) : routePipeline(issue);
      if (!def) {
        return Response.json({ error: 'Unknown pipeline' }, { status: 400 });
      }

      const id = crypto.randomUUID();
      const run: Run = {
        id,
        pipeline: def.name,
        issue,
        updates: [],
        subscribers: new Set(),
        done: false,
      };
      runs.set(id, run);
      startRun(run, def);
      return Response.json({ id, routed: def.name, label: def.label });
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
