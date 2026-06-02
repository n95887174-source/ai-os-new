/**
 * Research Scheduler Service
 * Cron-like scheduling for automated research runs
 */

import { EventBus } from '../../event-bus';
import { EVENTS } from '../../events/event-names';
import { rootLogger } from '../logger-service';
import { StorageAdapter } from '../storage-adapter';

const LOGGER = rootLogger.child('ResearchScheduler');

export type ResearchModule = 
  | 'architecture-review'
  | 'prompt-audit'
  | 'obs-gaps'
  | 'routing-experiments'
  | 'hypothesis-generator'
  | 'gov-stress-test'
  | 'project-os';

export interface ResearchSchedule {
  id: string;
  name: string;
  module: ResearchModule;
  cronExpression: string;
  params: Record<string, unknown>;
  enabled: boolean;
  notifyOnFindings: boolean;
  lastRun?: number;
  nextRun?: number;
  runCount: number;
  createdAt: number;
  updatedAt: number;
}

export interface ResearchRunResult {
  scheduleId: string;
  runId: string;
  status: 'success' | 'partial' | 'failed';
  findingsCount: number;
  highSeverityCount: number;
  timestamp: number;
}

class ResearchSchedulerService {
  private schedules: Map<string, ResearchSchedule> = new Map();
  private runResults: Map<string, ResearchRunResult[]> = new Map();
  private storage: StorageAdapter;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private checkIntervalMs = 60000; // Check every minute
  private isRunning = false;
  private maxResultsPerSchedule = 100;

  constructor() {
    this.storage = new StorageAdapter('research-scheduler');
  }

  async init(): Promise<void> {
    if (this.isRunning) return;

    // Load schedules
    const saved = await this.storage.get<ResearchSchedule[]>('schedules');
    if (saved) {
      for (const schedule of saved) {
        this.schedules.set(schedule.id, schedule);
      }
    }

    // Load results
    const savedResults = await this.storage.get<{ scheduleId: string; results: ResearchRunResult[] }[]>('results');
    if (savedResults) {
      for (const { scheduleId, results } of savedResults) {
        this.runResults.set(scheduleId, results);
      }
    }

    // Start scheduler
    this.start();

    LOGGER.info('ResearchScheduler', `Initialized with ${this.schedules.size} schedules`);
  }

  /**
   * Start the scheduler
   */
  start(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    this.intervalId = setInterval(() => {
      this.checkSchedules();
    }, this.checkIntervalMs);

    LOGGER.info('ResearchScheduler', 'Scheduler started');
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    LOGGER.info('ResearchScheduler', 'Scheduler stopped');
  }

