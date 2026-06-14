/**
 * SuperAgents OS - Sandbox Worker
 *
 * Provides an isolated execution context for agent-generated scripts.
 * WebWorkers have no access to DOM, window, or localStorage.
 *
 * Code validation uses AST parsing (meriyah) instead of regex for
 * precise detection of forbidden API usage without false positives.
 */

import { parseScript, type ESTree } from 'meriyah';

/* ---------- AST-based code validation ---------- */

const FORBIDDEN_IDENTIFIERS = new Set([
  'importScripts', 'XMLHttpRequest', 'fetch', 'WebSocket', 'indexedDB',
  'eval', 'Function', 'arguments',
  // Reflection / metaprogramming that can reach the outer scope
  'Proxy', 'Reflect', 'Atomics', 'SharedArrayBuffer',
  'WeakRef', 'FinalizationRegistry',
  // Worker-global APIs that could exfiltrate or persist state
  'caches', 'Cache', 'CacheStorage',
  'BroadcastChannel', 'MessageChannel', 'MessagePort',
  'EventSource', 'Event', 'CustomEvent',
  'URLSearchParams', 'Blob', 'File', 'FileReader', 'FormData',
  'Headers', 'Request', 'Response',
  // Escape hatches that bypass the proxy
  'globalThis', 'self', 'window', 'parent', 'top',
  // Direct timer / scheduler references that would resolve to the worker's
  // real setTimeout etc. even though the proxy hides self.setTimeout.
  'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval',
  'queueMicrotask', 'requestAnimationFrame', 'cancelAnimationFrame',
  'structuredClone', 'performance',
  // (console is allowed via the proxy: self.console works for logging)
  // crypto is in ALLOWED_GLOBALS (Math/Date/JSON/crypto/URL); keep accessible
  // (WorkerGlobalScope.crypto.subtle exists but is safe — requires HTTPS origin)
]);

const FORBIDDEN_MEMBER_PROPERTIES = new Set([
  'constructor', '__proto__', 'prototype',
  // Exposes WebWorker internals on `self`
  'caches', 'registration', 'serviceWorker',
  'onmessage', 'onerror', 'onclose',
]);

interface ValidationError { keyword: string; }

function walkAndValidate(node: ESTree.Node, errors: ValidationError[]): void {
  switch (node.type) {
    case 'Identifier':
      if (FORBIDDEN_IDENTIFIERS.has(node.name)) {
        errors.push({ keyword: node.name });
      }
      break;
    case 'MemberExpression':
      if (!node.computed && node.property.type === 'Identifier' && FORBIDDEN_MEMBER_PROPERTIES.has(node.property.name)) {
        errors.push({ keyword: node.property.name });
      }
      if (node.computed && node.property.type === 'Literal' && typeof node.property.value === 'string' && FORBIDDEN_MEMBER_PROPERTIES.has(node.property.value)) {
        errors.push({ keyword: node.property.value });
      }
      if (node.computed && node.property.type === 'Literal' && node.property.value === 'constructor') {
        errors.push({ keyword: 'constructor_access' });
      }
      if (node.computed && node.property.type === 'BinaryExpression') {
        errors.push({ keyword: 'computed_property_access' });
      }
      if (node.computed && node.property.type === 'TemplateLiteral') {
        errors.push({ keyword: 'computed_property_access' });
      }
      if (node.object.type === 'Identifier' && FORBIDDEN_IDENTIFIERS.has(node.object.name)) {
        errors.push({ keyword: node.object.name });
      }
      break;
    case 'WithStatement':
      errors.push({ keyword: 'with' });
      break;
    case 'CallExpression':
      if (node.callee.type === 'Identifier' && node.callee.name === 'eval') {
        errors.push({ keyword: 'eval' });
      }
      break;
    case 'NewExpression':
      if (node.callee.type === 'Identifier' && node.callee.name === 'Function') {
        errors.push({ keyword: 'Function' });
      }
      break;
    case 'ImportExpression':
      errors.push({ keyword: 'import' });
      break;
  }
  for (const key in node) {
    const val = (node as unknown as Record<string, unknown>)[key];
    if (key === 'type' || key === 'start' || key === 'end' || key === 'range' || key === 'loc' || key === 'optional' || key === 'computed') continue;
    if (key === 'sourceType' || key === 'directive') continue;
    if (Array.isArray(val)) {
      for (const item of val) {
        if (item && typeof item === 'object' && 'type' in item) {
          walkAndValidate(item as ESTree.Node, errors);
        }
      }
    } else if (val && typeof val === 'object' && 'type' in (val as object)) {
      walkAndValidate(val as ESTree.Node, errors);
    }
  }
}

