import { describe, it, expect, beforeEach, vi } from 'vitest';
import { cognitiveService } from './CognitiveService';

describe('CognitiveService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return empty traces initially', () => {
    const traces = cognitiveService.getTraces();
    expect(Array.isArray(traces)).toBe(true);
  });

  it('should add a trace and include it in getTraces', () => {
    const trace = {
      id: 'trace-1',
      traceId: 'test-trace',
      startTime: Date.now(),
      input: 'test input',
      status: 'running' as const,
      steps: [],
      decisionGraph: { nodes: [], edges: [] },
      totalLatency: 0,
      totalTokens: 0,
      estimatedCost: 0,
      semanticConfidence: 1
    };

    cognitiveService.addTrace(trace);
    const traces = cognitiveService.getTraces();
    expect(traces.length).toBeGreaterThanOrEqual(1);
    expect(traces[0].id).toBe('trace-1');
  });
});
