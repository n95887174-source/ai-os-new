/**
 * Agent Delegation Service
 * Sub-agent spawning and coordination
 */

import { rootLogger } from './logger-service';
import { EventBus } from '../event-bus';
import { EVENTS } from '../events/event-names';

const LOGGER = rootLogger.child('AgentDelegation');

export interface DelegationTask {
  id: string;
  parentAgentId: string;
  subAgentId: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: string;
  createdAt: number;
  completedAt?: number;
}

export interface DelegationResult {
  taskId: string;
  success: boolean;
  output?: string;
  error?: string;
  durationMs: number;
}

class AgentDelegationService {
  private tasks: Map<string, DelegationTask> = new Map();

  /**
   * Create delegation task
   */
  createTask(
    parentAgentId: string,
    subAgentId: string,
    description: string
  ): DelegationTask {
    const id = `delegation-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    
    const task: DelegationTask = {
      id,
      parentAgentId,
      subAgentId,
      description,
      status: 'pending',
      createdAt: Date.now(),
    };

    this.tasks.set(id, task);

    EventBus.emit(EVENTS.AGENT_DELEGATION_CREATED, task);
    LOGGER.info('AgentDelegation', 'Task delegated', { id, parentAgentId, subAgentId });

    return task;
  }

  /**
   * Start delegation task
   */
  startTask(taskId: string): void {
    const task = this.tasks.get(taskId);
    if (!task) return;

    task.status = 'running';
    EventBus.emit(EVENTS.AGENT_DELEGATION_STARTED, task);
  }

  /**
   * Complete delegation task
   */
  completeTask(taskId: string, result: string): void {
    const task = this.tasks.get(taskId);
    if (!task) return;

    task.status = 'completed';
    task.result = result;
    task.completedAt = Date.now();

    EventBus.emit(EVENTS.AGENT_DELEGATION_COMPLETED, task);
    LOGGER.info('AgentDelegation', 'Task completed', { taskId, durationMs: task.completedAt! - task.createdAt });
  }

  /**
   * Fail delegation task
   */
  failTask(taskId: string, error: string): void {
    const task = this.tasks.get(taskId);
    if (!task) return;

    task.status = 'failed';
    task.result = error;
    task.completedAt = Date.now();

    EventBus.emit(EVENTS.AGENT_DELEGATION_FAILED, task);
    LOGGER.error('AgentDelegation', 'Task failed', { taskId, error });
  }

  /**
   * Get tasks for parent agent
   */
  getTasksByParent(parentAgentId: string): DelegationTask[] {
    return Array.from(this.tasks.values())
      .filter(t => t.parentAgentId === parentAgentId)
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * Get active delegations
   */
  getActiveDelegations(): DelegationTask[] {
    return Array.from(this.tasks.values())
      .filter(t => t.status === 'running' || t.status === 'pending');
  }

  /**
   * Get task by ID
   */
  getTask(taskId: string): DelegationTask | undefined {
    return this.tasks.get(taskId);
  }

  /**
   * Cancel task
   */
  cancelTask(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task || task.status === 'completed' || task.status === 'failed') return false;

    task.status = 'failed';
    task.result = 'Cancelled by parent agent';
    task.completedAt = Date.now();

    EventBus.emit(EVENTS.AGENT_DELEGATION_CANCELLED, task);
    return true;
  }
}

// Singleton
export const agentDelegationService = new AgentDelegationService();

// Add events
if (!EVENTS.AGENT_DELEGATION_CREATED) {
  (EVENTS as unknown as Record<string, string>).AGENT_DELEGATION_CREATED = 'agent:delegation:created';
}
if (!EVENTS.AGENT_DELEGATION_STARTED) {
  (EVENTS as unknown as Record<string, string>).AGENT_DELEGATION_STARTED = 'agent:delegation:started';
}
if (!EVENTS.AGENT_DELEGATION_COMPLETED) {
  (EVENTS as unknown as Record<string, string>).AGENT_DELEGATION_COMPLETED = 'agent:delegation:completed';
}
if (!EVENTS.AGENT_DELEGATION_FAILED) {
  (EVENTS as unknown as Record<string, string>).AGENT_DELEGATION_FAILED = 'agent:delegation:failed';
}
if (!EVENTS.AGENT_DELEGATION_CANCELLED) {
  (EVENTS as unknown as Record<string, string>).AGENT_DELEGATION_CANCELLED = 'agent:delegation:cancelled';
}