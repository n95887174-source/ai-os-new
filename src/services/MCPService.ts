import { eventBus } from '../core/events';
import { db } from '../core/DatabaseService';
import { MCPService as KernelMCP } from '../kernel/services/mcp-service';

export type { MCPServerConfig, MCPResource, MCPTool } from '../kernel/services/mcp-service';

export class MCPService extends KernelMCP {
  constructor() {
    super({ eventBus, database: db });
    this.init().catch(() => {});
  }
}

export const mcpService = new MCPService();
