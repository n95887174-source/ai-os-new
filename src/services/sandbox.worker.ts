/**
 * SuperAgents OS - Sandbox Worker
 *
 * Provides an isolated execution context for agent-generated scripts.
 * WebWorkers have no access to DOM, window, or localStorage.
 */

self.onmessage = async (event: MessageEvent) => {
  const { code, data, timeout } = event.data;
  const EXEC_TIMEOUT = typeof timeout === 'number' && timeout > 0 ? timeout : 5000;

  // Capability bridge: allows worker to request main thread actions
  const os = {
    executeTool: async (toolId: string, input: unknown) => {
      const requestId = crypto.randomUUID();
      return new Promise((resolve, reject) => {
        const handler = (e: MessageEvent) => {
          if (e.data.type === 'cap_response' && e.data.requestId === requestId) {
            self.removeEventListener('message', handler);
            clearTimeout(toolTimeout);
            if (e.data.error) {
              reject(new Error(e.data.error));
            } else {
              resolve(e.data.result);
            }
          }
        };
        const toolTimeout = setTimeout(() => {
          self.removeEventListener('message', handler);
          reject(new Error(`Tool execution timed out after 5000ms`));
        }, 5000);
        self.addEventListener('message', handler);
        self.postMessage({ type: 'cap_request', requestId, method: 'executeTool', params: { toolId, input } });
      });
    }
  };

  try {
    // Code validation: prevent access to APIs that could be used for data exfiltration or DoS
    const forbiddenKeywords = [
      'importScripts', 'XMLHttpRequest', 'fetch', 'WebSocket', 'indexedDB',
      'eval', 'Function', 'constructor', '__proto__', 'prototype',
      'with', 'import', 'require'
    ];
    for (const keyword of forbiddenKeywords) {
      if (code.includes(keyword)) {
        throw new Error(`Code validation failed: Use of '${keyword}' is forbidden in sandbox`);
      }
    }
    // Block hex/octal escape obfuscation (e.g. \x66\x65\x74\x63\x68)
    if (/\\x[0-9a-fA-F]{2}/.test(code) || /\\u[0-9a-fA-F]{4}/.test(code)) {
      throw new Error('Code validation failed: Escape sequence obfuscation is forbidden');
    }

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
    const execPromise = fn(data, os);
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Execution timed out after ${EXEC_TIMEOUT}ms`)), EXEC_TIMEOUT);
    });

    const result = await Promise.race([execPromise, timeoutPromise]);

    if (result && typeof result === 'object' && (result as Record<string, unknown>).__error) {
      self.postMessage({ error: (result as Record<string, unknown>).__error as string });
    } else {
      self.postMessage({ result });
    }
  } catch (e) {
    self.postMessage({ error: (e as Error).message });
  }
};
