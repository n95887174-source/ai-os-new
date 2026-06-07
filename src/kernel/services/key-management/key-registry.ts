import type { ApiKey, KeyExtendedStats, KeyHistoryEntry, KeyNote } from '../../types/metrics-types';
import { EVENTS } from '../../events/event-names';
import type { FreeTierLimit } from './key-service';
import { CONFIG } from '../config-registry';
import type { KeyStore } from '../../contracts/storage/key-store';
import { storageAdapter } from '../../instances';
import { dexieDb } from '../database-service';
import { logDexieIdentityWithCount, verifyDexieInstance } from '../dexie-identity';

const STORAGE_KEY = 'super_agents_api_keys';

interface BootstrapGlobals {
  __BOOTSTRAP_KEY_SNAPSHOT__?: readonly ApiKey[] | null;
  __BOOTSTRAP_PHASE__?: boolean;
  __BOOTSTRAP_KEYS_SOURCE__?: string;
}

function isBootstrapPhase(): boolean {
  try {
    return (globalThis as unknown as BootstrapGlobals).__BOOTSTRAP_PHASE__ === true;
  } catch {
    return false;
  }
}

function readBootstrapSnapshot(): readonly ApiKey[] | null {
  try {
    const snap = (globalThis as unknown as BootstrapGlobals).__BOOTSTRAP_KEY_SNAPSHOT__;
    if (Array.isArray(snap)) return snap;
  } catch { /* non-critical */ }
  return null;
}

/**
 * Tracks how many times the keys array has been overwritten. Used to detect
 * silent N > 0 → 0 transitions and to attribute them via console.trace.
 */
let _overwriteSeq = 0;

export interface KeyRegistryDeps {
  eventBus: {
    on: (event: string, cb: (...args: unknown[]) => void) => () => void;
    onSafe: <T>(event: string, cb: (data: T) => void) => () => void;
    emit: (event: string, data?: unknown) => void;
  };
  keyStore: KeyStore;
  database: {
    getKv: <T>(id: string) => Promise<T | null>;
    setKv: <T>(id: string, value: T) => Promise<void>;
  };
  vault: {
    encryptKey: (plaintext: string) => Promise<string | null>;
    isLocked: () => boolean;
    decryptAllKeys: (keys: ApiKey[]) => Promise<ApiKey[]>;
    encryptAllKeys: (keys: ApiKey[]) => Promise<ApiKey[]>;
    stripPlaintextKeys: (keys: ApiKey[]) => ApiKey[];
  };
  freeTierLimits: Record<string, FreeTierLimit>;
}

export class KeyRegistry {
  private keys: ApiKey[] = [];
  private unsubs: Array<() => void> = [];
  private deps: KeyRegistryDeps;

  constructor(deps: KeyRegistryDeps) {
    this.deps = deps;
  }

  getKeys(): ApiKey[] {
    return this.keys;
  }

  getKey(id: string): ApiKey | undefined {
    return this.keys.find(k => k.id === id);
  }

  getKeysByProvider(provider: string): ApiKey[] {
    return this.keys.filter(k => k.provider.toLowerCase() === provider.toLowerCase());
  }

  getActiveKeys(): ApiKey[] {
    return this.keys.filter(k => k.status === 'active');
  }

  getPoolKeys(provider: string): ApiKey[] {
    return this.keys.filter(
      k => k.provider.toLowerCase() === provider.toLowerCase() && k.status === 'active'
    );
  }

