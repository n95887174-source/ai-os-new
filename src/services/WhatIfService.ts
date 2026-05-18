import { createServiceProxy } from './create-service-proxy';
import { WhatIfService as KernelWhatIfService } from '../kernel/services/runtime-intelligence/whatif-service';

export type {
  IWhatIfService, BudgetWhatIf, ProviderWhatIf, StrategyWhatIf, SimulationRecord,
} from '../kernel/contracts/whatif-service';

export const whatIfService = createServiceProxy<KernelWhatIfService>('whatIfService');
export { KernelWhatIfService as WhatIfService };
