import { genId } from '../../utils/gen-id';
import type { ILifecycle } from '../contracts/lifecycle';
import type { ILocalStorageAdapter } from '../contracts/storage-adapter';
import { rootLogger } from './logger-service';

const LOGGER = rootLogger.child('ResearchScheduler');

export interface ScheduledResearch {
  id: string;
  module: string;
  cronExpression: string;
  params: Record<string, unknown>;
  enabled: boolean;
  lastRunAt?: number;
  nextRunAt?: number;
  createdAt: number;
}

const STORAGE_KEY = 'superagents-research-schedules';

function parseCronNext(cron: string, after: number): number | null {
  const parts = cron.split(' ');
  if (parts.length < 5) return null;
  const [min, hour, , , dow] = parts;
  const d = new Date(after);
  d.setSeconds(0);
  d.setMilliseconds(0);
  for (let i = 0; i < 60 * 24 * 7; i++) {
    const candidate = new Date(d.getTime() + i * 60000);
    if (min !== '*' && candidate.getMinutes() !== parseInt(min, 10)) continue;
    if (hour !== '*' && candidate.getHours() !== parseInt(hour, 10)) continue;
    if (dow !== '*' && candidate.getDay() !== parseInt(dow, 10)) continue;
    return candidate.getTime();
  }
  return null;
}

export class ResearchScheduler implements ILifecycle {
  private schedules: ScheduledResearch[] = [];
  private timer: ReturnType<typeof setInterval> | null = null;
  private storage?: ILocalStorageAdapter;
  private onRun?: (module: string, params: Record<string, unknown>) => Promise<void>;

  constructor(storage?: ILocalStorageAdapter) {
    this.storage = storage;
  }

  setRunner(fn: (module: string, params: Record<string, unknown>) => Promise<void>): void {
    this.onRun = fn;
  }

  private _initialized = false;

  async init(): Promise<void> {
    if (this._initialized) return;
    this._initialized = true;
    try {
      const stored = this.storage?.getItem(STORAGE_KEY);
      if (stored) this.schedules = JSON.parse(stored);
    } catch { /* ignore */ }
    this.recomputeNextRuns();
  }

  async start(): Promise<void> {
    this.timer = setInterval(() => this.tick(), 60000);
  }

  async destroy(): Promise<void> {
    this._initialized = false;
    if (this.timer) clearInterval(this.timer);
  }

  getAll(): ScheduledResearch[] { return [...this.schedules]; }

  add(module: string, cronExpression: string, params: Record<string, unknown> = {}): ScheduledResearch {
    const schedule: ScheduledResearch = {
      id: genId('sr'),
      module, cronExpression, params, enabled: true, createdAt: Date.now(),
    };
    this.schedules.push(schedule);
    this.recomputeNextRuns();
    this.persist();
    return schedule;
  }

  update(id: string, patch: Partial<Pick<ScheduledResearch, 'cronExpression' | 'params' | 'enabled'>>): boolean {
    const s = this.schedules.find(x => x.id === id);
    if (!s) return false;
    Object.assign(s, patch);
    this.recomputeNextRuns();
    this.persist();
    return true;
  }

  remove(id: string): boolean {
    const idx = this.schedules.findIndex(x => x.id === id);
    if (idx === -1) return false;
    this.schedules.splice(idx, 1);
    this.persist();
    return true;
  }

  private tick(): void {
    const now = Date.now();
    for (const s of this.schedules) {
      if (!s.enabled || !s.nextRunAt || s.nextRunAt > now) continue;
      s.lastRunAt = now;
      s.nextRunAt = parseCronNext(s.cronExpression, now + 60000) ?? undefined;
      this.onRun?.(s.module, s.params).catch(e => LOGGER.warn('ResearchScheduler', 'Run failed', { error: e }));
    }
    this.persist();
  }

  private recomputeNextRuns(): void {
    const now = Date.now();
    for (const s of this.schedules) {
      if (!s.enabled) { s.nextRunAt = undefined; continue; }
      s.nextRunAt = parseCronNext(s.cronExpression, now + 1000) ?? undefined;
    }
  }

  private persist(): void {
    try { this.storage?.setItem(STORAGE_KEY, JSON.stringify(this.schedules)); } catch { /* full */ }
  }
}
