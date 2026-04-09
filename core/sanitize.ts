/**
 * Input/output sanitization for LLM interactions.
 *
 * sanitizeInput()  — clean user input before sending to LLM
 * detectPromptInjection() — heuristic injection detection (defense-in-depth)
 * sanitizeOutput() — clean LLM responses before downstream use
 */

export interface SanitizeOptions {
  /** Maximum input size in bytes (default: 100KB) */
  maxSizeBytes?: number;
}

const DEFAULT_MAX_SIZE_BYTES = 100 * 1024; // 100KB

/**
 * Sanitize user input before sending to an LLM.
 * - Enforces size limit
 * - Strips null bytes
 * - Strips control characters (preserves \n and \t)
 */
export function sanitizeInput(
  text: string,
  options: SanitizeOptions = {}
): string {
  const maxSize = options.maxSizeBytes ?? DEFAULT_MAX_SIZE_BYTES;

  // Size limit check (byte length for accuracy with unicode)
  const byteLength = new TextEncoder().encode(text).byteLength;
  if (byteLength > maxSize) {
    throw new Error(
      `Input exceeds maximum size: ${byteLength} bytes (limit: ${maxSize} bytes)`
    );
  }

  // Strip null bytes
  let cleaned = text.replace(/\0/g, "");

  // Strip control characters except newline (\n=0x0A) and tab (\t=0x09)
  // eslint-disable-next-line no-control-regex
  cleaned = cleaned.replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");

  return cleaned;
}

/** Signal types returned by prompt injection detection */
type InjectionSignal = "instruction_override" | "role_switch" | "prompt_leak";

export interface InjectionDetectionResult {
  detected: boolean;
  signals: InjectionSignal[];
}

/**
 * Heuristic detection of common prompt injection patterns.
 *
 * Returns which patterns matched but does NOT block — callers decide policy.
 * This is defense-in-depth, not a guarantee.
 */
export function detectPromptInjection(text: string): InjectionDetectionResult {
  if (!text) return { detected: false, signals: [] };

  const lower = text.toLowerCase();
  const signals: InjectionSignal[] = [];

  // Instruction override patterns
  const overridePatterns = [
    /ignore\s+(all\s+)?previous\s+instructions/,
    /disregard\s+(all\s+)?prior\s+(instructions|prompts)/,
    /forget\s+(all\s+)?previous\s+(instructions|context)/,
    /override\s+(system|previous)\s+(prompt|instructions)/,
    /new\s+instructions?\s*:/,
  ];
  if (overridePatterns.some((p) => p.test(lower))) {
    signals.push("instruction_override");
  }

  // Role-switching patterns
  const roleSwitchPatterns = [
    /^system\s*:/m,
    /you\s+are\s+now\s+(a\s+)?/,
    /act\s+as\s+if\s+you\s+are/,
    /pretend\s+(to\s+be|you\s+are)\s+(a\s+)?/,
    /\[system\]/i,
  ];
  if (roleSwitchPatterns.some((p) => p.test(lower))) {
    signals.push("role_switch");
  }

  // Prompt leak patterns
  const promptLeakPatterns = [
    /print\s+(your\s+)?(system\s+)?prompt/,
    /show\s+(me\s+)?(your\s+)?(system\s+)?prompt/,
    /reveal\s+(your\s+)?(system\s+)?(prompt|instructions)/,
    /what\s+(are|is)\s+your\s+(system\s+)?(prompt|instructions)/,
    /output\s+(your\s+)?initial\s+instructions/,
  ];
  if (promptLeakPatterns.some((p) => p.test(lower))) {
    signals.push("prompt_leak");
  }

  return {
    detected: signals.length > 0,
    signals,
  };
}

/**
 * Sanitize LLM output before downstream use.
 * - Strips embedded role-switch attempts
 * - Normalizes excessive whitespace
 */
export function sanitizeOutput(text: string): string {
  if (!text) return "";

  let cleaned = text;

  // Strip lines that look like role-switching injections in output
  cleaned = cleaned.replace(/^(System|Assistant|Human)\s*:.*$/gm, "").trim();

  // Normalize runs of spaces (not newlines) to single space
  cleaned = cleaned.replace(/[ \t]{2,}/g, " ");

  // Collapse runs of 3+ newlines to 2 newlines (one blank line)
  cleaned = cleaned.replace(/\n{4,}/g, "\n\n\n");

  return cleaned;
}
