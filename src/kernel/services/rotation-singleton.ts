import { RotationService } from './rotation-service';

let instance: RotationService | null = null;
let initialized = false;

export function getRotationService(): RotationService {
  if (!instance) {
    instance = new RotationService({
      keyManager: { getKeys: () => [], addKey: async () => ({} as any), updateKey: () => {} },
      eventBus: { on: () => () => {}, emit: () => {} },
    });
    initialized = false;
  }
  return instance;
}

export function setRotationService(svc: RotationService): void {
  instance = svc;
  initialized = true;
}

export function isRotationServiceReady(): boolean {
  return initialized && instance !== null;
}
