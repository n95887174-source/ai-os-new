import { container } from '../core/Container';
import { ToolService as KernelTool } from '../kernel/services/tool-executor';

export type { ToolCategory, ToolDefinition, ToolExecution } from '../kernel/services/tool-executor';

// Use a proxy to avoid circular dependencies and ensure we use the container-managed instance
export const toolService = new Proxy({} as KernelTool, {
  get: (_target, prop) => {
    try {
      const instance = container.get<KernelTool>('toolService');
      const val = (instance as any)[prop];
      if (typeof val === 'function') return val.bind(instance);
      return val;
    } catch (e) {
      // Fallback for early access
      return (KernelTool.prototype as any)[prop];
    }
  }
});

export { KernelTool as ToolService };
