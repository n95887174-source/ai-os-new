import { useState, useCallback } from 'react';
import { KeyIntelligencePipeline } from '../kernel/services/key-intelligence-pipeline';
import { KeyFingerprints } from '../kernel/services/key-management/key-fingerprints';
import { keyService, adapterRegistry } from '../kernel/instances';
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

  const runPipeline = useCallback(async (input: KeyIntelligenceInput) => {
    setLoading(true);
    setError('');
    setReport(null);
    try {
      const result = await pipeline.run(input);
      setReport(result);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Pipeline execution failed');
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setReport(null);
    setLoading(false);
    setError('');
  }, []);

  return { report, loading, error, runPipeline, reset };
}
