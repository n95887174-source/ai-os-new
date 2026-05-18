import { createServiceProxy } from './create-service-proxy';
import { ToolService as KernelTool } from '../kernel/services/tool-executor';

export type { ToolCategory, ToolDefinition, ToolExecution } from '../kernel/services/tool-executor';

export const toolService = createServiceProxy('toolService', KernelTool);
export { KernelTool as ToolService };