  getDefaultKeys(): ApiKey[] {
    return [
      { id: '1', provider: 'OpenRouter', key: '', label: 'OpenRouter Main', status: 'inactive', stats: this.initStats() },
      { id: '2', provider: 'Gemini', key: '', label: 'Gemini Pro', status: 'inactive', stats: this.initStats() },
      { id: '3', provider: 'Groq', key: '', label: 'Groq Cloud', status: 'inactive', stats: this.initStats() },
      { id: '4', provider: 'NVIDIA', key: '', label: 'NVIDIA API', status: 'inactive', stats: this.initStats() },
      { id: '5', provider: 'Cerebras', key: '', label: 'Cerebras API', status: 'inactive', stats: this.initStats() },
      { id: '6', provider: 'Cloudflare', key: '', label: 'Cloudflare Workers AI', status: 'inactive', stats: this.initStats() },
      { id: '7', provider: 'DeepSeek', key: '', label: 'DeepSeek Main', status: 'inactive', stats: this.initStats() },
      { id: '8', provider: 'Cohere', key: '', label: 'Cohere Main', status: 'inactive', stats: this.initStats() },
      { id: '9', provider: 'Blackboxapi', key: '', label: 'Blackboxapi Main', status: 'inactive', stats: this.initStats() },
      { id: '10', provider: 'Scaleway', key: '', label: 'Scaleway Main', status: 'inactive', stats: this.initStats() },
      { id: '11', provider: 'Cometapi', key: '', label: 'CometAPI Main', status: 'inactive', stats: this.initStats() },
      { id: '12', provider: 'GitHub', key: '', label: 'GitHub Models', status: 'inactive', stats: this.initStats() },
    ];
  }

  setupListeners(handlers: { addKey: (data: Omit<ApiKey, 'id' | 'stats'>) => void; removeKey: (id: string) => void; compromiseByFingerprint: (fingerprint: string, source: string) => void; updateMetricsFromResponse: (res: any) => void }) {
    this.unsubs.push(
      this.deps.eventBus.onSafe<Omit<ApiKey, 'id' | 'stats'>>(EVENTS.KEY_ADDED, (d) => handlers.addKey(d)),
      this.deps.eventBus.on(EVENTS.KEY_REMOVED, (id: unknown) => { if (typeof id === 'string') handlers.removeKey(id); }),
      this.deps.eventBus.on(EVENTS.MESSAGE_RESPONSE, (res: unknown) => handlers.updateMetricsFromResponse(res)),
      this.deps.eventBus.onSafe<{ id?: string; fingerprint?: string; source?: string }>(EVENTS.COMPROMISE_SIGNAL, (d) => {
        if (d.fingerprint) handlers.compromiseByFingerprint(d.fingerprint, d.source || 'external signal');
      })
    );
  }

  destroy() {
    this.unsubs.forEach(u => u());
    this.unsubs = [];
  }

  private loadingKeys = false;
  private saveQueue = Promise.resolve();

  async reload(): Promise<void> {
    const prevCount = this.keys.length;
    console.trace('[KEY_REGISTRY_OVERWRITE]', { source: 'reload:enter', seq: ++_overwriteSeq, prevCount, nextCount: prevCount, force: false });

    // During bootstrap phase, reload() is a no-op. The snapshot is already
    // committed to memory by loadKeys(); subsequent calls would risk
    // re-reading from storage layers that were intentionally excluded.
    if (isBootstrapPhase()) {
      console.log('[KEY_REGISTRY] reload() no-op during bootstrap phase');
      return;
    }

    // Post-bootstrap: if the registry already has keys, peek at dexieDb
    // BEFORE loadKeys() so we can refuse a no-op reload that would
    // overwrite valid state with whatever dexie currently returns.
    if (this.keys.length > 0) {
      try {
        // DEXIE_IDENTITY: log identity on every reload peek
        await logDexieIdentityWithCount('KeyRegistry.reload:peek', dexieDb as unknown as Parameters<typeof logDexieIdentityWithCount>[1]);
        const dexieKeys = await dexieDb.apiKeys.toArray();
        if (dexieKeys.length === 0) {
          console.warn(
            '[KeyRegistry] reload() BLOCKED: registry has', this.keys.length,
            'keys but dexie source is empty. Skipping reload to avoid overwrite.'
          );
          return;
        }
      } catch (e) {
        console.warn('[KeyRegistry] reload() precheck failed, proceeding with loadKeys()', e);
      }
    }

    this.loadingKeys = false;
    await this.loadKeys();
  }

