import { eventBus } from '../core/events';
import { memoryService } from './MemoryService';
import { sandboxService } from './SandboxService';
import { pluginRegistry } from '../core/PluginSDK';
import { mcpService } from './MCPService';
import { db } from '../core/DatabaseService';
import { ToolService as KernelTool } from '../kernel/services/tool-executor';

export type { ToolCategory, ToolDefinition, ToolExecution } from '../kernel/services/tool-executor';

export class ToolService extends KernelTool {
  constructor() {
    super({
      eventBus,
      database: db,
      memoryService: memoryService as any,
      sandboxService: sandboxService as any,
      pluginRegistry: pluginRegistry as any,
      mcpService: mcpService as any,
    });
  }
}

export const toolService = new ToolService();
