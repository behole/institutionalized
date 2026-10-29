import { z } from 'zod';

export const judgeResponseSchema = z.object({
  scores: z.array(
    z.object({
      candidate: z.enum(['A', 'B']),
      score: z.number().min(0).max(1),
      rationale: z.string(),
    })
  ),
});

export type JudgeResponse = z.infer<typeof judgeResponseSchema>;
