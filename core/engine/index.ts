/**
 * Engine: composition primitives for institutional frameworks.
 *
 * A framework is a TS function built from Session primitives. The engine owns
 * provider resolution, model-role registry, audit trail, cost guardrails, and
 * event emission. Frameworks keep only prompts, flow, and result assembly.
 */
export type { EngineEvent, EventSink } from './events';
export { Session, BudgetExceededError } from './session';
export type { AgentSpec, StepOptions, StepResult, Budget } from './session';
export { defineFramework } from './define';
export type { FrameworkDefinition, FrameworkRunOutput } from './define';
export { MODEL_REGISTRY, createModelResolution } from './models';
export type { ModelRole, RoleMap, ModelResolution } from './models';
export { prettyReporter, jsonReporter } from './reporters';
