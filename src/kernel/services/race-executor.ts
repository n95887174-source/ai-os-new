import type { ChatMessage, ProviderResponse, SendMessageOptions } from '../../llm/core/types';
import type { IAdapterRegistry } from '../contracts/provider-adapter';
import type { AdapterMessage } from '../contracts/provider-adapter';

export interface RaceCandidate {
  provider: string;
  model: string;
  apiKey: string;
}

export interface RaceResult {
  winner: RaceCandidate;
  response: ProviderResponse;
  latency: number;
  failures: Array<{ candidate: RaceCandidate; error: string }>;
}

export class RaceExecutor {
  constructor(private adapterRegistry: IAdapterRegistry) {}

  async race(
    messages: ChatMessage[],
    candidates: RaceCandidate[],
    options?: { signal?: AbortSignal; adapterOptions?: SendMessageOptions; timeoutMs?: number },
  ): Promise<RaceResult> {
    const failures: RaceResult['failures'] = [];
    const controllers = new Map<number, AbortController>();
    const timeout = options?.timeoutMs ?? 15000;

    const makeCall = async (c: RaceCandidate, idx: number): Promise<{ candidate: RaceCandidate; response: ProviderResponse }> => {
      const adapter = this.adapterRegistry.getAdapter(c.provider);
      if (!adapter) throw new Error(`No adapter for ${c.provider}`);

      const controller = new AbortController();
      controllers.set(idx, controller);

      const combinedSignal = options?.signal
        ? combineSignals(options.signal, controller.signal)
        : controller.signal;

      const start = Date.now();
      const adapterMessages: AdapterMessage[] = messages
        .filter(m => m.role !== 'tool')
        .map(m => ({ role: m.role as AdapterMessage['role'], content: typeof m.content === 'string' ? m.content : String(m.content) }));
      const response = await adapter.sendMessage(adapterMessages, c.model, c.apiKey, combinedSignal, options?.adapterOptions as unknown as Record<string, unknown> | undefined);
      response.latency = Date.now() - start;
      return { candidate: c, response };
    };

    const racePromise = Promise.race(
      candidates.map((c, i) =>
        makeCall(c, i).catch(err => {
          failures.push({ candidate: c, error: err instanceof Error ? err.message : String(err) });
          return null;
        }),
      ),
    );

    const timeoutPromise = new Promise<null>((_, reject) => {
      const id = setTimeout(() => {
        controllers.forEach(c => c.abort());
        clearTimeout(id);
        reject(new Error(`Race timed out after ${timeout}ms`));
      }, timeout);
      if (options?.signal) {
        options.signal.addEventListener('abort', () => {
          clearTimeout(id);
          controllers.forEach(c => c.abort());
          reject(new Error('Race aborted'));
        }, { once: true });
      }
    });

    try {
      const result = await Promise.race([racePromise, timeoutPromise]);
      if (!result) {
        const last = failures[failures.length - 1];
        throw new Error(last ? `All race candidates failed. Last: ${last.candidate.provider} — ${last.error}` : 'All race candidates failed');
      }

      const winnerIdx = candidates.indexOf(result.candidate);
      controllers.forEach((ctrl, idx) => { if (idx !== winnerIdx) ctrl.abort(); });

      return { winner: result.candidate, response: result.response, latency: result.response.latency || 0, failures };
    } finally {
      controllers.clear();
    }
  }
}

function combineSignals(s1: AbortSignal, s2: AbortSignal): AbortSignal {
  if (typeof AbortSignal === 'function' && 'any' in AbortSignal) {
    try { return AbortSignal.any([s1, s2]); } catch { /* fall through */ }
  }
  if (s1.aborted) { s2 as unknown as { aborted: boolean }; return s2; }
  const onAbort = () => { try { s2 as unknown as { aborted: boolean }; } catch {} };
  s1.addEventListener('abort', onAbort, { once: true });
  return s2;
}
