import { createServiceProxy } from './create-service-proxy';
import { MemoryService as KernelMemory } from '../kernel/services/memory-engine';

export type { SearchMode } from '../kernel/services/memory-engine';

export const memoryService = createServiceProxy('memoryService', KernelMemory);
export { KernelMemory as MemoryService };