  /**
   * Create a research schedule
   */
  async create(data: {
    name: string;
    module: ResearchModule;
    cronExpression: string;
    params?: Record<string, unknown>;
    notifyOnFindings?: boolean;
  }): Promise<ResearchSchedule> {
    const id = `research-schedule-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    const schedule: ResearchSchedule = {
      id,
      name: data.name,
      module: data.module,
      cronExpression: data.cronExpression,
      params: data.params || {},
      enabled: true,
      notifyOnFindings: data.notifyOnFindings ?? true,
      runCount: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      nextRun: this.getNextRunTime(data.cronExpression),
    };

    this.schedules.set(id, schedule);
    await this.save();

    EventBus.emit(EVENTS.RESEARCH_SCHEDULE_CREATED, schedule);
    LOGGER.info('ResearchScheduler', 'Schedule created', { id, name: data.name, module: data.module });

    return schedule;
  }

  /**
   * Update a schedule
   */
  async update(id: string, data: Partial<Omit<ResearchSchedule, 'id' | 'createdAt'>>): Promise<ResearchSchedule | null> {
    const existing = this.schedules.get(id);
    if (!existing) return null;

    const updated: ResearchSchedule = {
      ...existing,
      ...data,
      updatedAt: Date.now(),
    };

    if (data.cronExpression) {
      updated.nextRun = this.getNextRunTime(data.cronExpression);
    }

    this.schedules.set(id, updated);
    await this.save();

    EventBus.emit(EVENTS.RESEARCH_SCHEDULE_UPDATED, updated);
    LOGGER.info('ResearchScheduler', 'Schedule updated', { id });

    return updated;
  }

  /**
   * Delete a schedule
   */
  async delete(id: string): Promise<boolean> {
    const existing = this.schedules.get(id);
    if (!existing) return false;

    this.schedules.delete(id);
    this.runResults.delete(id);
    await this.save();
    await this.saveResults();

    EventBus.emit(EVENTS.RESEARCH_SCHEDULE_DELETED, { id });
    LOGGER.info('ResearchScheduler', 'Schedule deleted', { id });

    return true;
  }

  /**
   * Toggle schedule enabled state
   */
  async toggle(id: string, enabled: boolean): Promise<ResearchSchedule | null> {
    return this.update(id, { enabled });
  }

  /**
   * Get all schedules
   */
  getAll(): ResearchSchedule[] {
    return Array.from(this.schedules.values());
  }

  /**
   * Get schedule by ID
   */
  getById(id: string): ResearchSchedule | undefined {
    return this.schedules.get(id);
  }

  /**
   * Get schedules for a module
   */
  getForModule(module: ResearchModule): ResearchSchedule[] {
    return this.getAll().filter(s => s.module === module);
  }

  /**
   * Get pending schedules (due to run)
   */
  getDueSchedules(): ResearchSchedule[] {
    const now = Date.now();
    return this.getAll().filter(s => 
      s.enabled && 
      s.nextRun && 
      s.nextRun <= now
    );
  }

  /**
   * Manually trigger a schedule
   */
  async trigger(id: string): Promise<boolean> {
    const schedule = this.schedules.get(id);
    if (!schedule) return false;

    await this.runSchedule(schedule);
    return true;
  }

  /**
   * Check and run due schedules
   */
  private async checkSchedules(): Promise<void> {
    const due = this.getDueSchedules();

    for (const schedule of due) {
      await this.runSchedule(schedule);
    }
  }

  /**
   * Run a research schedule
   */
  private async runSchedule(schedule: ResearchSchedule): Promise<void> {
    LOGGER.info('ResearchScheduler', 'Running research schedule', {
      id: schedule.id,
      name: schedule.name,
      module: schedule.module
    });

    const runId = `run-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const now = Date.now();

    try {
      // Emit event to trigger the research module
      EventBus.emit(EVENTS.RESEARCH_TRIGGERED, {
        scheduleId: schedule.id,
        runId,
        module: schedule.module,
        params: schedule.params,
        timestamp: now
      });

      // Update schedule
      await this.update(schedule.id, {
        lastRun: now,
        nextRun: this.getNextRunTime(schedule.cronExpression),
        runCount: schedule.runCount + 1,
      });

      LOGGER.info('ResearchScheduler', 'Research schedule triggered', {
        scheduleId: schedule.id,
        runId
      });
    } catch (error) {
      LOGGER.error('ResearchScheduler', 'Failed to run research schedule', {
        scheduleId: schedule.id,
        error
      });

      // Record failed run
      this.recordResult(schedule.id, {
        scheduleId: schedule.id,
        runId,
        status: 'failed',
        findingsCount: 0,
        highSeverityCount: 0,
        timestamp: now
      });
    }
  }

  /**
   * Record a run result (called by research modules after completion)
   */
  recordResult(scheduleId: string, result: ResearchRunResult): void {
    if (!this.runResults.has(scheduleId)) {
      this.runResults.set(scheduleId, []);
    }

    const results = this.runResults.get(scheduleId)!;
    results.push(result);

    // Trim old results
    if (results.length > this.maxResultsPerSchedule) {
      results.splice(0, results.length - this.maxResultsPerSchedule);
    }

    this.saveResults();

    // Notify if requested
    const schedule = this.schedules.get(scheduleId);
    if (schedule?.notifyOnFindings && result.findingsCount > 0) {
      EventBus.emit(EVENTS.RESEARCH_FINDINGS_AVAILABLE, {
        scheduleId,
        runId: result.runId,
        findingsCount: result.findingsCount,
        highSeverityCount: result.highSeverityCount
      });
    }
  }

  /**
   * Get run results for a schedule
   */
  getResults(scheduleId: string): ResearchRunResult[] {
    return this.runResults.get(scheduleId) || [];
  }

