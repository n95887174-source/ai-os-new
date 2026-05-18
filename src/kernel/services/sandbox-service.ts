import { CONFIG } from './config-registry';

export interface SandboxServiceDeps {
  toolService: {
    execute: (toolId: string, input: unknown) => Promise<unknown>;
  };
}

export class SandboxService {
  private deps: SandboxServiceDeps;
  private activeWorkers = new Set<Worker>();
  private proxyUrl = (() => {
    const base = import.meta.env.VITE_PROXY_URL || 'http://localhost:3001/fetch';
    return base.includes('?url=') ? base : `${base}?url=`;
  })();

  constructor(deps: SandboxServiceDeps) {
    this.deps = deps;
  }

  async init(): Promise<void> {}

  destroy() {
    for (const worker of this.activeWorkers) {
      worker.terminate();
    }
    this.activeWorkers.clear();
  }

  async fetchUrl(url: string, options?: { timeoutMs?: number }): Promise<string> {
    const timeoutMs = options?.timeoutMs ?? CONFIG?.services?.sandbox?.fetchTimeoutMs ?? 10000;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timer);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch (e) {
      clearTimeout(timer);
      console.warn('[SandboxService] Direct fetch failed, trying proxy:', e);
      const proxyRes = await fetch(`${this.proxyUrl}${encodeURIComponent(url)}`);
      if (!proxyRes.ok) throw new Error(`Proxy returned HTTP ${proxyRes.status}`, { cause: e as Error });
      const text = await proxyRes.text();
      try {
        const err = JSON.parse(text);
        if (err.error) throw new Error(err.error, { cause: e as Error });
      } catch {
        if (import.meta.env.DEV) {
          console.debug('[SandboxService] Proxy response not JSON, returning raw text');
        }
      }
      return text;
    }
  }

  async execute(code: string, data: unknown = {}, timeoutMs: number = CONFIG?.services?.sandbox?.codeExecutionTimeoutMs ?? 5000, allowedTools: string[] = []): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const worker = new Worker(new URL('../../services/sandbox.worker.ts', import.meta.url), {
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
              const result = await this.deps.toolService.execute(params.toolId, params.input);
              worker.postMessage({ type: 'cap_response', requestId, result });
            } catch (error: unknown) {
              worker.postMessage({ type: 'cap_response', requestId, error: error instanceof Error ? error.message : String(error) });
            }
          }
          return;
        }

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
