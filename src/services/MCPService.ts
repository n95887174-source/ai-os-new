import { resolve } from './service-resolver';
import { MCPService as KernelMCP } from '../kernel/services/mcp-service';
export { KernelMCP as MCPService };
export type { MCPServerConfig, MCPResource, MCPTool } from '../kernel/services/mcp-service';
export const mcpService = resolve<KernelMCP>('mcpService');