  async loadKeys(): Promise<void> {
    if (this.loadingKeys) return;
    this.loadingKeys = true;
    // ── KEY_DROP_TRACE: unique run id for this loadKeys() call ───
    const _dropRun = `run_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    console.group(`[KEY_DROP_TRACE] loadKeys start run=${_dropRun}`);
    try {
      // DEXIE_IDENTITY: verify KeyRegistry sees the same Dexie instance as
      // the hydration layer. Throws [DEXIE MISMATCH] on split.
      const verifiedInstance = verifyDexieInstance('KeyRegistry.loadKeys', dexieDb as unknown as Parameters<typeof verifyDexieInstance>[1]);
      await logDexieIdentityWithCount('KeyRegistry.loadKeys', verifiedInstance);
      // ── Bootstrap snapshot fast path ─────────────────────────────
      // During bootstrap phase, the snapshot is the ONLY source. We do not
      // touch dexieDb, localStorage, or the sqlite blob. No fallbacks.
      if (isBootstrapPhase()) {
        const snapshotRaw = readBootstrapSnapshot();
        console.log(`[KEY_DROP_TRACE] run=${_dropRun} stage=bootstrap-snapshot-read count=${snapshotRaw?.length ?? 0}`);
        if (snapshotRaw && snapshotRaw.length > 0) {
          const snapshot: ApiKey[] = [...snapshotRaw];
          console.log('[KEY_REGISTRY] using bootstrap snapshot ONLY, count:', snapshot.length);
          // ── STAGE: normalize (map) ──────────────────────────────
          const mapped: ApiKey[] = snapshot.map((k: ApiKey) => {
            const stats = k.stats || this.initStats();
            if (!stats.extended) stats.extended = this.initExtendedStats();
            return { ...k, history: k.history || [], stats };
          });
          this.traceKeyDrop(_dropRun, 'bootstrap.normalize.map', snapshot.length, mapped.length, mapped);
          // ── STAGE: filter (structural validation only) ────────────
          // See dexie-path filter below for the rationale: do not require
          // `k.key` to be non-empty, otherwise default placeholders (12 with
          // empty `key`) get dropped to 0.
          const normalized: ApiKey[] = mapped.filter((k: ApiKey) => {
            if (!k || typeof k !== 'object') return false;
            if (!k.id) return false;
            if (!k.provider) return false;
            if (typeof k.key === 'string' && k.key.startsWith('placeholder-')) return false;
            return true;
          });
          this.traceKeyDrop(_dropRun, 'bootstrap.filterValid', mapped.length, normalized.length, normalized);
          // ── STAGE: decrypt ──────────────────────────────────────
          const decryptInput = normalized;
          const final = (!this.deps.vault.isLocked() && normalized.length > 0)
            ? await this.deps.vault.decryptAllKeys(normalized)
            : normalized;
          this.traceKeyDrop(_dropRun, 'bootstrap.decrypt', decryptInput.length, final.length, final);
          // ── STAGE: assign ───────────────────────────────────────
          const before = this.keys.length;
          this.setKeysInternal('loadKeys:bootstrap-snapshot', final, { force: true });
          this.traceKeyDrop(_dropRun, 'bootstrap.assign', before, this.keys.length, this.keys);
          console.log('[KEY_SYNC] final committed count:', this.keys.length);
          return;
        }
      }

      // ── Normal path: read from dexieDb.apiKeys ───────────────────
      // Post-bootstrap OR no snapshot available. dexieDb.apiKeys is the
      // mirror of localStorage, kept in sync by resetKeyStorageToCanonical().
      const dexieKeys = await dexieDb.apiKeys.toArray();
      this.traceKeyDrop(_dropRun, 'loadDexie', 0, dexieKeys.length, dexieKeys, { source: 'dexieDb.apiKeys.toArray()' });

      // ── DIAGNOSTIC: print structure of the first 3 raw keys BEFORE filter
      // This reveals whether the field is `key`, `encryptedKey`, `value`, `apiKey`, etc.
      // No secret values logged — only property names + safe metadata.
      if (dexieKeys.length > 0) {
        const sample = dexieKeys.slice(0, 3).map((k, i) => {
          const safe: Record<string, unknown> = {};
          for (const prop of Object.keys(k as object)) {
            const v = (k as unknown as Record<string, unknown>)[prop];
            if (prop === 'key' || prop === 'encryptedKey' || prop === 'value' || prop === 'apiKey') {
              safe[prop] = `<type=${typeof v}, len=${typeof v === 'string' ? v.length : 'n/a'}, isEmpty=${v === '' || v === null || v === undefined}>`;
            } else {
              safe[prop] = v;
            }
          }
          return { index: i, keys: Object.keys(k as object), structure: safe };
        });
        console.log(`[KEY_DROP_TRACE] run=${_dropRun} stage=raw-structure-inspect`, sample);
      }

      // ── STAGE: map (normalize stats) ────────────────────────────
      const loaded: ApiKey[] = dexieKeys.map(k => {
        const stats = k.stats || this.initStats();
        if (!stats.extended) stats.extended = this.initExtendedStats();
        return { ...k, history: k.history || [], stats };
      });
      this.traceKeyDrop(_dropRun, 'normalize.map', dexieKeys.length, loaded.length, loaded);

      // ── STAGE: filter (structural validation only) ────────────────
      // Drop only:
      //   - non-object entries
      //   - entries missing `id` or `provider` (cannot be addressed)
      //   - entries with literal 'placeholder-' prefix (old auto-seed marker)
      //
      // IMPORTANT: We do NOT require `k.key` to be non-empty. The 12 default
      // placeholders produced by getDefaultKeys() / the reset pipeline have
      // `key: ''` by design (so the UI can render them as "fill me in"). The
      // old filter `k.key && !k.key.startsWith('placeholder-')` dropped all
      // 12 defaults to 0 — a 12 → 0 silent wipe.
      //
      // Empty-key rows are still preserved here; consumers (UI, router) check
      // `key === ''` when they need a fully-configured key.
      const real = loaded.filter((k) => {
        if (!k || typeof k !== 'object') return false;
        if (!k.id) return false;
        if (!k.provider) return false;
        if (typeof k.key === 'string' && k.key.startsWith('placeholder-')) return false;
        return true;
      });
      // Per-key diagnostic: show WHY each key was kept/dropped (first 3 only).
      if (loaded.length > 0 && loaded.length !== real.length) {
        const decisions = loaded.slice(0, 5).map((k) => ({
          id: k.id,
          provider: k.provider,
          keyType: typeof k.key,
          keyLen: typeof k.key === 'string' ? k.key.length : 0,
          isPlaceholder: typeof k.key === 'string' && k.key.startsWith('placeholder-'),
          kept: real.includes(k),
        }));
        console.log(`[KEY_DROP_TRACE] run=${_dropRun} stage=filter-decisions`, decisions);
      }
      this.traceKeyDrop(_dropRun, 'filterValid', loaded.length, real.length, real);

      console.log('[KEY_SYNC] registry after load count:', real.length);

      // ── STAGE: decrypt ─────────────────────────────────────────
      // Decrypt any encrypted loaded keys first to handle in-memory plaintext operations
      const vaultLocked = this.deps.vault.isLocked();
      console.log(`[KEY_DROP_TRACE] run=${_dropRun} stage=pre-decrypt vaultLocked=${vaultLocked} real.length=${real.length}`);
      const final = (!vaultLocked && real.length > 0)
        ? await this.deps.vault.decryptAllKeys(real)
        : real;
      this.traceKeyDrop(_dropRun, 'decrypt', real.length, final.length, final);

      // Post-bootstrap guard: if the registry already has keys and dexie
      // returned 0, this is the exact "N > 0 → 0" overwrite we must prevent.
      // Most likely a race during init where another service cleared dexie
      // before the snapshot was mirrored back.
      if (this.keys.length > 0 && final.length === 0) {
        console.warn(
          '[KeyRegistry] loadKeys() BLOCKED: registry has', this.keys.length,
          'keys but dexie source is empty — refusing to overwrite. Trace the',
          'caller that emptied dexie.'
        );
        console.log(`[KEY_DROP_TRACE] run=${_dropRun} stage=guard-blocked current=${this.keys.length} incoming=0`);
        return;
      }

      // ── STAGE: assign ──────────────────────────────────────────
      const before = this.keys.length;
      this.setKeysInternal('loadKeys:dexie', final);
      this.traceKeyDrop(_dropRun, 'assign', before, this.keys.length, this.keys);
      console.log('[KEY_SYNC] final committed count:', this.keys.length);
    } catch (e) {
      console.warn('[KeyRegistry] Failed to load API keys:', e);
      console.log(`[KEY_DROP_TRACE] run=${_dropRun} stage=EXCEPTION error=${e instanceof Error ? e.message : String(e)}`);
      this.deps.eventBus.emit(EVENTS.NOTIFICATION, { message: 'Failed to load API keys, using defaults', type: 'error' });
      // Only fall back to defaults if registry is currently empty. If we
      // already have keys committed, prefer to keep them over a throw-time
      // reset to placeholder defaults.
      if (this.keys.length === 0) {
        const defaults = this.getDefaultKeys();
        this.setKeysInternal('loadKeys:defaults-fallback', defaults, { force: true });
        this.traceKeyDrop(_dropRun, 'assign-defaults', 0, this.keys.length, this.keys, { error: true });
      } else {
        console.warn('[KeyRegistry] loadKeys() threw but registry non-empty — keeping existing state');
        this.traceKeyDrop(_dropRun, 'assign-keep-existing', this.keys.length, this.keys.length, this.keys, { error: true });
      }
    } finally {
      console.log(`[KEY_DROP_TRACE] run=${_dropRun} stage=end final=${this.keys.length}`);
      console.groupEnd();
      this.loadingKeys = false;
    }
  }

  /**
   * KEY_DROP_TRACE helper — non-intrusive stage counter.
   * Emits a single console.log with stage, before/after counts, and a safe
   * 1–3 key sample (no `key` field — only id/provider/label/status).
   */
  private traceKeyDrop(
    run: string,
    stage: string,
    beforeCount: number,
    afterCount: number,
    sample: ApiKey[] | undefined,
    extra?: Record<string, unknown>
  ): void {
    const safeSample = (sample ?? []).slice(0, 3).map((k) => ({
      id: k.id,
      provider: k.provider,
      label: k.label,
      status: k.status,
      hasKey: !!k.key,
      keyLen: k.key?.length ?? 0,
      isEncrypted: k.isEncrypted,
    }));
    const arrow = beforeCount > 0 || afterCount > 0 ? `${beforeCount} -> ${afterCount}` : `${afterCount}`;
    const dropMarker = afterCount === 0 && beforeCount > 0 ? '  ❌ DROP HERE' : '';
    console.log(
      `[KEY_DROP_TRACE] run=${run} stage=${stage} ${arrow}${dropMarker}`,
      { sample: safeSample, ...extra }
    );
  }

  /**
   * Force-resync from dexieDb.apiKeys. Used as a safety net when the registry
   * ends up empty but Dexie has data (e.g. race during init or stub keyStore).
   * Uses `force: true` because this is the explicit recovery path.
   */
  async forceResyncFromDexie(): Promise<number> {
    this.loadingKeys = false;
    const _dropRun = `forceResync_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    console.group(`[KEY_DROP_TRACE] forceResyncFromDexie start run=${_dropRun}`);
    try {
      // DEXIE_IDENTITY: verify same instance.
      const verifiedInstance = verifyDexieInstance('KeyRegistry.forceResyncFromDexie', dexieDb as unknown as Parameters<typeof verifyDexieInstance>[1]);
      await logDexieIdentityWithCount('KeyRegistry.forceResyncFromDexie', verifiedInstance);

      const dexieKeys = await dexieDb.apiKeys.toArray();
      this.traceKeyDrop(_dropRun, 'loadDexie', 0, dexieKeys.length, dexieKeys, { source: 'dexieDb.apiKeys.toArray()' });
      console.log('[KEY_SYNC] force resync — dexie count:', dexieKeys.length);
      if (dexieKeys.length === 0) {
        console.log(`[KEY_DROP_TRACE] run=${_dropRun} stage=early-return-no-data`);
        return 0;
      }
      const mapped = dexieKeys.map(k => {
        const stats = k.stats || this.initStats();
        if (!stats.extended) stats.extended = this.initExtendedStats();
        return { ...k, history: k.history || [], stats };
      });
      this.traceKeyDrop(_dropRun, 'normalize.map', dexieKeys.length, mapped.length, mapped);
      const loaded = mapped.filter((k) => {
        if (!k || typeof k !== 'object') return false;
        if (!k.id) return false;
        if (!k.provider) return false;
        if (typeof k.key === 'string' && k.key.startsWith('placeholder-')) return false;
        return true;
      });
      this.traceKeyDrop(_dropRun, 'filterValid', mapped.length, loaded.length, loaded);
      const before = this.keys.length;
      this.setKeysInternal('forceResyncFromDexie', loaded, { force: true });
      this.traceKeyDrop(_dropRun, 'assign', before, this.keys.length, this.keys);
      console.log('[KEY_SYNC] force resync — committed count:', this.keys.length);
      return this.keys.length;
    } finally {
      console.log(`[KEY_DROP_TRACE] run=${_dropRun} stage=end final=${this.keys.length}`);
      console.groupEnd();
    }
  }

