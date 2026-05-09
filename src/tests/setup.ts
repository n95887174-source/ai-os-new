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
  postMessage(msg: any) {
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

// Mock crypto.randomUUID
if (!global.crypto.randomUUID) {
  global.crypto.randomUUID = () => '1234-5678-9012-3456' as any;
}
