import { useState, useCallback, useRef, useEffect } from 'react';
import { KeyIntelligencePipeline } from '../kernel/services/key-intelligence-pipeline';
import { KeyFingerprints } from '../kernel/services/key-management/key-fingerprints';
import { keyService, adapterRegistry } from '../kernel/instances';
import { eventBus } from '../kernel/events/event-bus';
import { rootLogger } from '../kernel/services/logger-service';
import type { KeyImportReport, KeyIntelligenceInput } from '../kernel/contracts/key-intelligence';
import type { AdapterHealthCheck } from '../kernel/services/key-intelligence-pipeline';

const fingerprints = new KeyFingerprints();

const verifyKey: AdapterHealthCheck = async (provider, apiKey) => {
  const adapter = adapterRegistry.getAdapter(provider);
  if (!adapter) return { valid: false, latency: 0, models: [], error: `No adapter for ${provider}` };
  const start = performance.now();
  try {
    const models = await adapter.getAvailableModels(apiKey);
    const latency = Math.round(performance.now() - start);
    if (models.length > 0) return { valid: true, latency, models };
    return { valid: true, latency, models: [], error: 'No models returned' };
  } catch (err: unknown) {
    const latency = Math.round(performance.now() - start);
    return { valid: false, latency, models: [], error: err instanceof Error ? err.message : String(err) };
  }
};

const pipeline = new KeyIntelligencePipeline({
  fingerprints,
  getExistingKeys: () => keyService.getKeys(),
  verifyKey,
});

interface UseKeyIntelligenceReturn {
  report: KeyImportReport | null;
  loading: boolean;
  error: string;
  runPipeline: (input: KeyIntelligenceInput) => Promise<void>;
  reset: () => void;
}

export function useKeyIntelligence(): UseKeyIntelligenceReturn {
  const [report, setReport] = useState<KeyImportReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const abortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      abortRef.current?.abort();
    };
  }, []);

  const runPipeline = useCallback(async (input: KeyIntelligenceInput) => {
    if (abortRef.current) {
      abortRef.current.abort();
    }
    const ac = new AbortController();
    abortRef.current = ac;

    setLoading(true);
    setError('');
    setReport(null);
    try {
      const result = await pipeline.run(input);
      if (!mountedRef.current || ac.signal.aborted) return;
      setReport(result);
    } catch (err: unknown) {
      if (!mountedRef.current || ac.signal.aborted) return;
      const msg = err instanceof Error ? err.message : 'Pipeline execution failed';
      setError(msg);
      // OBS-82: emit pipeline error to monitoring
      eventBus.emit('key-intelligence:pipeline-error', { message: msg, input });
      rootLogger.error('useKeyIntelligence', 'Pipeline execution failed', { error: msg });
    } finally {
      if (!ac.signal.aborted) {
        setLoading(false);
      }
      if (abortRef.current === ac) abortRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setReport(null);
    setLoading(false);
    setError('');
  }, []);

  return { report, loading, error, runPipeline, reset };
}
