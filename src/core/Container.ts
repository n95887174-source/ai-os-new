/**
 * SuperAgents OS - Dependency Injection Container (legacy re-export)
 * Implementation lives in src/kernel/container.ts
 */

export type { ServiceIdentifier } from '../kernel/container';
export { Container } from '../kernel/container';
export type { IContainer } from '../kernel/container';

import { Container as KernelContainer } from '../kernel/container';
export const container = new KernelContainer();
