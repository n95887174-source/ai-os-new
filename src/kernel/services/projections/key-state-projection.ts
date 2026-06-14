import type { KernelEvent } from '../../contracts/event-log';
import type { Projection } from '../../contracts/projection';
import type { KeyStatus } from '../../contracts/key-state';
import { toKeyStatus } from '../../contracts/key-state';
import type { ProbeResultPayload } from '../../events/provider-events';
import type { ApiKey } from '../../types/metrics-types';

interface ProjectedKeyState {
  id: string;
  provider: string;
  label: string;
  model?: string;
  latency: number;
  status: KeyStatus;
  error?: string;
  quotaUsed: number;
  quotaLimit: number;
  healthErrors: number;
  rateLimited: boolean;
  authFailed: boolean;
  lastUpdated: number;
}

export type { ProjectedKeyState };

export class KeyStateProjection implements Projection<Map<string, ProjectedKeyState>> {
  private state = new Map<string, ProjectedKeyState>();

  reduce(event: KernelEvent): void {
    switch (event.type) {

      case 'key:quota:exceeded': {
        const p = event.payload as { id: string; quotaType?: string; current?: number; limit?: number };
        const prev = this.state.get(p.id) || this.defaultState(p.id);
        this.state.set(p.id, {
          ...prev,
          quotaUsed: p.current ?? prev.quotaUsed,
          quotaLimit: p.limit ?? prev.quotaLimit,
          rateLimited: true,
          lastUpdated: event.timestamp,
        });
        break;
      }

      case 'key:health:check:failed': {
        const p = event.payload as { id: string; provider: string; error: string };
        const prev = this.state.get(p.id) || this.defaultState(p.id);
        this.state.set(p.id, {
          ...prev,
          provider: p.provider || prev.provider,
          healthErrors: prev.healthErrors + 1,
          error: p.error,
          status: 'broken',
          lastUpdated: event.timestamp,
        });
        break;
      }

      case 'key:state:changed': {
        const p = event.payload as { id: string; provider: string; state: string };
        const prev = this.state.get(p.id) || this.defaultState(p.id);
        this.state.set(p.id, {
          ...prev,
          provider: p.provider || prev.provider,
          status: toKeyStatus(p.state),
          lastUpdated: event.timestamp,
        });
        break;
      }

      case 'key:health:check:completed': {
        const p = event.payload as { id: string; provider: string; latency?: number; status?: string; error?: string };
        const prev = this.state.get(p.id) || this.defaultState(p.id);
        this.state.set(p.id, {
          ...prev,
          provider: p.provider || prev.provider,
          latency: p.latency ?? prev.latency,
          status: p.status ? toKeyStatus(p.status) : prev.status,
          error: p.error || prev.error,
          healthErrors: (p.status === 'active' || p.status === 'ready') ? 0 : prev.healthErrors,
          lastUpdated: event.timestamp,
        });
        break;
      }

      case 'chat:stream:end': {
        const p = event.payload as { requestId?: string; provider?: string; model?: string; latency?: number; tokens?: number };
        if (p.requestId?.startsWith('probe-')) {
          const keyId = p.requestId.replace('probe-', '').split('-')[0];
          const prev = this.state.get(keyId) || this.defaultState(keyId);
          this.state.set(keyId, {
            ...prev,
            provider: p.provider || prev.provider,
            model: p.model || prev.model,
            latency: p.latency ?? prev.latency,
            lastUpdated: event.timestamp,
          });
        }
        break;
      }

      case 'key:added': {
        const p = event.payload as { id: string; provider: string; label?: string };
        const prev = this.state.get(p.id);
        if (!prev) {
          this.state.set(p.id, {
            ...this.defaultState(p.id),
            provider: p.provider,
            label: p.label || p.provider,
          });
        }
        break;
      }

      case 'key:updated': {
        // KEY_UPDATED emits ApiKey[] (full key array), not a single object.
        const keys = event.payload as ApiKey[];
        for (const k of keys) {
          const prev = this.state.get(k.id) || this.defaultState(k.id);
          const status = toKeyStatus(k.status);
          this.state.set(k.id, {
            ...prev,
            provider: k.provider || prev.provider,
            label: k.label || prev.label,
            model: k.model || prev.model,
            latency: k.latency ?? prev.latency,
            status,
            quotaUsed: k.stats?.extended?.usageToday?.weightedTokens ?? k.stats?.extended?.usageToday?.tokens ?? prev.quotaUsed,
            quotaLimit: k.maxBudget ?? prev.quotaLimit,
            lastUpdated: event.timestamp,
          });
        }
        break;
      }

      case 'key:probe:result': {
        const p = event.payload as ProbeResultPayload;
        const prev = this.state.get(p.keyId) || this.defaultState(p.keyId);
        this.state.set(p.keyId, {
          ...prev,
          id: p.keyId,
          provider: p.provider,
          label: p.keyLabel,
          model: p.model,
          latency: p.latency,
          status: toKeyStatus(p.status),
          error: p.error,
          quotaUsed: p.quotaRemaining !== undefined ? (p.quotaLimit ?? 0) - p.quotaRemaining : prev.quotaUsed,
          quotaLimit: p.quotaLimit ?? prev.quotaLimit,
          rateLimited: p.rateLimited,
          authFailed: p.statusCode === 401 || !!p.error?.includes('401') || !!p.error?.includes('Authentication'),
          healthErrors: (p.status === 'ready') ? 0 : prev.healthErrors,
          lastUpdated: event.timestamp,
        });
        break;
      }

      case 'key:removed': {
        const payload = event.payload as string | { id: string };
        const id = typeof payload === 'string' ? payload : (payload as { id: string }).id;
        this.state.delete(id);
        break;
      }

      case 'key:compromise:signal': {
        const p = event.payload as { id?: string; fingerprint?: string };
        const kid = p.id || p.fingerprint;
        if (kid) {
          const prev = this.state.get(kid) || this.defaultState(kid);
          this.state.set(kid, { ...prev, authFailed: true, status: 'broken', lastUpdated: event.timestamp });
        }
        break;
      }
    }
  }

  getState(): Map<string, ProjectedKeyState> {
    return this.state;
  }

  getSnapshot(): ProjectedKeyState[] {
    return [...this.state.values()];
  }

  /** Explicit deterministic snapshot ABI — deep clone via structuredClone */
  cloneSnapshot(): ProjectedKeyState[] {
    return structuredClone(this.getSnapshot());
  }

  reset(): void {
    this.state.clear();
  }

  private defaultState(id: string): ProjectedKeyState {
    return {
      id,
      provider: '',
      label: '',
      latency: 0,
      status: 'unknown',
      quotaUsed: 0,
      quotaLimit: 0,
      healthErrors: 0,
      rateLimited: false,
      authFailed: false,
      lastUpdated: 0,
    };
  }
}
