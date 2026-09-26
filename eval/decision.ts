/**
 * Normalized decision vocabulary for eval scoring across frameworks.
 * Every framework's result carries `metadata.decision` mapped onto this.
 */
export type NormalizedDecision = 'approve' | 'reject' | 'delay' | 'unclear';

export const DECISION = {
  approve: 'approve',
  reject: 'reject',
  delay: 'delay',
  unclear: 'unclear',
} as const;
