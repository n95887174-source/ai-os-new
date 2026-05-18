import { createServiceProxy } from './create-service-proxy';
import { TraceService as KernelTrace } from '../kernel/services/trace-service';

export type { TraceFilter, TraceExport } from '../kernel/services/trace-service';

export const traceService = createServiceProxy('traceService', KernelTrace);
export { KernelTrace as TraceService };
