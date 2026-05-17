import { container } from '../core/Container';
import { MCPService as KernelMCP } from '../kernel/services/mcp-service';

export type { MCPServerConfig, MCPResource, MCPTool } from '../kernel/services/mcp-service';

// Use a proxy to avoid circular dependencies and ensure we use the container-managed instance
export const mcpService = new Proxy({} as KernelMCP, {
  get: (_target, prop) => {
    try {
      const instance = container.get<KernelMCP>('mcpService');
      const val = (instance as any)[prop];
      if (typeof val === 'function') return val.bind(instance);
      return val;
    } catch (e) {
      // Fallback for early access
      return (KernelMCP.prototype as any)[prop];
    }
  }
});

export { KernelMCP as MCPService };
