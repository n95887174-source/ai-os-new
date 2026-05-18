import { container } from './Container';
import { eventBus } from './events';
import { SystemBootstrap as KernelBootstrap } from '../kernel/bootstrap';
import type { InitPhase, BootstrapReport } from '../kernel/bootstrap';
import { db } from './DatabaseService';
import { kernel } from './Kernel';
import { securityService } from './SecurityService';
import { ProviderAdapterRegistry } from '../kernel/services/provider-adapter-registry';

export type { InitPhase, BootstrapReport };

/**
 * Legacy Bootstrap re-export that delegates to the Unified Kernel Bootstrap.
 * Part of Phase 1.1: Sunset legacy bootstrap processes.
 */
class LegacyBootstrapWrapper {
  private delegate: KernelBootstrap;

  constructor() {
    // Register core infrastructure in container before initializing kernel
    container.register('database', db);
    container.register('eventBus', eventBus);
    container.register('securityService', securityService);
    container.register('adapterRegistry', new ProviderAdapterRegistry());

    this.delegate = new KernelBootstrap(container, eventBus);
  }

  async init(): Promise<BootstrapReport> {
    return this.delegate.init();
  }

  async shutdown(): Promise<void> {
    return this.delegate.shutdown();
  }

  getReport(): BootstrapReport {
    return this.delegate.getReport();
  }

  getPhase(): InitPhase {
    return this.delegate.getPhase();
  }

  isReady(): boolean {
    return this.delegate.isReady();
  }
}

export const bootstrapper = new LegacyBootstrapWrapper();
