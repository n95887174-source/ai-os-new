/**
 * Agent Scheduler Service
 * Cron-like scheduling for agent tasks
 */

import { EventBus } from '../event-bus';
import { EVENTS } from '../events/event-names';
import { rootLogger } from './logger-service';
import { StorageAdapter } from './storage-adapter';
import { genId } from '../../utils/gen-id';

const LOGGER = rootLogger.child('SchedulerService');

export interface Schedule {
  id: string;
  name: string;
  agentId: string;
  agentName?: string;
  cronExpression: string;
  taskParams: TaskParams;
  enabled: boolean;
  lastRun?: number;
  nextRun?: number;
  runCount: number;
  createdAt: number;
  updatedAt: number;
}

export interface TaskParams {
  prompt?: string;
  context?: Record<string, unknown>;
  priority?: 'low' | 'normal' | 'high';
  timeoutMs?: number;
}

export interface CronParts {
  minute: string;
  hour: string;
  dayOfMonth: string;
  month: string;
  dayOfWeek: string;
}

export type ScheduleFrequency = 'hourly' | 'daily' | 'weekly' | 'monthly' | 'custom';

class SchedulerService {
  private schedules: Map<string, Schedule> = new Map();
  private storage: StorageAdapter;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private checkIntervalMs = 60000; // Check every minute
  private isRunning = false;
  lastCheckTime = 0; // OBS-96: public for external watchdog

  constructor() {
    this.storage = StorageAdapter.AGENTS;
  }

  async init(): Promise<void> {
    if (this.isRunning) return;

    // Load schedules from storage
    const saved = await this.storage.get<Schedule[]>('schedules');
    if (saved) {
      for (const schedule of saved) {
        this.schedules.set(schedule.id, schedule);
      }
    }

    // Start the scheduler
    this.start();

    LOGGER.info('SchedulerService', `Initialized with ${this.schedules.size} schedules`);
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

    LOGGER.info('SchedulerService', 'Scheduler started');
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
    LOGGER.info('SchedulerService', 'Scheduler stopped');
  }

  /**
   * Create a new schedule
   */
  async create(data: {
    name: string;
    agentId: string;
    agentName?: string;
    frequency: ScheduleFrequency;
    cronExpression?: string;
    taskParams: TaskParams;
  }): Promise<Schedule> {
    const cron = data.cronExpression || this.frequencyToCron(data.frequency);
    const id = genId('schedule');
    
    const schedule: Schedule = {
      id,
      name: data.name,
      agentId: data.agentId,
      agentName: data.agentName,
      cronExpression: cron,
      taskParams: data.taskParams,
      enabled: true,
      runCount: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      nextRun: this.getNextRunTime(cron),
    };

    this.schedules.set(id, schedule);
    await this.save();

    EventBus.emit(EVENTS.SCHEDULE_CREATED, schedule);
    LOGGER.info('SchedulerService', 'Schedule created', { id, name: data.name });

    return schedule;
  }

  /**
   * Update a schedule
   */
  async update(id: string, data: Partial<Omit<Schedule, 'id' | 'createdAt'>>): Promise<Schedule | null> {
    const existing = this.schedules.get(id);
    if (!existing) return null;

    const updated: Schedule = {
      ...existing,
      ...data,
      updatedAt: Date.now(),
    };

    // Recalculate next run
    if (data.cronExpression) {
      updated.nextRun = this.getNextRunTime(data.cronExpression);
    }

    this.schedules.set(id, updated);
    await this.save();

    EventBus.emit(EVENTS.SCHEDULE_UPDATED, updated);
    LOGGER.info('SchedulerService', 'Schedule updated', { id });

    return updated;
  }

  /**
   * Delete a schedule
   */
  async delete(id: string): Promise<boolean> {
    const existing = this.schedules.get(id);
    if (!existing) return false;

    this.schedules.delete(id);
    await this.save();

    EventBus.emit(EVENTS.SCHEDULE_DELETED, { id });
    LOGGER.info('SchedulerService', 'Schedule deleted', { id });

    return true;
  }

