import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TaskHandoffService } from './task-handoff';
import type { TaskHandoffServiceDeps } from './task-handoff';

function makeDeps(overrides: Partial<TaskHandoffServiceDeps> = {}): TaskHandoffServiceDeps {
    return {
        eventBus: { emit: vi.fn() },
        database: {
            getKv: vi.fn().mockResolvedValue(null),
            setKv: vi.fn().mockResolvedValue(undefined),
        },
        ...overrides,
    } as TaskHandoffServiceDeps;
}

describe('TaskHandoffService', () => {
    let svc: TaskHandoffService;
    let deps: TaskHandoffServiceDeps;

    beforeEach(async () => {
        deps = makeDeps();
        svc = new TaskHandoffService(deps);
        await svc.init();
    });

    function createHandoff(
        opts: Partial<{ toAgent: string; priority: 'critical' | 'high' | 'normal' | 'low' }> = {},
    ) {
        return svc.handoff({
            fromAgent: 'agent-a',
            toAgent: opts.toAgent ?? 'agent-b',
            description: 'test handoff',
            context: 'some context',
            priority: opts.priority ?? 'normal',
        });
    }

    describe('handoff', () => {
        it('should create a handoff request', () => {
            const h = createHandoff();
            expect(h.id).toBeTruthy();
            expect(h.status).toBe('pending');
            expect(h.fromAgent).toBe('agent-a');
            expect(h.toAgent).toBe('agent-b');
        });

        it('should emit event on creation', () => {
            createHandoff();
            expect(deps.eventBus.emit).toHaveBeenCalledWith(
                expect.stringContaining('handoff'),
                expect.objectContaining({ fromAgent: 'agent-a', toAgent: 'agent-b' }),
            );
        });

        it('should enforce MAX_HANDOFFS limit', () => {
            for (let i = 0; i < 250; i++) {
                svc.handoff({
                    fromAgent: 'a',
                    toAgent: 'b',
                    description: `h${i}`,
                    context: 'ctx',
                });
            }
            expect(svc.getHandoffs()).toHaveLength(200);
        });

        it('should validate target agent existence', () => {
            deps = makeDeps({ getLifecycleState: vi.fn().mockReturnValue(undefined) });
            svc = new TaskHandoffService(deps);
            expect(() => createHandoff()).toThrow('Handoff target agent "agent-b" does not exist');
        });
    });

    describe('state transitions', () => {
        it('should accept a pending handoff', () => {
            const h = createHandoff();
            svc.accept(h.id);
            expect(svc.getHandoffs().find((x) => x.id === h.id)!.status).toBe('accepted');
        });

        it('should complete a handoff', () => {
            const h = createHandoff();
            svc.complete(h.id, 'done');
            const updated = svc.getHandoffs().find((x) => x.id === h.id)!;
            expect(updated.status).toBe('completed');
            expect(updated.result).toBe('done');
            expect(updated.completedAt).toBeGreaterThan(0);
        });

        it('should fail a handoff', () => {
            const h = createHandoff();
            svc.fail(h.id, 'error occurred');
            const updated = svc.getHandoffs().find((x) => x.id === h.id)!;
            expect(updated.status).toBe('failed');
            expect(updated.result).toBe('error occurred');
        });

        it('should cancel a pending handoff', () => {
            const h = createHandoff();
            svc.cancel(h.id);
            expect(svc.getHandoffs().find((x) => x.id === h.id)!.status).toBe('cancelled');
        });

        it('should not cancel completed handoff', () => {
            const h = createHandoff();
            svc.complete(h.id, 'done');
            svc.cancel(h.id);
            expect(svc.getHandoffs().find((x) => x.id === h.id)!.status).toBe('completed');
        });

        it('should be no-op for unknown id', () => {
            expect(() => svc.accept('unknown')).not.toThrow();
            expect(() => svc.complete('unknown', 'x')).not.toThrow();
            expect(() => svc.cancel('unknown')).not.toThrow();
        });
    });

    describe('getHandoffs', () => {
        it('should return all handoffs sorted by creation date', () => {
            createHandoff();
            createHandoff();
            const all = svc.getHandoffs();
            expect(all).toHaveLength(2);
        });

        it('should filter by agent', () => {
            svc.handoff({ fromAgent: 'a', toAgent: 'b', description: 'x', context: 'x' });
            svc.handoff({ fromAgent: 'c', toAgent: 'd', description: 'y', context: 'y' });
            expect(svc.getHandoffs('a')).toHaveLength(1);
            expect(svc.getHandoffs('d')).toHaveLength(1);
        });
    });

    describe('getPendingFor', () => {
        it('should return pending handoffs sorted by priority', () => {
            svc.handoff({
                fromAgent: 'a',
                toAgent: 'agent-b',
                description: 'low',
                context: 'x',
                priority: 'low',
            });
            svc.handoff({
                fromAgent: 'a',
                toAgent: 'agent-b',
                description: 'critical',
                context: 'x',
                priority: 'critical',
            });
            svc.handoff({
                fromAgent: 'a',
                toAgent: 'agent-b',
                description: 'normal',
                context: 'x',
                priority: 'normal',
            });
            const pending = svc.getPendingFor('agent-b');
            expect(pending).toHaveLength(3);
            expect(pending[0].description).toBe('critical');
            expect(pending[1].description).toBe('normal');
            expect(pending[2].description).toBe('low');
        });

        it('should not include non-pending handoffs', () => {
            const h = createHandoff();
            svc.complete(h.id, 'done');
            expect(svc.getPendingFor('agent-b')).toHaveLength(0);
        });
    });
});
