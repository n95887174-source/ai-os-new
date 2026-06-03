export type ServiceIdentifier = string | symbol;

export interface IContainer {
  register<T>(id: ServiceIdentifier, instance: T): void;
  registerFactory<T>(id: ServiceIdentifier, factory: (container: IContainer) => T): void;
  get<T>(id: ServiceIdentifier): T;
  has(id: ServiceIdentifier): boolean;
  clear(): void;
  getDependencies(): Record<string, string[]>;
  getServices(): string[];
}

export class Container implements IContainer {
  private services = new Map<ServiceIdentifier, unknown>();
  private factories = new Map<ServiceIdentifier, (container: IContainer) => unknown>();
  private dependencies = new Map<ServiceIdentifier, Set<ServiceIdentifier>>();
  private activeFactoryId: ServiceIdentifier | null = null;
  private resolving = new Set<ServiceIdentifier>();

  register<T>(id: ServiceIdentifier, instance: T): void {
    this.services.set(id, instance);
  }

  registerFactory<T>(id: ServiceIdentifier, factory: (container: IContainer) => T): void {
    this.factories.set(id, factory);
  }

  get<T>(id: ServiceIdentifier): T {
    if (this.resolving.has(id)) {
      throw new Error(`Circular dependency detected: ${String(id)} is already being resolved`);
    }

    if (this.activeFactoryId && this.activeFactoryId !== id) {
      if (!this.dependencies.has(this.activeFactoryId)) {
        this.dependencies.set(this.activeFactoryId, new Set());
      }
      this.dependencies.get(this.activeFactoryId)!.add(id);
    }

    if (this.services.has(id)) {
      return this.services.get(id) as T;
    }

    const factory = this.factories.get(id);
    if (factory) {
      const prev = this.activeFactoryId;
      this.activeFactoryId = id;
      this.resolving.add(id);
      try {
        const instance = factory(this);
        this.services.set(id, instance);
        return instance as T;
      } finally {
        this.resolving.delete(id);
        this.activeFactoryId = prev;
      }
    }

    throw new Error(`Service not found: ${String(id)}`);
  }

  has(id: ServiceIdentifier): boolean {
    return this.services.has(id) || this.factories.has(id);
  }

  clear(): void {
    for (const service of this.services.values()) {
      if (service && typeof (service as Record<string, unknown>).destroy === 'function') {
        try { (service as { destroy: () => void }).destroy(); } catch { /* ignore */ }
      }
    }
    this.services.clear();
    this.factories.clear();
    this.dependencies.clear();
  }

  getDependencies(): Record<string, string[]> {
    const result: Record<string, string[]> = {};
    for (const [svc, deps] of this.dependencies.entries()) {
      result[String(svc)] = Array.from(deps).map(String);
    }
    return result;
  }

  getServices(): string[] {
    const all = new Set([...this.services.keys(), ...this.factories.keys()]);
    return Array.from(all).map(String);
  }
}
