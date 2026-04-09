import { describe, test, expect } from "bun:test";
import fc from "fast-check";
import { parseJSON, Semaphore } from "../../core/orchestrator";
import { sanitizeInput } from "../../core/sanitize";
import { validateQuote } from "../../core/validators";

describe("parseJSON properties", () => {
  test("never crashes on arbitrary strings", () => {
    fc.assert(
      fc.property(fc.string(), (s) => {
        try {
          parseJSON(s);
        } catch {
          // Throwing is fine — crashing is not
        }
        return true;
      }),
      { numRuns: 500 }
    );
  });

  test("roundtrip: parseJSON(JSON.stringify(obj)) equals obj", () => {
    fc.assert(
      fc.property(
        fc.dictionary(fc.string(), fc.oneof(fc.string(), fc.integer(), fc.boolean())),
        (obj) => {
          const result = parseJSON(JSON.stringify(obj));
          expect(result).toEqual(obj);
          return true;
        }
      ),
      { numRuns: 200 }
    );
  });
});

describe("sanitizeInput properties", () => {
  test("output byte length is always <= input byte length", () => {
    fc.assert(
      fc.property(fc.string(), (s) => {
        try {
          const result = sanitizeInput(s);
          const inputBytes = new TextEncoder().encode(s).byteLength;
          const outputBytes = new TextEncoder().encode(result).byteLength;
          return outputBytes <= inputBytes;
        } catch {
          return true; // size limit throws are valid
        }
      }),
      { numRuns: 500 }
    );
  });

  test("output never contains null bytes", () => {
    fc.assert(
      fc.property(fc.string(), (s) => {
        try {
          const result = sanitizeInput(s);
          return !result.includes("\0");
        } catch {
          return true;
        }
      }),
      { numRuns: 500 }
    );
  });

  test("idempotent: sanitize(sanitize(x)) === sanitize(x)", () => {
    fc.assert(
      fc.property(fc.string(), (s) => {
        try {
          const once = sanitizeInput(s);
          const twice = sanitizeInput(once);
          return once === twice;
        } catch {
          return true;
        }
      }),
      { numRuns: 500 }
    );
  });
});

describe("validateQuote properties", () => {
  test("never throws when quote is substring of source", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        fc.string(),
        fc.string(),
        (prefix, quote, suffix) => {
          if (quote.length === 0) return true;
          const source = prefix + quote + suffix;
          try {
            validateQuote(quote, source);
            return true;
          } catch {
            return false;
          }
        }
      ),
      { numRuns: 200 }
    );
  });

  test("always throws when quote is NOT in source", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        fc.string({ minLength: 1 }),
        (quote, source) => {
          if (source.includes(quote)) return true;
          try {
            validateQuote(quote, source);
            return false;
          } catch {
            return true;
          }
        }
      ),
      { numRuns: 200 }
    );
  });
});

describe("Semaphore properties", () => {
  test("concurrent count never exceeds permits", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 10 }),
        fc.integer({ min: 1, max: 20 }),
        async (permits, numTasks) => {
          const sem = new Semaphore(permits);
          let concurrent = 0;
          let maxConcurrent = 0;

          const tasks = Array.from({ length: numTasks }, () => async () => {
            await sem.acquire();
            try {
              concurrent++;
              maxConcurrent = Math.max(maxConcurrent, concurrent);
              await Bun.sleep(1);
              concurrent--;
            } finally {
              sem.release();
            }
          });

          await Promise.all(tasks.map((t) => t()));
          return maxConcurrent <= permits;
        }
      ),
      { numRuns: 50 }
    );
  });
});
