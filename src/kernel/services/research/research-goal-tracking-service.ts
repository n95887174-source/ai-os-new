/**
 * Research Goal Tracking Service
 * OKRs and objectives for research
 */

import { rootLogger } from '../logger-service';
import { EventBus } from '../../event-bus';
import { EVENTS } from '../../events/event-names';
import { StorageAdapter } from '../storage-adapter';

const LOGGER = rootLogger.child('ResearchGoals');

export interface ResearchGoal {
  id: string;
  title: string;
  description: string;
  module?: string;
  target: number; // Target number of findings
  current: number;
  deadline?: number;
  status: 'active' | 'completed' | 'paused' | 'missed';
  keyResults: KeyResult[];
  createdAt: number;
  completedAt?: number;
}

export interface KeyResult {
  id: string;
  description: string;
  metric: string;
  target: number;
  current: number;
  unit?: string;
}

export interface GoalProgress {
  goalId: string;
  progress: number; // 0-100
  status: 'on-track' | 'at-risk' | 'behind';
  daysRemaining: number;
  estimatedCompletion?: number;
}

class ResearchGoalTrackingService {
  private storage: StorageAdapter;
  private goals: Map<string, ResearchGoal> = new Map();

  constructor() {
    this.storage = StorageAdapter.RESEARCH;
  }

  async init(): Promise<void> {
    const saved = await this.storage.get<[string, ResearchGoal][]>('goals');
    if (saved) {
      for (const [id, goal] of saved) {
        this.goals.set(id, goal);
      }
    }
    LOGGER.info('ResearchGoals', `Initialized with ${this.goals.size} goals`);
  }

