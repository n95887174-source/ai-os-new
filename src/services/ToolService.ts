import { resolve } from './service-resolver';
import { ToolService as KernelTool } from '../kernel/services/tool-executor';
export { KernelTool as ToolService };
export type { ToolCategory, ToolDefinition, ToolExecution } from '../kernel/services/tool-executor';
export const toolService = resolve<KernelTool>('toolService');