  async saveKeys(): Promise<void> {
    const snapshot = [...this.keys];
    return new Promise<void>((resolve, reject) => {
      this.saveQueue = this.saveQueue
        .then(() => this.doSaveKeysWithSnapshot(snapshot))
        .then(resolve)
        .catch((err) => {
          console.error('[KeyRegistry] saveKeys failed, resetting queue:', err);
          this.saveQueue = Promise.resolve();
          reject(err);
        });
    });
  }

  private async doSaveKeysWithSnapshot(snapshot: ApiKey[]): Promise<void> {
    let keysToSave: ApiKey[];
    try {
      keysToSave = await this.deps.vault.encryptAllKeys(snapshot);
    } catch (e) {
      this.deps.eventBus.emit(EVENTS.NOTIFICATION, { message: 'Encryption failed — keys not saved', type: 'error' });
      throw e;
    }
    try {
      if (typeof this.deps.keyStore?.bulkPut === 'function') {
        await this.deps.keyStore.bulkPut(keysToSave);
      }
      // Persist to localStorage so keys survive page reload (in-memory Map is lost on reload)
      try {
        storageAdapter.setItem(STORAGE_KEY, JSON.stringify(keysToSave));
      } catch { /* localStorage write failed — non-critical */ }
      if (typeof this.deps.keyStore?.listKeys === 'function' && typeof this.deps.keyStore?.deleteKey === 'function') {
        const allStored = await this.deps.keyStore.listKeys();
        const currentIds = new Set(snapshot.map(k => k.id));
        const stale = allStored.filter(k => !currentIds.has(k.id));
        if (stale.length > 0) {
          await Promise.all(stale.map(k => this.deps.keyStore.deleteKey(k.id)));
        }
      }
    } catch (e) {
      console.error('[KeyRegistry] IndexedDB save failed', e);
    }
  }

