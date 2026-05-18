import { resolve } from './service-resolver';
import { TraceService as KernelTrace } from '../kernel/services/trace-service';
export { KernelTrace as TraceService };
export type { TraceFilter, TraceExport } from '../kernel/services/trace-service';
export const traceService = resolve<KernelTrace>('traceService');
