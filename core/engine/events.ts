/**
 * Engine: composition primitives for institutional frameworks.
 *
 * A framework is a TS function built from engine primitives. The engine owns
 * provider resolution, model-role registry, audit trail, cost guardrails, and
 * event emission. Frameworks keep only prompts, flow, and result assembly.
 */
import type { AuditLog } from '../observability';
import type { LLMCallParams, LLMProvider, LLMResponse, RunFlags } from '../types';
import { FrameworkRunner } from '../orchestrator';
import { createProvider, getProviderFromEnv } from '../providers';
import { getAPIKey } from '../config';

/** Events emitted during a framework run. Subscribers render or stream them. */
export type EngineEvent =
  | { type: 'run-start'; framework: string; input: unknown }
  | { type: 'phase'; framework: string; name: string; detail?: string }
  | { type: 'agent-start'; agent: string; model: string }
  | {
      type: 'agent-end';
      agent: string;
      model: string;
      durationMs: number;
      cost: number;
      tokens: { input: number; output: number };
    }
  | { type: 'note'; framework: string; message: string }
  | {
      type: 'run-end';
      framework: string;
      durationMs: number;
      cost: number;
      tokens: { input: number; output: number };
    }
  | { type: 'run-error'; framework: string; error: string };

/** Subscriber for engine events. CLI pretty-printer, JSON reporter, MCP/skill stream. */
export type EventSink = (event: EngineEvent) => void;