  /**
   * Get next run time for a cron expression
   */
  private getNextRunTime(cron: string): number {
    const parts = cron.split(/\s+/);
    if (parts.length < 5) return Date.now() + 3600000;

    const now = new Date();
    const next = new Date(now);

    // Simple calculation for common patterns
    const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

    // Daily at specific time
    if (dayOfMonth === '*' && month === '*' && dayOfWeek === '*' && hour !== '*' && minute !== '*') {
      next.setHours(parseInt(hour), parseInt(minute), 0, 0);
      if (next.getTime() <= now.getTime()) {
        next.setDate(next.getDate() + 1);
      }
      return next.getTime();
    }

    // Weekly on specific day
    if (dayOfWeek !== '*' && hour !== '*') {
      next.setHours(parseInt(hour), parseInt(minute), 0, 0);
      const targetDay = parseInt(dayOfWeek);
      const currentDay = next.getDay();
      let daysUntil = targetDay - currentDay;
      if (daysUntil <= 0) daysUntil += 7;
      next.setDate(next.getDate() + daysUntil);
      return next.getTime();
    }

    // Default: next hour
    next.setMinutes(parseInt(minute) || 0, 0, 0);
    next.setHours(next.getHours() + 1);
    return next.getTime();
  }

  /**
   * Validate cron expression
   */
  validateCron(cron: string): boolean {
    const parts = cron.split(/\s+/);
    if (parts.length < 5) return false;

    const validPart = /^(\*|[\d,\-\/]+)$/;
    return parts.every(p => validPart.test(p));
  }

  /**
   * Get available research modules
   */
  getAvailableModules(): ResearchModule[] {
    return [
      'architecture-review',
      'prompt-audit',
      'obs-gaps',
      'routing-experiments',
      'hypothesis-generator',
      'gov-stress-test',
      'project-os'
    ];
  }

  /**
   * Get module display name
   */
  getModuleDisplayName(module: ResearchModule): string {
    const names: Record<ResearchModule, string> = {
      'architecture-review': 'Architecture Review',
      'prompt-audit': 'Prompt Audit',
      'obs-gaps': 'Observability Gaps',
      'routing-experiments': 'Routing Experiments',
      'hypothesis-generator': 'Hypothesis Generator',
      'gov-stress-test': 'Governance Stress Test',
      'project-os': 'Project OS Explorer'
    };
    return names[module] || module;
  }

  /**
   * Get upcoming runs
   */
  getUpcoming(count = 10): Array<{ schedule: ResearchSchedule; nextRun: number }> {
    const now = Date.now();
    return this.getAll()
      .filter(s => s.enabled && s.nextRun)
      .map(s => ({ schedule: s, nextRun: s.nextRun! }))
      .filter(item => item.nextRun > now)
      .sort((a, b) => a.nextRun - b.nextRun)
      .slice(0, count);
  }

  private async save(): Promise<void> {
    await this.storage.set('schedules', this.getAll());
  }

  private async saveResults(): Promise<void> {
    const data = Array.from(this.runResults.entries()).map(([scheduleId, results]) => ({
      scheduleId,
      results
    }));
    await this.storage.set('results', data);
  }

  /**
   * Clear all schedules
   */
  async clear(): Promise<void> {
    this.schedules.clear();
    this.runResults.clear();
    await this.save();
    await this.saveResults();
    LOGGER.info('ResearchScheduler', 'All schedules cleared');
  }
}

// Singleton instance
export const researchSchedulerService = new ResearchSchedulerService();

// Add missing events
if (!EVENTS.RESEARCH_SCHEDULE_CREATED) {
  (EVENTS as unknown as Record<string, string>).RESEARCH_SCHEDULE_CREATED = 'research:schedule:created';
}
if (!EVENTS.RESEARCH_SCHEDULE_UPDATED) {
  (EVENTS as unknown as Record<string, string>).RESEARCH_SCHEDULE_UPDATED = 'research:schedule:updated';
}
if (!EVENTS.RESEARCH_SCHEDULE_DELETED) {
  (EVENTS as unknown as Record<string, string>).RESEARCH_SCHEDULE_DELETED = 'research:schedule:deleted';
}
if (!EVENTS.RESEARCH_TRIGGERED) {
  (EVENTS as unknown as Record<string, string>).RESEARCH_TRIGGERED = 'research:triggered';
}
if (!EVENTS.RESEARCH_FINDINGS_AVAILABLE) {
  (EVENTS as unknown as Record<string, string>).RESEARCH_FINDINGS_AVAILABLE = 'research:findings:available';
}