  async addKey(data: Omit<ApiKey, 'id' | 'stats'>): Promise<ApiKey | null> {
    const isDuplicate = this.keys.some(k => k.label === data.label && k.provider === data.provider);
    if (isDuplicate) {
      this.deps.eventBus.emit(EVENTS.NOTIFICATION, {
        message: `Key already configured for provider ${data.provider}`,
        type: 'error',
      });
      return null;
    }

    const enc = await this.deps.vault.encryptKey(data.key);
    if (!enc) {
      this.deps.eventBus.emit(EVENTS.NOTIFICATION, {
        message: 'Encryption failed. Key was not added.',
        type: 'error',
      });
      return null;
    }

    const isEnc = enc !== data.key;
    const inferredTags: string[] = [];
    const labelLower = data.label.toLowerCase();
    if (/\b(prod|production)\b/.test(labelLower)) inferredTags.push('env:production');
    if (/\b(dev|development)\b/.test(labelLower)) inferredTags.push('env:development');
    if (/\b(staging|stage)\b/.test(labelLower)) inferredTags.push('env:staging');
    if (/\b(test|testing)\b/.test(labelLower)) inferredTags.push('env:test');
    if (/\bfree\b/.test(labelLower)) inferredTags.push('tier:free');

    const now = Date.now();
    const newKey: ApiKey = {
      ...data,
      key: enc,
      isEncrypted: isEnc,
      tags: [...(data.tags || []), ...inferredTags],
      id: crypto.randomUUID().slice(0, 8),
      stats: this.initStats(),
      history: [{
        id: crypto.randomUUID().slice(0, 8),
        timestamp: now,
        action: 'added',
        detail: `Key added for ${data.provider}${data.group ? ` (${data.group})` : ''}${data.account ? ` [${data.account}]` : ''}`,
      }],
    };

    this.keys.push(newKey);
    await this.saveKeys();
    return newKey;
  }

