import { createServiceProxy } from './create-service-proxy';
import { DiagnosticService as KernelDiagnosticService } from '../kernel/services/runtime-intelligence/diagnostic-service';

export type {
  IDiagnosticService, DiagnosticScope, ProviderDiagnostic, SystemDiagnostic, DiagnosticRunRecord,
} from '../kernel/contracts/diagnostic-service';

export const diagnosticService = createServiceProxy<KernelDiagnosticService>('diagnosticService');
export { KernelDiagnosticService as DiagnosticService };
