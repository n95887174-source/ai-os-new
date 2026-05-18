import { createServiceProxy } from './create-service-proxy';
import { MCPService as KernelMCP } from '../kernel/services/mcp-service';

export type { MCPServerConfig, MCPResource, MCPTool } from '../kernel/services/mcp-service';

export const mcpService = createServiceProxy('mcpService', KernelMCP);
export { KernelMCP as MCPService };
