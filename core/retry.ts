// Retry, backoff, and timeout utility for LLM provider calls.
// All providers (Anthropic, OpenAI, OpenRouter) use withRetry to get consistent
// retry-on-429/500, exponential-backoff-with-jitter, and AbortController timeout.

import { ProviderError, ErrorCode } from "./errors";
import type { ErrorContext } from "./errors";

/**
 * Parse a Retry-After header value into milliseconds.
 *
 * Handles two formats from RFC 7231:
 *   - Integer seconds: "30"
 *   - HTTP-date: "Mon, 17 Mar 2026 00:30:00 GMT"
 *
 * Returns null for null/undefined/empty/unparseable values.
 */
export function parseRetryAfterMs(header: string | null | undefined): number | null {
  if (header == null || header === "") return null;

  // Integer seconds
  const seconds = Number(header);
  if (!isNaN(seconds) && String(seconds) === header.trim()) {
    return seconds * 1_000;
  }

  // HTTP-date
  const parsed = Date.parse(header);
  if (!isNaN(parsed)) {
    return Math.max(0, parsed - Date.now());
  }

  return null;
}

/** Determine if an error status code should trigger a retry. */
function isRetryableStatus(status: number): boolean {
  return status === 429 || status === 500 || status === 503;
}

/** Extract HTTP status code from various error shapes. */
function getErrorStatus(err: unknown): number | null {
  if (err == null || typeof err !== "object") return null;
  const e = err as Record<string, unknown>;
  if (typeof e.status === "number") return e.status;
  // Fetch Response-like error
  if (e.response && typeof (e.response as Record<string, unknown>).status === "number") {
    return (e.response as Record<string, unknown>).status as number;
  }
  return null;
}

/** Extract Retry-After header from various error shapes. */
function getRetryAfterHeader(err: unknown): string | null {
  if (err == null || typeof err !== "object") return null;
  const e = err as Record<string, unknown>;

  // Anthropic SDK errors expose headers as a plain object
  if (e.headers && typeof e.headers === "object") {
    const h = e.headers as Record<string, string>;
    if (typeof h["retry-after"] === "string") return h["retry-after"];
  }

  // Fetch errors may expose headers via response.headers (Headers API)
  if (e.response && typeof e.response === "object") {
    const resp = e.response as { headers?: { get?: (name: string) => string | null } };
    if (resp.headers?.get) {
      const val = resp.headers.get("retry-after");
      if (val) return val;
    }
  }

  return null;
}

export interface WithRetryOptions {
  /** Maximum number of attempts (default: 3) */
  maxAttempts?: number;
  /** Per-attempt timeout in milliseconds (default: 120_000) */
  timeoutMs?: number;
  /**
   * Base delay for exponential backoff in ms (default: 1_000).
   * Overridable for unit tests (pass 1 to make tests instant).
   */
  baseDelayMs?: number;
  /** Custom predicate to override default retry-on-429/500/503 logic */
  retryOn?: (error: unknown) => boolean;
  /** Error context passed into ProviderError on final failure */
  context?: ErrorContext;
}

/**
 * Retry wrapper with exponential backoff + full jitter + AbortController timeout.
 *
 * Strategy (AWS Full Jitter):
 *   delay = Math.random() * baseDelay * 2^(attempt - 1)
 *
 * The caller's `fn` receives a fresh AbortSignal per attempt so it can abort
 * in-flight requests without affecting subsequent retry attempts.
 */
export async function withRetry<T>(
  fn: (signal: AbortSignal) => Promise<T>,
  options: WithRetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    timeoutMs = 120_000,
    baseDelayMs = 1_000,
    retryOn,
    context = {},
  } = options;

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const ac = new AbortController();

    // Per-attempt timeout
    const timer = setTimeout(() => ac.abort(new DOMException("Timeout", "AbortError")), timeoutMs);

    try {
      const result = await fn(ac.signal);
      clearTimeout(timer);
      return result;
    } catch (err) {
      clearTimeout(timer);

      // Check if this was a timeout abort
      if (
        ac.signal.aborted &&
        (err instanceof DOMException || (err as { name?: string }).name === "AbortError")
      ) {
        throw new ProviderError("Request timed out", {
          code: ErrorCode.PROVIDER_TIMEOUT,
          context,
          cause: err,
        });
      }

      lastError = err;

      // Determine if we should retry
      const status = getErrorStatus(err);
      const shouldRetry = retryOn
        ? retryOn(err)
        : status != null && isRetryableStatus(status);

      if (!shouldRetry || attempt === maxAttempts) {
        // Non-retryable error or final attempt — rethrow as-is (not wrapped)
        if (!shouldRetry) throw err;
        break; // will throw ProviderError below
      }

      // Calculate delay: honor Retry-After, fall back to exponential backoff with full jitter
      const retryAfterHeader = getRetryAfterHeader(err);
      const retryAfterMs = parseRetryAfterMs(retryAfterHeader);
      const backoffMs =
        retryAfterMs !== null
          ? retryAfterMs
          : Math.random() * baseDelayMs * Math.pow(2, attempt - 1);

      if (backoffMs > 0) {
        await new Promise<void>((resolve) => setTimeout(resolve, backoffMs));
      }
    }
  }

  // All attempts exhausted — throw ProviderError
  throw new ProviderError("Max retries exceeded", {
    code: ErrorCode.PROVIDER_RATE_LIMITED,
    context,
    cause: lastError,
  });
}
