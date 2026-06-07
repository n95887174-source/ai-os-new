/**
 * Shared helpers for service-registration phase files.
 *
 * Each phase receives a `PhaseContext` and uses these helpers to register
 * services in the DI container.  Phases must be called in order
 * (foundation → infrastructure → debate-runtime → agents-roles →
 * routing-llm → high-level) because later phases depend on services
 * registered by earlier ones.
 */
import type { IContainer } from '../container';
import type { IEventBus } from '../types/interfaces';

export interface PhaseContext {
  container: IContainer;
  eventBus: IEventBus;
  registerWithLifecycle: (name: string, instance: unknown) => void;
}

/**
 * Phase-local register/get/asDeps closures.  Calling `makeHelpers`
 * inside a phase file keeps the closure variables out of module scope
 * while still letting each phase share the same idioms.
 */
export function makeHelpers(ctx: PhaseContext) {
  const register = <T>(name: string, instance: T): void => {
    if (!ctx.container.has(name)) {
      ctx.container.register(name, instance);
      ctx.registerWithLifecycle(name, instance);
    }
  };
  const get = <T>(name: string): T => ctx.container.get<T>(name);
  const asDeps = <T>(value: unknown): T => value as T;
  return { register, get, asDeps };
}

export type PhaseHelpers = ReturnType<typeof makeHelpers>;
export type Phase = (helpers: PhaseHelpers, ctx: PhaseContext) => void;
