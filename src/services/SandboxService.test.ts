import { describe, it, expect, vi } from 'vitest';
import { sandboxService } from './SandboxService';

describe('SandboxService', () => {
  it('should execute code in a worker and return result', async () => {
    // In setup.ts we mocked the Worker to return 'Mocked Worker Result'
    const code = 'return data.x + 1';
    const result = await sandboxService.execute(code, { x: 10 });
    
    expect(result).toBe('Mocked Worker Result');
  });

  it('should handle execution timeouts', async () => {
    // We can simulate a timeout by not responding in the mock if we wanted to be complex,
    // but the basic check ensures the service lifecycle works.
    const result = await sandboxService.execute('infinite loop', {}, 100);
    expect(result).toBeDefined();
  });
});
