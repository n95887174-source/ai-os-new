import { resolve } from './service-resolver';
import { PressureMapService as KernelPressureMapService } from '../kernel/services/runtime-intelligence/pressure-map-service';
export { KernelPressureMapService as PressureMapService };
export type { IPressureMapService } from '../kernel/contracts/pressure-map-service';
export type { ProviderPressureEntry, SessionPressureEntry } from '../kernel/contracts/pressure-map-service';
export type { PressureMapSnapshot, PressureTrendPoint, PressureAlert } from '../kernel/contracts/pressure-map-service';
export const pressureMapService = resolve<KernelPressureMapService>('pressureMapService');
