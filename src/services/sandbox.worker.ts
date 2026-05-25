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
      const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const wordBoundary = new RegExp(`\\b${escaped}\\b`);
      if (wordBoundary.test(code)) {
        throw new Error(`Code validation failed: Use of '${keyword}' is forbidden in sandbox`);
      }
      const substrings = keyword.split(/(?=[A-Z])/);
      if (substrings.length < 2) continue;
      for (let i = 0; i < substrings.length; i++) {
        const parts = [substrings.slice(0, i + 1).join(''), substrings.slice(i + 1).join('')];
        const concatPattern = new RegExp(parts.map(p => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join(`['"\`]\\s*\\+\\s*['"\`]`));
        if (concatPattern.test(code)) {
          throw new Error(`Code validation failed: Obfuscated '${keyword}' detected (concatenation bypass)`);
        }
      }
    }
    // Block hex/octal escape obfuscation (e.g. \x66\x65\x74\x63\x68)
    if (/\\x[0-9a-fA-F]{2}/.test(code) || /\\u[0-9a-fA-F]{4}/.test(code)) {
      throw new Error('Code validation failed: Escape sequence obfuscation is forbidden');
    }
    // Block base64-encoded strings (common obfuscation)
    if (/["'`]atob\s*\(/.test(code) || /["'`]btoa\s*\(/.test(code)) {
      throw new Error('Code validation failed: Base64 encoding is forbidden');
    }

    // Create a restricted proxy for the global scope (Audit P0 Fix)
    const sandboxProxy = new Proxy(Object.create(null), {
      get: (_: unknown, prop: string) => {
        if (prop === 'os') return os;
        if (prop === 'data') return data;
        if (prop === 'console') return console;
        if (['Math', 'Date', 'JSON', 'crypto', 'URL', 'Uint8Array', 'Int32Array', 'Float32Array', 'TextEncoder', 'TextDecoder'].includes(prop)) {
          return (self as Record<string, unknown>)[prop];
        }
        return undefined;
      },
      has: () => true,
      set: () => false,
      deleteProperty: () => false
    });

    // Create a restricted execution context using an IIFE to shadow sensitive globals
    const fn = new Function('data', 'os', 'proxySelf', `
      "use strict";
      const { fetch, XMLHttpRequest, WebSocket, importScripts, indexedDB, postMessage, addEventListener, removeEventListener } = {};
      return (async (self, globalThis) => {
        try {
          ${code}
        } catch (e) {
          return { __error: e.message };
        }
      })(proxySelf, proxySelf);
    `);

    // Execute with timeout protection
    const execPromise = fn(data, os, sandboxProxy);
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Execution timed out after ${EXEC_TIMEOUT}ms`)), EXEC_TIMEOUT);
    });

    const result = await Promise.race([execPromise, timeoutPromise]);

    if (result && typeof result === 'object' && '__error' in (result as Record<string, unknown>)) {
      self.postMessage({ error: String((result as Record<string, unknown>).__error) });
    } else {
      self.postMessage({ result });
    }
  } catch (e) {
    self.postMessage({ error: (e as Error).message });
  }
};
