import type { LLMProvider, LLMCallParams, LLMResponse } from "./types";
import { detectPromptInjection, sanitizeOutput } from "./sanitize";

/**
 * Middleware function signature.
 * Receives the call params and a `next` function to call the next middleware (or provider).
 */
export type Middleware = (
  params: LLMCallParams,
  next: (params: LLMCallParams) => Promise<LLMResponse>
) => Promise<LLMResponse>;

/**
 * Wrap a provider with a middleware chain.
 * Middleware executes in array order (first middleware is outermost).
 * Returns a new LLMProvider with the same name and calculateCost.
 */
export function applyMiddleware(
  provider: LLMProvider,
  middlewares: Middleware[]
): LLMProvider {
  if (middlewares.length === 0) return provider;

  const chain = middlewares.reduceRight<(params: LLMCallParams) => Promise<LLMResponse>>(
    (next, mw) => (params) => mw(params, next),
    (params) => provider.call(params)
  );

  return {
    name: provider.name,
    call: chain,
    calculateCost: provider.calculateCost.bind(provider),
  };
}

/**
 * Prompt injection detection middleware.
 * - "warn" mode: allows the call but adds injectionWarning to response metadata
 * - "block" mode: throws an error, preventing the LLM call
 */
export function injectionDetection(mode: "warn" | "block" = "warn"): Middleware {
  return async (params, next) => {
    const userMessages = params.messages.filter((m) => m.role === "user");
    const allContent = userMessages.map((m) => m.content).join("\n");
    const detection = detectPromptInjection(allContent);

    if (detection.detected) {
      if (mode === "block") {
        throw new Error(
          `Prompt injection detected: ${detection.signals.join(", ")}`
        );
      }

      const response = await next(params);
      return {
        ...response,
        metadata: {
          ...response.metadata,
          injectionWarning: true,
          injectionSignals: detection.signals,
        },
      };
    }

    return next(params);
  };
}

/**
 * Output sanitization middleware.
 * Cleans LLM response content before returning.
 */
export function outputSanitization(): Middleware {
  return async (params, next) => {
    const response = await next(params);
    return {
      ...response,
      content: sanitizeOutput(response.content),
    };
  };
}

/**
 * Cost budget middleware.
 * Tracks cumulative cost across calls and throws when budget is exceeded.
 */
export function costBudget(
  maxCost: number,
  costFn: (response: LLMResponse) => number
): Middleware {
  let totalCost = 0;

  return async (params, next) => {
    if (totalCost >= maxCost) {
      throw new Error(
        `Cost budget exceeded: $${totalCost.toFixed(4)} spent of $${maxCost.toFixed(4)} budget`
      );
    }

    const response = await next(params);
    const callCost = costFn(response);
    totalCost += callCost;

    return response;
  };
}
