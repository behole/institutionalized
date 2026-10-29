/**
 * Model registry: role aliases resolved through one registry.
 *
 * Frameworks request roles ('reasoning', 'fast', 'cheap'), never model IDs.
 * New model drops are a one-line change here, not archaeology across 26 configs.
 * Per-run override via flags.model / flags.roleModels.
 */
import type { RunFlags } from '../types';

export type ModelRole = 'reasoning' | 'fast' | 'cheap' | 'judge';

/**
 * Role → concrete model ID. The single place model IDs live.
 * Update here to change models project-wide.
 */
export const MODEL_REGISTRY: Record<ModelRole, string> = {
  reasoning: 'claude-sonnet-4-5-20250929',
  fast: 'claude-haiku-4-5-20251001',
  cheap: 'claude-haiku-4-5-20251001',
  judge: 'claude-sonnet-4-5-20250929',
};

/** Framework-level default role: which registry slot a framework's agents use. */
export type RoleMap = Partial<Record<ModelRole, string>>;

export interface ModelResolution {
  resolve(role: ModelRole): string;
  /** Explicit model ID override wins over everything. */
  override?: string;
}

/**
 * Resolve models for a run: flags.model (explicit ID) > flags.roleModels
 * (per-role overrides) > registry defaults. Framework configs may map their
 * legacy role names (e.g. 'jury', 'advisor') to registry roles.
 */
export function createModelResolution(
  flags: RunFlags,
  roleMap?: Record<string, ModelRole>
): ModelResolution {
  const override = flags.model;
  const roleOverrides = (flags.roleModels as Partial<Record<ModelRole, string>> | undefined) ?? {};

  return {
    override,
    resolve(role: ModelRole): string {
      if (override) {
        return override;
      }
      if (roleOverrides[role]) {
        return roleOverrides[role];
      }
      const canonical = roleMap?.[role] ?? role;
      return MODEL_REGISTRY[canonical] ?? MODEL_REGISTRY.reasoning;
    },
  };
}
