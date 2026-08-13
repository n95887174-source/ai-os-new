import { describe, it, expect } from 'vitest';
import { AuditorTopology } from './topology-defaults';

describe('AuditorTopology agent identity', () => {
    const agentNodes = AuditorTopology.nodes.filter((n) => n.type === 'agent');

    it('has 25 specialized agents', () => {
        expect(agentNodes.length).toBe(25);
    });

    it('every agent carries a complete canonical identity', () => {
        for (const node of agentNodes) {
            const cfg = node.config as Record<string, unknown>;
            expect(cfg.displayName, `${node.id} displayName`).toBeTruthy();
            expect(cfg.baseRole, `${node.id} baseRole`).toBeTruthy();
            expect(Array.isArray(cfg.specializations), `${node.id} specializations`).toBe(true);
            expect(Array.isArray(cfg.lensIds), `${node.id} lensIds`).toBe(true);
            const avatar = cfg.avatar as { emoji?: string; color?: string };
            expect(avatar?.emoji, `${node.id} avatar.emoji`).toBeTruthy();
            expect(avatar?.color, `${node.id} avatar.color`).toBeTruthy();
        }
    });

    it('identity derives from the node (no fabricated personal names)', () => {
        const network = agentNodes.find((n) => n.id === 'agent-network')!;
        const cfg = network.config as Record<string, unknown>;
        expect(cfg.displayName).toBe(network.label);
        expect(cfg.baseRole).toBe(cfg.roleName);
    });
});
