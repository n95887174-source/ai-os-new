import { createServiceProxy } from './create-service-proxy';
import { PressureMapService as KernelPressureMapService } from '../kernel/services/runtime-intelligence/pressure-map-service';

export type {
  IPressureMapService, ProviderPressureEntry, SessionPressureEntry,
  PressureMapSnapshot, PressureTrendPoint, PressureAlert,
} from '../kernel/contracts/pressure-map-service';

export const pressureMapService = createServiceProxy<KernelPressureMapService>('pressureMapService');
export { KernelPressureMapService as PressureMapService };
