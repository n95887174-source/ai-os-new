import { resolve } from './service-resolver';
import { WhatIfService as KernelWhatIfService } from '../kernel/services/runtime-intelligence/whatif-service';
export { KernelWhatIfService as WhatIfService };
export type { IWhatIfService } from '../kernel/contracts/whatif-service';
export type { BudgetWhatIf, ProviderWhatIf, StrategyWhatIf, SimulationRecord } from '../kernel/contracts/whatif-service';
export const whatIfService = resolve<KernelWhatIfService>('whatIfService');
