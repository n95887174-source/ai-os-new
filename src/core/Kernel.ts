/**
 * SystemKernel - Legacy re-export layer
 * Implementation lives in src/kernel/kernel.ts
 */

import { SystemKernel as KernelSystemKernel } from '../kernel/kernel';
import { eventBus } from './events';
import { db } from './DatabaseService';

export class SystemKernel extends KernelSystemKernel {
  constructor() {
    super({ eventBus, database: db });
  }
}

export const kernel = new SystemKernel();