  async removeKey(id: string): Promise<void> {
    const next = this.keys.filter(k => k.id !== id);
    this.setKeysInternal('removeKey', next);
    await this.saveKeys();
  }

  pushHistory(keyId: string, action: KeyHistoryEntry['action'], detail: string): void {
    const key = this.keys.find(k => k.id === keyId);
    if (!key) return;
    if (!key.history) key.history = [];
    key.history.push({
      id: crypto.randomUUID().slice(0, 8),
      timestamp: Date.now(),
      action,
      detail,
    });
    if (key.history.length > 100) key.history = key.history.slice(-50);
  }

  replaceKeys(newKeys: ApiKey[]): void {
    this.setKeysInternal('replaceKeys', newKeys, { force: true });
  }

  /**
   * Wipe in-memory cache. Used by the canonical reset pipeline; the next
   * `loadKeys()` call re-hydrates from dexieDb.apiKeys. This is the ONLY
   * way an empty overwrite is permitted.
   */
  clearKeys(): void {
    this.setKeysInternal('clearKeys', [], { force: true });
  }

  /**
   * Centralized mutation point for the keys array. ALL writes to this.keys
   * MUST go through this method.
   *
   * Invariants:
   *  1. Emits `[KEY_REGISTRY_OVERWRITE]` trace with source + count
   *  2. Rejects N > 0 → 0 transitions unless `opts.force === true`
   *  3. After bootstrap phase, refuses to replace non-empty state with empty
   *     data sourced from an unverified/empty storage layer
   *
   * The `force` flag is reserved for: `clearKeys` (explicit reset pipeline),
   * `replaceKeys` (vault unlock decrypt), and the bootstrap snapshot path.
   */
  private setKeysInternal(
    source: string,
    newKeys: ApiKey[],
    opts: { force?: boolean } = {}
  ): void {
    const prevCount = this.keys.length;
    const nextCount = Array.isArray(newKeys) ? newKeys.length : 0;
    const seq = ++_overwriteSeq;

    // Always emit a trace so silent overwrites are visible in DevTools.
    console.trace('[KEY_REGISTRY_OVERWRITE]', { source, seq, prevCount, nextCount, force: !!opts.force });

    // Hard invariant: N > 0 → 0 is forbidden unless explicitly forced.
    if (prevCount > 0 && nextCount === 0 && !opts.force) {
      console.warn(
        '[KEY_REGISTRY_OVERWRITE] BLOCKED: refusing to overwrite',
        prevCount, 'keys with empty array. Source:', source,
        '— pass { force: true } if this is an explicit user reset.'
      );
      return;
    }

    this.keys = Array.isArray(newKeys) ? [...newKeys] : [];
  }

