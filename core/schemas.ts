/**
 * Zod schemas for runtime validation of all core types.
 *
 * These replace the hand-rolled validators in validators.ts with
 * composable, type-safe schemas that produce proper error messages.
 */

import { z } from "zod";
import { sanitizeInput } from "./sanitize";

// --- Primitive helpers ---

/**
 * A string that is sanitized (null bytes/control chars stripped) and length-checked.
 * Use this for any user-supplied text field.
 */
export function sanitizedString(maxLength: number) {
  return z
    .string()
    .min(1, "String cannot be empty")
    .max(maxLength, `String exceeds maximum length of ${maxLength}`)
    .transform((val) => sanitizeInput(val));
}

// --- Core types ---

export const MessageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string().min(1),
});

export const UsageSchema = z.object({
  inputTokens: z.number().int().nonnegative(),
  outputTokens: z.number().int().nonnegative(),
});

export const LLMResponseSchema = z.object({
  content: z.string(),
  model: z.string().min(1),
  usage: UsageSchema,
  metadata: z
    .object({
      id: z.string().optional(),
      stopReason: z.string().optional(),
    })
    .passthrough()
    .optional(),
});

export const RunFlagsSchema = z
  .object({
    concurrency: z.number().int().positive().optional(),
    timeoutMs: z.number().positive().optional(),
    model: z.string().optional(),
    temperature: z.number().min(0).max(2).optional(),
    provider: z.enum(["anthropic", "openai", "openrouter"]).optional(),
    config: z.record(z.string(), z.unknown()).optional(),
    debug: z.boolean().optional(),
  })
  .partial();

export const ProviderConfigSchema = z.object({
  name: z.string().min(1),
  apiKey: z.string().min(1, "API key cannot be empty"),
  baseURL: z.string().url().optional(),
  defaultModel: z.string().optional(),
});

// --- Type exports (inferred from schemas) ---

export type MessageZ = z.infer<typeof MessageSchema>;
export type LLMResponseZ = z.infer<typeof LLMResponseSchema>;
export type RunFlagsZ = z.infer<typeof RunFlagsSchema>;
export type ProviderConfigZ = z.infer<typeof ProviderConfigSchema>;
