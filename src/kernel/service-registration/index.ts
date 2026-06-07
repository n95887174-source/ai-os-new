/**
 * Service registration — phase orchestrator.
 *
 * The 686-line `registerServices()` god-function has been split into
 * six phase files.  This module runs them in dependency order:
 *
 *   1. Foundation       — settings, pricing, kernel, keyService
 *   2. Infrastructure   — rotation, policy, tool, memory, cognitive
 *   3. Debate & Runtime — debateService, debateEngine, intelligence
 *   4. Agents & Roles   — agentService, orchestrator, roleService
 *   5. Routing & LLM    — router, LLM client, cache, advisor
 *   6. High-level       — chat, workspace, probe, webhooks, etc.
 *
 * Each phase only depends on services registered by earlier phases.
 * The container's `!has` guard inside `register()` makes re-runs
 * idempotent.
 */
import { makeHelpers } from './helpers';
import { registerPhase1 } from './phase1-foundation';
import { registerPhase2 } from './phase2-infrastructure';
import { registerPhase3 } from './phase3-debate-runtime';
import { registerPhase4 } from './phase4-agents-roles';
import { registerPhase5 } from './phase5-routing-llm';
import { registerPhase6 } from './phase6-high-level';
import type { IContainer } from '../container';
import type { IEventBus } from '../types/interfaces';

export function registerServices(
  container: IContainer,
  eventBus: IEventBus,
  registerWithLifecycle: (name: string, instance: unknown) => void,
): void {
  const ctx = { container, eventBus, registerWithLifecycle };
  const helpers = makeHelpers(ctx);

  registerPhase1(helpers, ctx);
  registerPhase2(helpers, ctx);
  registerPhase3(helpers, ctx);
  registerPhase4(helpers, ctx);
  registerPhase5(helpers, ctx);
  registerPhase6(helpers, ctx);
}

export type { PhaseContext, Phase } from './helpers';
