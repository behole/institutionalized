/**
 * Socratic Method Framework — engine port.
 *
 * Flow: rounds of question/answer exchange → concluding synthesis.
 * All provider/model/audit/logging concerns owned by the engine.
 */
import type { EventSink } from '@core/engine';
import { defineFramework } from '@core/engine';
import { parseJSON } from '@core/orchestrator';
import type { RunFlags } from '@core/types';
import type { Statement, SocraticExchange, SocraticResult, SocraticConfig } from './types';
import { DEFAULT_CONFIG } from './types';

export const socratic = defineFramework<Statement | { content: string }, SocraticResult>({
  name: 'socratic',
  description: 'Systematic questioning to expose assumptions and refine understanding',
  normalize(raw) {
    if (typeof raw === 'object' && raw !== null && 'claim' in raw) {
      return raw as Statement;
    }
    const content = (raw as { content?: string })?.content ?? '';
    return { claim: content };
  },
  async run(rawInput, session) {
    const statement = rawInput as Statement;
    const config: SocraticConfig = {
      ...DEFAULT_CONFIG,
      ...(session.flags.config as Partial<SocraticConfig> | undefined),
    };
    const cliFlags = session.flags as Record<string, unknown>;
    if (cliFlags.rounds) {
      config.parameters.maxRounds = parseInt(String(cliFlags.rounds), 10);
    }
    const explicitModel = session.models.override;
    if (explicitModel) {
      config.models = {
        questioner: explicitModel,
        respondent: explicitModel,
      };
    }

    const exchanges: SocraticExchange[] = [];

    for (let round = 1; round <= config.parameters.maxRounds; round++) {
      session.phase(`Round ${round}`, 'Question & answer exchange');

      // Socrates asks question
      const questionPrompt = `You are Socrates conducting a dialogue.

ORIGINAL CLAIM: ${statement.claim}
${statement.context ? `CONTEXT: ${statement.context}\n` : ''}

${exchanges.length > 0 ? `PREVIOUS EXCHANGES:\n${exchanges.map((e) => `Q: ${e.question}\nA: ${e.response}`).join('\n\n')}\n` : ''}

Ask a probing question (Round ${round}) that:
- Tests assumptions
- Seeks definitions
- Explores implications
- Looks for contradictions
- Requests justification

Provide in JSON:
{
  "question": "your probing question"
}`;

      const questionStep = await session.step({
        name: `questioner-round-${round}`,
        prompt: questionPrompt,
        temperature: config.parameters.temperature,
        maxTokens: 512,
      });

      const { question } = parseJSON<{ question: string }>(questionStep.content);

      // Respondent answers
      const responsePrompt = `You are responding to Socratic questioning about your claim.

YOUR CLAIM: ${statement.claim}

${exchanges.length > 0 ? `PREVIOUS EXCHANGES:\n${exchanges.map((e) => `Q: ${e.question}\nA: ${e.response}`).join('\n\n')}\n` : ''}

QUESTION: ${question}

Respond thoughtfully in JSON:
{
  "response": "your response",
  "exposedAssumption": "assumption revealed (if any)",
  "contradiction": "contradiction found (if any)"
}

Be honest. If you realize you don't know or find a contradiction, acknowledge it.`;

      const answerStep = await session.step({
        name: `respondent-round-${round}`,
        prompt: responsePrompt,
        temperature: config.parameters.temperature,
        maxTokens: 1024,
      });

      const answer = parseJSON<Omit<SocraticExchange, 'round' | 'question'>>(answerStep.content);
      const exchange: SocraticExchange = { round, question, ...answer };
      exchanges.push(exchange);

      session.note(`Q: ${question} → A: ${answer.response.slice(0, 80)}…`);

      // Stop if we've reached a natural conclusion
      if (
        exchange.response.toLowerCase().includes("i don't know") ||
        exchange.response.toLowerCase().includes('acknowledged')
      ) {
        session.note('Reached epistemic humility');
        break;
      }
    }

    // Synthesize conclusion
    session.phase('Synthesis', 'Concluding synthesis');
    const exchangesText = exchanges
      .map(
        (e) =>
          `Round ${e.round}:\nQ: ${e.question}\nA: ${e.response}${e.exposedAssumption ? `\nAssumption: ${e.exposedAssumption}` : ''}${e.contradiction ? `\nContradiction: ${e.contradiction}` : ''}`
      )
      .join('\n\n');

    const conclusionStep = await session.step({
      name: 'questioner-conclusion',
      prompt: `Synthesize the Socratic dialogue.

ORIGINAL CLAIM: ${statement.claim}

DIALOGUE:
${exchangesText}

Provide conclusion in JSON:
{
  "refinedUnderstanding": "revised/clarified understanding",
  "exposedAssumptions": ["assumption 1", ...],
  "contradictions": ["contradiction 1", ...],
  "remainingQuestions": ["question 1", ...],
  "epistemicStatus": "clarified" | "refined" | "refuted" | "acknowledged_ignorance",
  "synthesis": "what we learned from this dialogue"
}`,
      temperature: config.parameters.temperature,
      maxTokens: 1536,
    });

    const conclusion = parseJSON<SocraticResult['conclusion']>(conclusionStep.content);

    session.note(
      `Exchanges: ${exchanges.length} | Epistemic Status: ${conclusion.epistemicStatus} | Exposed Assumptions: ${conclusion.exposedAssumptions.length}`
    );

    return {
      statement,
      exchanges,
      conclusion,
      metadata: {
        timestamp: new Date().toISOString(),
        config,
        decision: 'unclear',
      },
    };
  },
});

/** Backward-compatible entry returning the bare result. */
export async function run(
  input: Statement | { content: string },
  flags: RunFlags = {},
  sinks: EventSink[] = []
): Promise<SocraticResult> {
  const { result, auditLog } = await socratic(input, flags, sinks);
  result.metadata.costUSD = auditLog.metadata.totalCost;
  return result;
}

export * from './types';