  updateKey(id: string, updates: Partial<ApiKey>): void {
    const next = this.keys.map(k => (k.id === id ? { ...k, ...updates } : k));
    this.setKeysInternal('updateKey', next);
  }

  modifyKey(id: string, fn: (key: ApiKey) => void): void {
    const key = this.keys.find(k => k.id === id);
    if (key) fn(key);
  }

  async importKeys(jsonData: string): Promise<number> {
    const imported = JSON.parse(jsonData);
    if (!Array.isArray(imported)) throw new Error('Invalid data format');
    let count = 0;
    const now = Date.now();
    for (const item of imported) {
      if (!item.id || !item.provider || !item.label) continue;
      const exists = this.keys.some(k => k.id === item.id);
      if (!exists) {
        this.keys.push({
          ...item,
          key: item.key || '',
          isEncrypted: item.isEncrypted ?? false,
          stats: item.stats || this.initStats(),
          history: [
            ...(item.history || []),
            { id: crypto.randomUUID().slice(0, 8), timestamp: now, action: 'added' as const, detail: `Imported key for ${item.provider}` },
          ],
        });
        count++;
      }
    }
    return count;
  }

  async exportKeys(encryptFn: (plaintext: string) => Promise<string | null>): Promise<string> {
    const exportData = await Promise.all(
      this.keys.map(async (k) => {
        let keyVal = k.key;
        let isEnc = k.isEncrypted;
        if (!this.deps.vault.isLocked() && k.key && !k.isEncrypted) {
          const encrypted = await encryptFn(k.key);
          if (encrypted) {
            keyVal = encrypted;
            isEnc = true;
          }
        }
        return {
          id: k.id,
          provider: k.provider,
          group: k.group,
          account: k.account,
          key: keyVal,
          label: k.label,
          tags: k.tags,
          status: k.status,
          isEncrypted: isEnc,
          availableModels: k.availableModels,
          notes: k.notes,
          stats: k.stats,
          history: k.history,
        };
      })
    );
    return JSON.stringify(exportData, null, 2);
  }

