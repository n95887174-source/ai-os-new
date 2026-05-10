/**
 * SuperAgents OS - Sandbox Service
 * 
 * Manages the lifecycle of WebWorkers used for code execution.
 */

import { toolService } from './ToolService';

export class SandboxService {
  /**
   * Executes JavaScript code in a isolated WebWorker.
   */
  async execute(code: string, data: any = {}, timeoutMs: number = 5000): Promise<any> {
    return new Promise((resolve, reject) => {
      const worker = new Worker(new URL('./sandbox.worker.ts', import.meta.url), {
        type: 'module'
      });

      const timeout = setTimeout(() => {
        worker.terminate();
        reject(new Error(`Execution timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      worker.onmessage = async (event) => {
        // Handle Capability Requests
        if (event.data.type === 'cap_request') {
          const { requestId, method, params } = event.data;
          
          if (method === 'executeTool') {
            try {
              const result = await toolService.execute(params.toolId, params.input);
              worker.postMessage({ type: 'cap_response', requestId, result });
            } catch (error: any) {
              worker.postMessage({ type: 'cap_response', requestId, error: error.message });
            }
          }
          return; // Don't terminate yet
        }

        // Handle Final Result
        clearTimeout(timeout);
        worker.terminate();
        if (event.data.error) {
          reject(new Error(event.data.error));
        } else {
          resolve(event.data.result);
        }
      };

      worker.onerror = (error) => {
        clearTimeout(timeout);
        worker.terminate();
        reject(error);
      };

      worker.postMessage({ code, data, timeout: timeoutMs });
    });
  }
}

export const sandboxService = new SandboxService();
