export { resolveModuleGraph, type ResolvedGraph } from './resolver.js';
export { createPlan, type Plan, serializePlan, deserializePlan } from './planner.js';

/**
 * @deprecated Use resolveModuleGraph and createPlan directly.
 */
export const SkeletonPlaceholder = {};
