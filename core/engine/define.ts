/**
 * defineFramework: the standard wrapper replacing per-framework boilerplate.
 *
 * Owns: provider resolution, Session construction, budget guardrails,
 * run-start/run-error events, audit finalization. Framework body receives
 * a Session and returns the result; it never touches providers or logs.
 */
import type { AuditLog } from '../observability';
import type { RunFlags } from '../types';
import { Session, Budget } from './session';
import { createModelResolution, ModelRole } from './models';
import { getProviderFromEnv, createProvider } from '../providers';
import { getAPIKey } from '../config';
import type { EventSink } from './events';

export interface FrameworkDefinition<TInput, TOutput> {
  name: string;
  /** Human one-liner for CLI/MCP/skill listings. */
  description: string;

  /**
   * Map this framework's legacy role names onto registry roles so existing
   * per-role model configs keep working. Frameworks with uniform models omit it.
   */
  roles?: Record<string, ModelRole>;

  /** Normalize loose input ({ content: string }) into the typed input. */
  normalize?: (raw: unknown) => TInput;

  /** Framework body: prompts, phases, flow. Returns the typed result. */
  run: (input: TInput, session: Session) => Promise<TOutput>;
}

export interface FrameworkRunOutput<TOutput> {
  result: TOutput;
  auditLog: AuditLog;
  session: Session;
}

export function defineFramework<TInput, TOutput>(
  def: FrameworkDefinition<TInput, TOutput>
): (raw: unknown, flags?: RunFlags, sinks?: EventSink[]) => Promise<FrameworkRunOutput<TOutput>> {
  return async (raw: unknown, flags: RunFlags = {}, sinks: EventSink[] = []) => {
    const input = def.normalize ? def.normalize(raw) : (raw as TInput);

    const providerName = flags.provider;
    const provider = providerName
      ? createProvider({ name: providerName, apiKey: getAPIKey(providerName) })
      : getProviderFromEnv();

    const models = createModelResolution(flags, def.roles);
    const budget: Budget = {
      maxCostUSD: flags.maxCostUSD,
      maxTokens: flags.maxTokens,
    };

    const session = new Session(def.name, provider, models, flags, input, budget);
    for (const sink of sinks) {
      session.on(sink);
    }
    session.on(() => {}); // ensure events[] records even with no external sinks
    session.emitEvent({ type: 'run-start', framework: def.name, input });

    try {
      const result = await def.run(input, session);
      const auditLog = await session.finalize(result, 'complete');
      return { result, auditLog, session };
    } catch (error) {
      session.emitEvent({
        type: 'run-error',
        framework: def.name,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  };
}
