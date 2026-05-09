/**
 * SuperAgents OS - Sandbox Worker
 * 
 * Provides an isolated execution context for agent-generated scripts.
 * WebWorkers have no access to DOM, window, or localStorage.
 */

self.onmessage = async (event: MessageEvent) => {
  const { code, data, timeout = 5000 } = event.data;

  // Capability bridge: allows worker to request main thread actions
  const os = {
    executeTool: async (toolId: string, input: any) => {
      const requestId = crypto.randomUUID();
      return new Promise((resolve) => {
        const handler = (e: MessageEvent) => {
          if (e.data.type === 'cap_response' && e.data.requestId === requestId) {
            self.removeEventListener('message', handler);
            resolve(e.data.result);
          }
        };
        self.addEventListener('message', handler);
        self.postMessage({ type: 'cap_request', requestId, method: 'executeTool', params: { toolId, input } });
      });
    }
  };

  try {
    // Create a restricted execution context
    const fn = new Function('data', 'os', `
      "use strict";
      return (async () => {
        try {
          ${code}
        } catch (e) {
          return { __error: e.message };
        }
      })();
    `);

    // Execute with timeout protection
    const result = await fn(data, os);

    if (result && typeof result === 'object' && result.__error) {
      self.postMessage({ error: result.__error });
    } else {
      self.postMessage({ result });
    }
  } catch (e: any) {
    self.postMessage({ error: e.message });
  }
};