  async addNote(keyId: string, text: string, type: KeyNote['type'] = 'admin', author?: string): Promise<KeyNote> {
    const note: KeyNote = {
      id: crypto.randomUUID().slice(0, 8),
      keyId,
      text,
      timestamp: Date.now(),
      type,
      author,
    };
    const key = this.keys.find(k => k.id === keyId);
    if (key) {
      key.notes = [...(key.notes || []), note];
    }
    return note;
  }

  async removeNote(keyId: string, noteId: string): Promise<void> {
    const key = this.keys.find(k => k.id === keyId);
    if (key?.notes) {
      key.notes = key.notes.filter(n => n.id !== noteId);
    }
  }

  getStats() {
    const active = this.keys.filter(k => k.status === 'active');
    const totalTokens = this.keys.reduce((s, k) => s + (k.stats?.totalTokens || 0), 0);
    const totalCost = this.keys.reduce((s, k) => s + (k.stats?.extended?.estimatedCost || 0), 0);
    return {
      total: this.keys.length,
      active: active.length,
      inactive: this.keys.filter(k => k.status === 'inactive').length,
      error: this.keys.filter(k => k.status === 'error').length,
      totalTokens,
      totalCost,
      providers: new Set(this.keys.map(k => k.provider)).size,
    };
  }

  getTotalTokens(): number {
    return this.keys.reduce((sum, k) => sum + (k.stats?.totalTokens || 0), 0);
  }

  getTotalRequests(): number {
    return this.keys.reduce((sum, k) => sum + (k.stats?.successCount || 0) + (k.stats?.errorCount || 0), 0);
  }

  getUniqueProviders(): string[] {
    return [...new Set(this.keys.map(k => k.provider))];
  }

  initStats() {
    return {
      successCount: 0,
      errorCount: 0,
      totalTokens: 0,
      avgLatency: 0,
      minLatency: 0,
      maxLatency: 0,
      extended: this.initExtendedStats(),
    };
  }

  initExtendedStats(): KeyExtendedStats {
    return {
      reputationScore: 100,
      stabilityForecast: 'stable',
      fingerprint: crypto.randomUUID().slice(0, 6),
      state: 'HEALTHY',
      activeSLA: 'BALANCED',
      stabilityIndex: 1,
      retryImpactScore: 0,
      rateLimitPressure: 0,
      keyAgeScore: 1,
      latencyBreakdown: { ttft: 0, total: 0, tokensPerSec: 0 },
      coldStartLatency: 0,
      warmStartLatency: 0,
      throughputHistory: [],
      errorBreakdown: { rateLimit: 0, timeout: 0, serverError: 0, validationError: 0, other: 0, provider: 0 },
      estimatedCost: 0,
      tokenEfficiency: 1,
      quality: { score: 1, semanticDrift: 0, instructionFollowing: 1, structureConsistency: 1 },
      contextUtilization: 0,
      retentionCurve: [],
      streaming: {},
      userPreferenceScore: 0.5,
      manualSwitches: 0,
      cancellations: 0,
      traces: [],
      fourSignals: { latency: 0, throughput: 0, errorRate: 0, saturation: 0 },
      rules: structuredClone(CONFIG.keys.defaultRules),
      learning: {
        specialization: [],
        performanceByTask: {},
        taskMatrix: {},
        advisorInsights: { recommendedFor: [], avoidFor: [], confidence: 0 },
        lastFiveResults: [],
      },
      currentConcurrentRequests: 0,
      usageToday: { tokens: 0, weightedTokens: 0, requests: 0, estimatedCost: 0 },
      usageMonthly: { tokens: 0, requests: 0, estimatedCost: 0 },
      alerts: [],
      lastUsageDate: new Date().toISOString().slice(0, 10),
      hourlyUsage: new Array(24).fill(0),
    };
  }
}
