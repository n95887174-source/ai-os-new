import { RotationService } from './rotation-service';

let instance: RotationService | null = null;
let initialized = false;

export function getRotationService(): RotationService {
  if (!instance || !initialized) {
    throw new Error('RotationService not initialized. Call setRotationService() first.');
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
