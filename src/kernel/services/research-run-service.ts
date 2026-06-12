import { genId } from '../../utils/gen-id';
import { EVENTS } from '../events/event-names';

export interface ResearchRun {
  id: string;
  module: string;
  parameters: Record<string, unknown>;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt: number;
  completedAt?: number;
  findings?: string[];
  summary?: string;
  error?: string;
}

interface ResearchRunServiceDeps {
  database: {
    getKv: <T>(id: string) => Promise<T | null>;
    setKv: <T>(id: string, value: T) => Promise<void>;
  };
}

const STORAGE_KEY = 'research_run_history';

export class ResearchRunService {
  private runs: ResearchRun[] = [];
  private deps: ResearchRunServiceDeps;
  private persistTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(deps: ResearchRunServiceDeps) {
    this.deps = deps;
  }

  async init() {
    try {
      const stored = await this.deps.database.getKv<ResearchRun[]>(STORAGE_KEY);
      if (stored) this.runs = stored;
    } catch (e) {
      console.error('[ResearchRunService] Failed to load:', e);
    }
  }

  startRun(module: string, parameters: Record<string, unknown>): ResearchRun {
    const run: ResearchRun = {
      id: genId(),
      module,
      parameters,
      status: 'running',
      startedAt: Date.now(),
    };
    this.runs.unshift(run);
    void this.persist(); // B10-153: Fire-and-forget; persist() uses internal timer + catch
    return run;
  }

  completeRun(id: string, findings: string[], summary: string) {
    const run = this.runs.find(r => r.id === id);
    if (run) {
      run.status = 'completed';
      run.completedAt = Date.now();
      run.findings = findings;
      run.summary = summary;
      void this.persist(); // B10-153
    }
  }

  failRun(id: string, error: string) {
    const run = this.runs.find(r => r.id === id);
    if (run) {
      run.status = 'failed';
      run.completedAt = Date.now();
      run.error = error;
      void this.persist(); // B10-153
    }
  }

  getAllRuns(): ResearchRun[] {
    return [...this.runs];
  }

  getRunsByModule(module: string): ResearchRun[] {
    return this.runs.filter(r => r.module === module);
  }

  getRecentRuns(limit = 10): ResearchRun[] {
    return this.runs.slice(0, limit);
  }

  deleteRun(id: string) {
    this.runs = this.runs.filter(r => r.id !== id);
    void this.persist(); // B10-153
  }

  clearAll() {
    this.runs = [];
    void this.persist(); // B10-153
  }

  private persist() {
    if (this.persistTimer) clearTimeout(this.persistTimer);
    this.persistTimer = setTimeout(() => {
      this.deps.database.setKv(STORAGE_KEY, this.runs).catch(e => console.error('[ResearchRunService] Persist failed:', e));
    }, 1000);
  }
}
