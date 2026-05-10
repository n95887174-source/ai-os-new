/**
 * SuperAgents OS - Sandbox Service
 * 
 * Manages the lifecycle of WebWorkers used for code execution.
 */

import { toolService } from './ToolService';

export class SandboxService {
  private activeWorkers = new Set<Worker>();

  destroy() {
    for (const worker of this.activeWorkers) {
      worker.terminate();
    }
    this.activeWorkers.clear();
  }

  /**
   * Executes JavaScript code in a isolated WebWorker.
   */
<<<<<<< HEAD
  async execute(code: string, data: unknown = {}, timeoutMs: number = 5000, allowedTools: string[] = []): Promise<unknown> {
=======
  async execute(code: string, data: unknown = {}, timeoutMs: number = 5000): Promise<unknown> {
>>>>>>> 54e1276a5d5730e4e3edce0bb2038b8d9038b261
    return new Promise((resolve, reject) => {
      const worker = new Worker(new URL('./sandbox.worker.ts', import.meta.url), {
        type: 'module'
      });
      this.activeWorkers.add(worker);

      const cleanup = () => {
        worker.terminate();
        this.activeWorkers.delete(worker);
      };

      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error(`Execution timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      let toolExecutionCount = 0;
      const MAX_TOOL_EXECUTIONS = 10;

      worker.onmessage = async (event) => {
        // Handle Capability Requests
        if (event.data.type === 'cap_request') {
          const { requestId, method, params } = event.data;
          
          if (method === 'executeTool') {
            if (allowedTools.length > 0 && !allowedTools.includes('*') && !allowedTools.includes(params.toolId)) {
              worker.postMessage({ type: 'cap_response', requestId, error: `Tool execution denied: ${params.toolId} is not in allowedTools` });
              return;
            }

            toolExecutionCount++;
            if (toolExecutionCount > MAX_TOOL_EXECUTIONS) {
              worker.postMessage({ type: 'cap_response', requestId, error: `Rate limit exceeded: Sandbox allows maximum ${MAX_TOOL_EXECUTIONS} tool calls` });
              return;
            }

            try {
              if (typeof params.toolId !== 'string') {
                throw new Error('toolId must be a string');
              }
              const result = await toolService.execute(params.toolId, params.input);
              worker.postMessage({ type: 'cap_response', requestId, result });
            } catch (error: unknown) {
              worker.postMessage({ type: 'cap_response', requestId, error: error instanceof Error ? error.message : String(error) });
            }
          }
          return; // Don't terminate yet
        }

        // Handle Final Result
        clearTimeout(timeout);
        cleanup();
        if (event.data.error) {
          reject(new Error(event.data.error));
        } else {
          resolve(event.data.result);
        }
      };

      worker.onerror = (error) => {
        clearTimeout(timeout);
        cleanup();
        reject(error);
      };

      worker.postMessage({ code, data, timeout: timeoutMs });
    });
  }
}

export const sandboxService = new SandboxService();
