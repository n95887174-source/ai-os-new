/**
 * SuperAgents OS - Dependency Injection Container (legacy re-export)
 * Implementation lives in src/kernel/container.ts
 */

export type { ServiceIdentifier } from '../kernel/container';
export { Container } from '../kernel/container';
export type { IContainer } from '../kernel/container';

import { runtime } from '../kernel/runtime';

/**
 * Runtime container singleton — all services registered in bootstrap.
 * Use this instead of `new Container()` to avoid DI graph split.
 */
export const container = runtime.getContainer();
