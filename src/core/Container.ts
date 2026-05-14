/**
 * SuperAgents OS - Dependency Injection Container
 * Manages service lifecycles and eliminates singleton contamination.
 */

export type ServiceIdentifier = string | symbol;

export class Container {
  private services = new Map<ServiceIdentifier, any>();
  private factories = new Map<ServiceIdentifier, (container: Container) => any>();

  register<T>(id: ServiceIdentifier, instance: T): void {
    this.services.set(id, instance);
  }

  registerFactory<T>(id: ServiceIdentifier, factory: (container: Container) => T): void {
    this.factories.set(id, factory);
  }

  get<T>(id: ServiceIdentifier): T {
    if (this.services.has(id)) {
      return this.services.get(id);
    }

    const factory = this.factories.get(id);
    if (factory) {
      const instance = factory(this);
      this.services.set(id, instance);
      return instance;
    }

    throw new Error(`Service not found: ${String(id)}`);
  }

  has(id: ServiceIdentifier): boolean {
    return this.services.has(id) || this.factories.has(id);
  }

  clear(): void {
    this.services.clear();
    this.factories.clear();
  }
}

export const container = new Container();
