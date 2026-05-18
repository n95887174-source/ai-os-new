import { resolve } from './service-resolver';
import { DiagnosticService as KernelDiagnosticService } from '../kernel/services/runtime-intelligence/diagnostic-service';
export { KernelDiagnosticService as DiagnosticService };
export type { IDiagnosticService } from '../kernel/contracts/diagnostic-service';
export type { DiagnosticScope, ProviderDiagnostic, SystemDiagnostic, DiagnosticRunRecord } from '../kernel/contracts/diagnostic-service';
export const diagnosticService = resolve<KernelDiagnosticService>('diagnosticService');
