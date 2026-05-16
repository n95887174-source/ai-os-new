export type ServiceIdentifier = string | symbol;

export interface IContainer {
  register<T>(id: ServiceIdentifier, instance: T): void;
  registerFactory<T>(id: ServiceIdentifier, factory: (container: IContainer) => T): void;
  get<T>(id: ServiceIdentifier): T;
  has(id: ServiceIdentifier): boolean;
  clear(): void;
}

export class Container implements IContainer {
  private services = new Map<ServiceIdentifier, unknown>();
  private factories = new Map<ServiceIdentifier, (container: IContainer) => unknown>();

  register<T>(id: ServiceIdentifier, instance: T): void {
    this.services.set(id, instance);
  }

  registerFactory<T>(id: ServiceIdentifier, factory: (container: IContainer) => T): void {
    this.factories.set(id, factory);
  }

  get<T>(id: ServiceIdentifier): T {
    if (this.services.has(id)) {
      return this.services.get(id) as T;
    }

    const factory = this.factories.get(id);
    if (factory) {
      const instance = factory(this);
      this.services.set(id, instance);
      return instance as T;
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
