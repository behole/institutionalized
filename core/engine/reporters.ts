/**
 * Reporters: event sinks rendering EngineEvents.
 *
 * - prettyReporter: human console output (the replacement for console.log)
 * - jsonReporter: collects events for structured output (--json mode)
 * Library consumers pass no sink and get silence.
 */
import type { EngineEvent, EventSink } from './events';

export function prettyReporter(verbose: boolean): EventSink {
  return (event: EngineEvent) => {
    switch (event.type) {
      case 'run-start':
        if (verbose) {
          console.log(`\n▶ ${event.framework}`);
        }
        break;
      case 'phase':
        if (verbose) {
          console.log(`\n— ${event.name}${event.detail ? `: ${event.detail}` : ''}`);
        }
        break;
      case 'agent-start':
        if (verbose) {
          console.log(`  · ${event.agent} (${event.model})`);
        }
        break;
      case 'agent-end':
        if (verbose) {
          console.log(
            `  ✓ ${event.agent} — ${(event.durationMs / 1000).toFixed(1)}s, $${event.cost.toFixed(4)}`
          );
        }
        break;
      case 'note':
        if (verbose) {
          console.log(`  ${event.message}`);
        }
        break;
      case 'run-end':
        console.log(
          `\n✅ ${event.framework} complete — ${(event.durationMs / 1000).toFixed(1)}s, $${event.cost.toFixed(
            4
          )} (${event.tokens.input + event.tokens.output} tokens)`
        );
        break;
      case 'run-error':
        console.error(`\n❌ ${event.framework} failed: ${event.error}`);
        break;
    }
  };
}

export function jsonReporter(): { sink: EventSink; events: EngineEvent[] } {
  const events: EngineEvent[] = [];
  return { events, sink: (event) => events.push(event) };
}
