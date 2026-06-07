import '@testing-library/jest-dom';
import 'fake-indexeddb/auto';
import { vi } from 'vitest';

// Mock Web Worker
class WorkerMock {
  url: string;
  onmessage: ((event: MessageEvent) => void) | null = null;
  constructor(stringUrl: string) {
    this.url = stringUrl;
  }
  postMessage(_msg: unknown) {
    // Simulate async response
    setTimeout(() => {
      if (this.onmessage) {
        this.onmessage({ data: { result: 'Mocked Worker Result' } } as MessageEvent);
      }
    }, 0);
  }
  terminate() {}
  addEventListener() {}
  removeEventListener() {}
}

vi.stubGlobal('Worker', WorkerMock);

// ─── sql.js mock ─────────────────────────────────────────────────
// In Vite/browser runtime, sqlite-storage.ts does
//   import initSqlJs from 'sql.js';
//   import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url';
// Under Vitest/jsdom the ?url import resolves to a non-existent
// path and initSqlJs() tries to fetch the wasm → unhandled rejection.
// Stub both: a no-op init that returns a tiny in-memory DB, and a
// stub for the ?url asset import.  Tests that need real SQL can
// un-mock via vi.unmock('sql.js').
vi.mock('sql.js', () => {
  const stmt = {
    bind: () => true,
    step: () => false,
    getAsObject: () => ({}),
    free: () => {},
    run: () => {},
  };
  const emptyDb = {
    run: () => {},
    prepare: () => stmt,
    exec: () => [],
    export: () => new Uint8Array(0),
    close: () => {},
    getRowsModified: () => 0,
  };
  return {
    default: vi.fn(async () => ({
      Database: vi.fn(() => emptyDb),
      // Mark as a stub so production code can detect & bail.
      __isSqlJsStub: true,
    })),
  };
});

// Vite's ?url suffix import is transformed at build time; under
// Vitest it's a bare string export.  Provide a stub module so the
// `import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url'` line in
// sqlite-storage.ts doesn't break the resolver.
vi.mock('sql.js/dist/sql-wasm.wasm?url', () => ({
  default: 'data:application/wasm;base64,',
}));

// Mock crypto.randomUUID
const globalCrypto = globalThis as unknown as { crypto: { randomUUID: () => string } };
if (!globalCrypto.crypto.randomUUID) {
  globalCrypto.crypto.randomUUID = () => '1234-5678-9012-3456';
}

// Mock scrollIntoView for jsdom
Element.prototype.scrollIntoView = vi.fn();

// Initialize the unified runtime so that all resolved services are registered in the DI container
import { runtime } from '../kernel/runtime';
await runtime.start();

