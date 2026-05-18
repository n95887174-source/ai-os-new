import { resolve } from './service-resolver';
import { MemoryService as KernelMemory } from '../kernel/services/memory-engine';
export { KernelMemory as MemoryService };
export type { SearchMode } from '../kernel/services/memory-engine';
export const memoryService = resolve<KernelMemory>('memoryService');
