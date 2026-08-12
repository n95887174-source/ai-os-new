/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ConversationScenario } from '../contracts/conversation/scenario';
import type { TurnProposal } from '../contracts/conversation/turn';
import type { TurnResult, IExecutionEngine } from '../contracts/conversation/execution';
import type { ScenarioRepository } from '../dal/scenario-repository';
import { ConversationDirectorService } from './conversation-director-service';

function turn(participantId: string, description: string): TurnProposal {
    return {
        participantId,
        objective: { type: 'CUSTOM', description, constraints: [] },
    };
}

function makeScenario(turns: TurnProposal[]): ConversationScenario {
    return {
        id: 's1',
        name: 'Test Scenario',
        description: 'B3 test',
        version: 1,
        status: 'active',
        participants: turns.map((t) => ({ id: t.participantId, role: 'agent' })),
        turns,
        createdAt: Date.now(),
        updatedAt: Date.now(),
    };
}

/** In-memory ScenarioRepository fake that returns exactly one scenario. */
function makeRepo(scenario: ConversationScenario): ScenarioRepository {
    return {
        get: async (id: string) => (id === scenario.id ? scenario : undefined),
    } as unknown as ScenarioRepository;
}

/**
 * Mock execution engine. Optionally invokes a hook on each call (e.g. to
 * trigger pause/abort from within a turn), and can be configured to throw.
 */
function makeEngine(opts?: {
    onExecute?: (
        call: number,
        proposal: TurnProposal,
        director: ConversationDirectorService,
    ) => void;
    throwOnCall?: number;
}): { engine: IExecutionEngine; executed: () => TurnProposal[] } {
    const executed: TurnProposal[] = [];
    let call = 0;
    const engine: IExecutionEngine = {
        async execute(proposal) {
            call++;
            executed.push(proposal);
            opts?.onExecute?.(call, proposal, (globalThis as any).__director);
            if (opts?.throwOnCall && call === opts.throwOnCall) {
                throw new Error(`engine failure on call ${call}`);
            }
            return { success: true, content: `ran ${proposal.participantId}` };
        },
    };
    return { engine, executed: () => executed };
}

beforeEach(() => {
    (globalThis as any).__director = undefined;
});

describe('ConversationDirectorService (B3)', () => {
    it('rejects loadScenario for a missing id', async () => {
        const director = new ConversationDirectorService(
            { get: async () => undefined } as unknown as ScenarioRepository,
            makeEngine().engine,
        );
        await expect(director.loadScenario('missing')).rejects.toThrow(/not found/);
    });

    it('rejects run() when no scenario is loaded', async () => {
        const director = new ConversationDirectorService(
            makeRepo(makeScenario([turn('a', 'one')])),
            makeEngine().engine,
        );
        await expect(director.run()).rejects.toThrow(/no scenario loaded/);
    });

    it('executes an ordered turn sequence to completion', async () => {
        const turns = [turn('a', 'one'), turn('b', 'two'), turn('c', 'three')];
        const scenario = makeScenario(turns);
        const { engine, executed } = makeEngine();
        const director = new ConversationDirectorService(makeRepo(scenario), engine);
        await director.loadScenario('s1');
        await director.run();

        expect(director.getState()).toBe('completed');
        expect(executed().map((t) => t.participantId)).toEqual(['a', 'b', 'c']);
        const results = director.getResults();
        expect(results).toHaveLength(3);
        expect(results.every((r: TurnResult) => r.success)).toBe(true);
        expect(director.getScenario()?.id).toBe('s1');
    });

    it('pause() stops the loop and resume() continues to completion', async () => {
        const turns = [turn('a', 'one'), turn('b', 'two'), turn('c', 'three')];
        const scenario = makeScenario(turns);
        const { engine, executed } = makeEngine({
            onExecute: (call, _p, director) => {
                if (call === 1) director.pause();
            },
        });
        const director = new ConversationDirectorService(makeRepo(scenario), engine);
        (globalThis as any).__director = director;
        await director.loadScenario('s1');

        await director.run();
        expect(director.getState()).toBe('paused');
        expect(executed()).toHaveLength(1);

        await director.resume();
        expect(director.getState()).toBe('completed');
        expect(executed().map((t) => t.participantId)).toEqual(['a', 'b', 'c']);
    });

    it('skipNext() drops the first planned turn', async () => {
        const turns = [turn('a', 'one'), turn('b', 'two'), turn('c', 'three')];
        const scenario = makeScenario(turns);
        const { engine, executed } = makeEngine();
        const director = new ConversationDirectorService(makeRepo(scenario), engine);
        await director.loadScenario('s1');
        director.skipNext();
        await director.run();

        expect(director.getState()).toBe('completed');
        expect(executed().map((t) => t.participantId)).toEqual(['b', 'c']);
    });

    it('overrideTurn() inserts a turn at the front without consuming the cursor', async () => {
        const turns = [turn('a', 'one'), turn('b', 'two'), turn('c', 'three')];
        const scenario = makeScenario(turns);
        const { engine, executed } = makeEngine();
        const director = new ConversationDirectorService(makeRepo(scenario), engine);
        await director.loadScenario('s1');
        director.overrideTurn(turn('OV', 'override'));
        await director.run();

        // override runs first, then all three scripted turns still run.
        expect(executed().map((t) => t.participantId)).toEqual(['OV', 'a', 'b', 'c']);
        expect(director.getState()).toBe('completed');
    });

    it('abort() stops the loop and records an aborted state', async () => {
        const turns = [turn('a', 'one'), turn('b', 'two'), turn('c', 'three')];
        const scenario = makeScenario(turns);
        const { engine, executed } = makeEngine({
            onExecute: (call, _p, director) => {
                if (call === 1) director.abort();
            },
        });
        const director = new ConversationDirectorService(makeRepo(scenario), engine);
        (globalThis as any).__director = director;
        await director.loadScenario('s1');

        await director.run();
        expect(director.getState()).toBe('aborted');
        expect(executed()).toHaveLength(1);
    });

    it('surfaces an execution error as the error state while recording the failure', async () => {
        const turns = [turn('a', 'one'), turn('b', 'two'), turn('c', 'three')];
        const scenario = makeScenario(turns);
        const { engine } = makeEngine({ throwOnCall: 2 });
        const director = new ConversationDirectorService(makeRepo(scenario), engine);
        await director.loadScenario('s1');

        await expect(director.run()).rejects.toThrow(/engine failure/);
        expect(director.getState()).toBe('error');
        const results = director.getResults();
        expect(results).toHaveLength(2);
        expect(results[0]!.success).toBe(true);
        expect(results[1]!.success).toBe(false);
        expect(results[1]!.error).toContain('engine failure');
    });

    it('has no Debate/Forum dependency', () => {
        const file = readFileSync(join(__dirname, 'conversation-director-service.ts'), 'utf8');
        const forbidden = [
            'DebateOrchestrator',
            'ConversationBackedDebateOrchestrator',
            'IDebateOrchestrator',
            'DEBATE_',
            'IForumService',
        ];
        for (const token of forbidden) {
            expect(file.includes(token), `unexpected dependency: ${token}`).toBe(false);
        }
    });
});
