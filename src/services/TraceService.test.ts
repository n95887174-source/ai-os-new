import { describe, it, expect, beforeEach } from 'vitest';
import { traceService } from './TraceService';

describe('TraceService', () => {
  it('should return traces array', () => {
    const traces = traceService.getTraces();
    expect(Array.isArray(traces)).toBe(true);
  });

  it('should add a trace and include it in getTraces', () => {
    traceService.addTrace({
      id: 'test-trace-1',
      startTime: Date.now(),
      input: 'test input',
      status: 'running',
      steps: []
    });
    const traces = traceService.getTraces();
    expect(traces.some(t => t.id === 'test-trace-1')).toBe(true);
  });

  it('should replace existing trace on re-add (full overwrite)', () => {
    traceService.addTrace({
      id: 'test-trace-2',
      startTime: Date.now(),
      input: 'original',
      status: 'running',
      steps: []
    });
    traceService.addTrace({
      id: 'test-trace-2',
      startTime: Date.now(),
      input: 'updated',
      status: 'completed',
      steps: [],
      endTime: Date.now()
    });
    const traces = traceService.getTraces();
    const trace = traces.find(t => t.id === 'test-trace-2');
    expect(trace?.status).toBe('completed');
    expect(trace?.input).toBe('updated');
  });
});