  /**
   * Create goal
   */
  async createGoal(data: {
    title: string;
    description: string;
    module?: string;
    target: number;
    deadline?: number;
    keyResults?: Array<{ description: string; metric: string; target: number; unit?: string }>;
  }): Promise<ResearchGoal> {
    const goal: ResearchGoal = {
      id: `goal-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: data.title,
      description: data.description,
      module: data.module,
      target: data.target,
      current: 0,
      deadline: data.deadline,
      status: 'active',
      keyResults: (data.keyResults || []).map(kr => ({
        id: `kr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        ...kr,
        current: 0,
      })),
      createdAt: Date.now(),
    };

    this.goals.set(goal.id, goal);
    await this.save();

    EventBus.emit(EVENTS.RESEARCH_GOAL_CREATED, goal);
    LOGGER.info('ResearchGoals', 'Goal created', { id: goal.id, title: data.title });

    return goal;
  }

  /**
   * Update progress
   */
  async updateProgress(goalId: string, increment = 1): Promise<void> {
    const goal = this.goals.get(goalId);
    if (!goal || goal.status !== 'active') return;

    goal.current += increment;

    // Check if goal is completed
    if (goal.current >= goal.target) {
      goal.status = 'completed';
      goal.completedAt = Date.now();
    }

    await this.save();
    EventBus.emit(EVENTS.RESEARCH_GOAL_PROGRESS_UPDATED, goal);
  }

  /**
   * Update key result
   */
  async updateKeyResult(goalId: string, keyResultId: string, value: number): Promise<void> {
    const goal = this.goals.get(goalId);
    if (!goal) return;

    const kr = goal.keyResults.find(k => k.id === keyResultId);
    if (kr) {
      kr.current = value;
      await this.save();
      EventBus.emit(EVENTS.RESEARCH_KEY_RESULT_UPDATED, { goalId, keyResultId, value });
    }
  }

  /**
   * Get progress for all goals
   */
  getProgress(): GoalProgress[] {
    const now = Date.now();
    return Array.from(this.goals.values())
      .filter(g => g.status === 'active')
      .map(goal => {
        const progress = goal.target > 0 ? (goal.current / goal.target) * 100 : 0;
        const daysRemaining = goal.deadline 
          ? Math.max(0, Math.floor((goal.deadline - now) / (24 * 60 * 60 * 1000)))
          : 999;

        // Calculate status based on time remaining
        const expectedProgress = goal.deadline
          ? 100 - (daysRemaining / 30) * 100
          : progress;

        let status: GoalProgress['status'] = 'on-track';
        if (progress < expectedProgress - 20) {
          status = 'behind';
        } else if (progress < expectedProgress) {
          status = 'at-risk';
        }

        return {
          goalId: goal.id,
          progress: Math.min(100, progress),
          status,
          daysRemaining,
          estimatedCompletion: goal.deadline && progress > 0 
            ? now + (daysRemaining * (100 - progress) / progress * 24 * 60 * 60 * 1000)
            : undefined,
        };
      });
  }

  /**
   * Get all goals
   */
  getAll(): ResearchGoal[] {
    return Array.from(this.goals.values())
      .sort((a, b) => {
        // Active first, then by deadline
        if (a.status !== b.status) {
          const order = { active: 0, paused: 1, missed: 2, completed: 3 };
          return order[a.status] - order[b.status];
        }
        if (a.deadline && b.deadline) {
          return a.deadline - b.deadline;
        }
        return 0;
      });
  }

  /**
   * Get active goals
   */
  getActive(): ResearchGoal[] {
    return this.getAll().filter(g => g.status === 'active');
  }

  /**
   * Pause goal
   */
  async pause(goalId: string): Promise<void> {
    const goal = this.goals.get(goalId);
    if (!goal) return;

    goal.status = 'paused';
    await this.save();
    EventBus.emit(EVENTS.RESEARCH_GOAL_PAUSED, goal);
  }

  /**
   * Resume goal
   */
  async resume(goalId: string): Promise<void> {
    const goal = this.goals.get(goalId);
    if (!goal || goal.status !== 'paused') return;

    goal.status = 'active';
    await this.save();
    EventBus.emit(EVENTS.RESEARCH_GOAL_RESUMED, goal);
  }

  /**
   * Delete goal
   */
  async delete(goalId: string): Promise<boolean> {
    const deleted = this.goals.delete(goalId);
    if (deleted) {
      await this.save();
    }
    return deleted;
  }

  /**
   * Get overdue goals
   */
  getOverdue(): ResearchGoal[] {
    const now = Date.now();
    return Array.from(this.goals.values())
      .filter(g => g.status === 'active' && g.deadline && g.deadline < now);
  }

  /**
   * Get stats
   */
  getStats(): {
    total: number;
    active: number;
    completed: number;
    paused: number;
    overdue: number;
    avgProgress: number;
  } {
    const goals = this.getAll();
    const active = goals.filter(g => g.status === 'active');
    const completed = goals.filter(g => g.status === 'completed');

    return {
      total: goals.length,
      active: active.length,
      completed: completed.length,
      paused: goals.filter(g => g.status === 'paused').length,
      overdue: this.getOverdue().length,
      avgProgress: active.length > 0
        ? active.reduce((sum, g) => sum + (g.current / g.target) * 100, 0) / active.length
        : 0,
    };
  }

  private async save(): Promise<void> {
    await this.storage.set('goals', Array.from(this.goals.entries()));
  }
}

// Singleton
export const researchGoalTrackingService = new ResearchGoalTrackingService();

// Add events
if (!EVENTS.RESEARCH_GOAL_CREATED) {
  (EVENTS as unknown as Record<string, string>).RESEARCH_GOAL_CREATED = 'research:goal:created';
}
if (!EVENTS.RESEARCH_GOAL_PROGRESS_UPDATED) {
  (EVENTS as unknown as Record<string, string>).RESEARCH_GOAL_PROGRESS_UPDATED = 'research:goal:progress:updated';
}
if (!EVENTS.RESEARCH_KEY_RESULT_UPDATED) {
  (EVENTS as unknown as Record<string, string>).RESEARCH_KEY_RESULT_UPDATED = 'research:key:result:updated';
}
if (!EVENTS.RESEARCH_GOAL_PAUSED) {
  (EVENTS as unknown as Record<string, string>).RESEARCH_GOAL_PAUSED = 'research:goal:paused';
}
if (!EVENTS.RESEARCH_GOAL_RESUMED) {
  (EVENTS as unknown as Record<string, string>).RESEARCH_GOAL_RESUMED = 'research:goal:resumed';
}