  /**
   * Enable/disable a schedule
   */
  async toggle(id: string, enabled: boolean): Promise<Schedule | null> {
    return this.update(id, { enabled });
  }

  /**
   * Get all schedules
   */
  getAll(): Schedule[] {
    return Array.from(this.schedules.values());
  }

  /**
   * Get schedule by ID
   */
  getById(id: string): Schedule | undefined {
    return this.schedules.get(id);
  }

  /**
   * Get schedules for a specific agent
   */
  getForAgent(agentId: string): Schedule[] {
    return this.getAll().filter(s => s.agentId === agentId);
  }

  /**
   * Get pending schedules (due to run now)
   */
  getDueSchedules(): Schedule[] {
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
    this.lastCheckTime = Date.now();
    LOGGER.debug('SchedulerService', 'Heartbeat', { lastCheckTime: this.lastCheckTime });
    EventBus.emit(EVENTS.SCHEDULER_HEARTBEAT, { lastCheckTime: this.lastCheckTime });

    const due = this.getDueSchedules();
    
    for (const schedule of due) {
      await this.runSchedule(schedule);
    }
  }

  /**
   * Run a schedule
   */
  private async runSchedule(schedule: Schedule): Promise<void> {
    LOGGER.info('SchedulerService', 'Running schedule', { 
      id: schedule.id, 
      name: schedule.name,
      agentId: schedule.agentId 
    });

    try {
      // Update schedule first (before emitting trigger)
      const now = Date.now();
      await this.update(schedule.id, {
        lastRun: now,
        nextRun: this.getNextRunTime(schedule.cronExpression),
        runCount: schedule.runCount + 1,
      });

      // Emit event to trigger agent (after schedule is updated)
      EventBus.emit(EVENTS.SCHEDULE_TRIGGERED, {
        scheduleId: schedule.id,
        agentId: schedule.agentId,
        taskParams: schedule.taskParams,
        timestamp: now
      });

      EventBus.emit(EVENTS.SCHEDULE_COMPLETED, {
        scheduleId: schedule.id,
        success: true,
        timestamp: now
      });

      LOGGER.info('SchedulerService', 'Schedule completed', { 
        id: schedule.id, 
        runCount: schedule.runCount + 1 
      });
    } catch (error) {
      LOGGER.error('SchedulerService', 'Schedule failed', { 
        id: schedule.id, 
        error 
      });

      EventBus.emit(EVENTS.SCHEDULE_COMPLETED, {
        scheduleId: schedule.id,
        success: false,
        error: String(error),
        timestamp: Date.now()
      });
    }
  }

  /**
   * Parse cron expression
   */
  parseCron(cron: string): CronParts {
    const parts = cron.split(/\s+/);
    return {
      minute: parts[0] || '*',
      hour: parts[1] || '*',
      dayOfMonth: parts[2] || '*',
      month: parts[3] || '*',
      dayOfWeek: parts[4] || '*',
    };
  }

  /**
   * Convert frequency to cron expression
   */
  private frequencyToCron(frequency: ScheduleFrequency): string {
    switch (frequency) {
      case 'hourly':
        return '0 * * * *'; // Every hour at minute 0
      case 'daily':
        return '0 9 * * *'; // Every day at 9 AM
      case 'weekly':
        return '0 9 * * 1'; // Every Monday at 9 AM
      case 'monthly':
        return '0 9 1 * *'; // First day of month at 9 AM
      default:
        return '0 * * * *'; // Default: hourly
    }
  }