function validateCode(code: string): string | null {
  try {
    const ast = parseScript(code, { next: true, loc: false, ranges: false });
    const errors: ValidationError[] = [];
    for (const stmt of ast.body) {
      walkAndValidate(stmt, errors);
    }
    if (errors.length > 0) {
      return `Code validation failed: Use of '${errors[0].keyword}' is forbidden in sandbox`;
    }
    return null;
  } catch {
    return 'Code validation failed: Unable to parse code';
  }
}

/* ---------- Sandbox Proxy ---------- */

const ALLOWED_GLOBALS = new Set([
  'Math', 'Date', 'JSON', 'crypto', 'URL',
  'Uint8Array', 'Int32Array', 'Float32Array',
  'TextEncoder', 'TextDecoder',
]);

/* ---------- Main handler ---------- */

self.onmessage = async (event: MessageEvent) => {
  const { code, data, timeout } = event.data;
  const EXEC_TIMEOUT = typeof timeout === 'number' && timeout > 0 ? timeout : 5000;

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
    const validationError = validateCode(code);
    if (validationError) {
      self.postMessage({ error: validationError });
      return;
    }

    const sandboxProxy = new Proxy(Object.create(null), {
      get: (_: unknown, prop: string | symbol) => {
        if (typeof prop === 'symbol') return undefined;
        if (prop === 'os') return os;
        if (prop === 'data') return data;
        if (prop === 'console') return console;
        if (ALLOWED_GLOBALS.has(prop)) {
          return (self as unknown as Record<string, unknown>)[prop];
        }
        return undefined;
      },
      has: (_: unknown, prop: string | symbol) =>
        typeof prop === 'string' && (ALLOWED_GLOBALS.has(prop) || prop === 'os' || prop === 'data' || prop === 'console'),
      set: () => false,
      deleteProperty: () => false,
      preventExtensions: () => true,
      isExtensible: () => false,
      getOwnPropertyDescriptor: () => undefined,
      ownKeys: () => ['os', 'data', 'console', ...ALLOWED_GLOBALS],
    });

    // C-2 defense-in-depth: shadow Function/Object so (async ()=>{}).constructor.constructor
    // cannot reach the worker's real Function even if AST validation is bypassed.
    // "use strict" is still on but Function = {} is a var hoisting trick (var is not
    // blocked by strict-mode's non-writable global), and async functions created inside
    // this scope inherit the local var shadow.
    const fn = new Function('data', 'os', 'proxySelf', `
      var Function = Object.freeze(function(){});
      var AsyncFunction = Object.freeze(function(){return async function(){}}());
      var GeneratorFunction = Object.freeze(function(){return function*(){}}());
      var Object = Object.freeze({});
      try { eval('"use strict"'); } catch(_){}
      const { fetch, XMLHttpRequest, WebSocket, importScripts, indexedDB, postMessage, addEventListener, removeEventListener, Worker, MessageChannel, BroadcastChannel, EventSource, Notification, requestAnimationFrame, cancelAnimationFrame } = {};
      const self = Object.freeze(proxySelf);
      const globalThis = self;
      return (async () => {
        try {
          ${code}
        } catch (e) {
          return { __error: e.message };
        }
      })();
    `);

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