  /**
   * Get next run time for a cron expression
   */
  private getNextRunTime(cron: string): number {
    const parts = this.parseCron(cron);
    const now = new Date();

    // Try up to 366 days ahead for annual patterns
    for (let d = 0; d <= 366; d++) {
      const candidate = new Date(now);
      candidate.setDate(candidate.getDate() + d);
      candidate.setSeconds(0, 0);

      const m = parts.minute;
      const h = parts.hour;
      const dom = parts.dayOfMonth;
      const month = parts.month;
      const dow = parts.dayOfWeek;

      if (!this.cronMatchesField(candidate.getMinutes(), m)) continue;
      if (!this.cronMatchesField(candidate.getHours(), h)) continue;
      if (!this.cronMatchesField(candidate.getDate(), dom)) continue;
      if (!this.cronMatchesField(candidate.getMonth() + 1, month)) continue;
      if (!this.cronMatchesField(candidate.getDay(), dow)) continue;

      if (candidate.getTime() > now.getTime()) return candidate.getTime();
    }

    // Fallback: next hour
    const next = new Date(now);
    next.setMinutes(0, 0, 0);
    next.setHours(next.getHours() + 1);
    return next.getTime();
  }

  private cronMatchesField(value: number, pattern: string): boolean {
    if (pattern === '*') return true;
    // Comma-separated list
    for (const part of pattern.split(',')) {
      const rangeMatch = part.match(/^(\d+)-(\d+)$/);
      if (rangeMatch) {
        if (value >= parseInt(rangeMatch[1], 10) && value <= parseInt(rangeMatch[2], 10)) return true;
        continue;
      }
      const stepMatch = part.match(/^\*\/(\d+)$/);
      if (stepMatch) {
        if (value % parseInt(stepMatch[1], 10) === 0) return true;
        continue;
      }
      if (parseInt(part, 10) === value) return true;
    }
    return false;
  }

  /**
   * Validate cron expression
   */
  validateCron(cron: string): boolean {
    const parts = cron.split(/\s+/);
    if (parts.length < 5) return false;
    
    // Basic validation - check each part is valid
    const validPart = /^(\*|[\d,\-/]+)$/;
    return parts.every(p => validPart.test(p));
  }

  /**
   * Save schedules to storage
   */
  private async save(): Promise<void> {
    try {
      const all = this.getAll();
      await this.storage.set('schedules', all);
    } catch (e) {
      LOGGER.error('SchedulerService', 'Failed to save schedules', { error: (e as Error).message });
    }
  }

  /**
   * Get upcoming runs
   */
  getUpcoming(count = 10): Array<{ schedule: Schedule; nextRun: number }> {
    const now = Date.now();
    return this.getAll()
      .filter(s => s.enabled && s.nextRun)
      .map(s => ({ schedule: s, nextRun: s.nextRun! }))
      .filter(item => item.nextRun > now)
      .sort((a, b) => a.nextRun - b.nextRun)
      .slice(0, count);
  }

  /**
   * Clear all schedules
   */
  async clear(): Promise<void> {
    this.schedules.clear();
    await this.save();
    LOGGER.info('SchedulerService', 'All schedules cleared');
  }

  /**
   * Destroy the scheduler — clean up interval and clear state
   */
  destroy(): void {
    this.stop();
    this.schedules.clear();
    LOGGER.info('SchedulerService', 'Scheduler destroyed');
  }
}

// Singleton instance
export const schedulerService = new SchedulerService();

// Add missing events
if (!EVENTS.SCHEDULE_CREATED) {
  (EVENTS as unknown as Record<string, string>).SCHEDULE_CREATED = 'schedule:created';
}
if (!EVENTS.SCHEDULE_UPDATED) {
  (EVENTS as unknown as Record<string, string>).SCHEDULE_UPDATED = 'schedule:updated';
}
if (!EVENTS.SCHEDULE_DELETED) {
  (EVENTS as unknown as Record<string, string>).SCHEDULE_DELETED = 'schedule:deleted';
}
if (!EVENTS.SCHEDULE_TRIGGERED) {
  (EVENTS as unknown as Record<string, string>).SCHEDULE_TRIGGERED = 'schedule:triggered';
}
if (!EVENTS.SCHEDULE_COMPLETED) {
  (EVENTS as unknown as Record<string, string>).SCHEDULE_COMPLETED = 'schedule:completed';
}