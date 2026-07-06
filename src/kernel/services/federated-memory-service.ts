import type {
    IFederatedMemoryService,
    FederatedNode,
    FederationConfig,
    SyncSession,
    FederationRole,
} from '../contracts/federated-memory';

const genId = () => crypto.randomUUID();
const genSyncId = () => crypto.randomUUID();

/**
 * @deprecated MOCK — No real network sync occurs.
 * syncNode() uses Math.random() for fake transfer counts and setTimeout(1200) for fake latency.
 * Does NOT persist nodes or syncHistory. Do not ship — mark as EXPERIMENTAL in UI.
 */
export class FederatedMemoryService implements IFederatedMemoryService {
    private config: FederationConfig = {
        nodeId: genId(),
        nodeName: 'local-node',
        role: 'hub',
        syncInterval: 60000,
        maxPayloadSize: 10485760,
        encryptionEnabled: true,
        allowedPeers: ['node-alpha', 'node-beta'],
    };

    private nodes: FederatedNode[] = [
        {
            id: 'node-alpha',
            name: 'Alpha Cluster',
            role: 'hub',
            endpoint: 'https://alpha.fedmem.io',
            status: 'connected',
            lastSync: Date.now() - 300000,
            totalMemories: 12400,
            syncedMemories: 11800,
        },
        {
            id: 'node-beta',
            name: 'Beta Edge',
            role: 'node',
            endpoint: 'https://beta.fedmem.io',
            status: 'connected',
            lastSync: Date.now() - 600000,
            totalMemories: 5600,
            syncedMemories: 5400,
        },
        {
            id: 'node-gamma',
            name: 'Gamma Research',
            role: 'peer',
            endpoint: 'https://gamma.fedmem.io',
            status: 'disconnected',
            lastSync: Date.now() - 86400000,
            totalMemories: 8900,
            syncedMemories: 0,
        },
    ];

    private syncHistory: SyncSession[] = [
        {
            id: genSyncId(),
            direction: 'bidirectional',
            peerNodeId: 'node-alpha',
            status: 'completed',
            memoriesTransferred: 234,
            startedAt: Date.now() - 3600000,
            completedAt: Date.now() - 3590000,
        },
        {
            id: genSyncId(),
            direction: 'pull',
            peerNodeId: 'node-beta',
            status: 'completed',
            memoriesTransferred: 89,
            startedAt: Date.now() - 7200000,
            completedAt: Date.now() - 7180000,
        },
    ];

    getNodes(): FederatedNode[] {
        return [...this.nodes];
    }

    getConfig(): FederationConfig {
        return { ...this.config };
    }

    updateConfig(updates: Partial<FederationConfig>): FederationConfig {
        this.config = { ...this.config, ...updates };
        return { ...this.config };
    }

    connectNode(id: string, name: string, endpoint: string, role: FederationRole): FederatedNode {
        const existing = this.nodes.find((n) => n.id === id);
        if (existing) {
            existing.status = 'connected';
            existing.lastSync = Date.now();
            return { ...existing };
        }
        const node: FederatedNode = {
            id,
            name,
            role,
            endpoint,
            status: 'connected',
            lastSync: Date.now(),
            totalMemories: 0,
            syncedMemories: 0,
        };
        this.nodes.push(node);
        return node;
    }

    disconnectNode(id: string): void {
        const node = this.nodes.find((n) => n.id === id);
        if (node) node.status = 'disconnected';
    }

    async syncAll(): Promise<SyncSession[]> {
        const sessions: SyncSession[] = [];
        for (const node of this.nodes.filter((n) => n.status === 'connected')) {
            const session = await this.syncNode(node.id);
            sessions.push(session);
        }
        return sessions;
    }

    async syncNode(nodeId: string): Promise<SyncSession> {
        const node = this.nodes.find((n) => n.id === nodeId);
        if (!node) throw new Error(`Node ${nodeId} not found`);
        const session: SyncSession = {
            id: genSyncId(),
            direction: 'bidirectional',
            peerNodeId: nodeId,
            status: 'in_progress',
            memoriesTransferred: 0,
            startedAt: Date.now(),
        };
        await new Promise((r) => setTimeout(r, 1200));
        const count = Math.floor(Math.random() * 200) + 20;
        session.status = 'completed';
        session.memoriesTransferred = count;
        session.completedAt = Date.now();
        node.syncedMemories += count;
        node.totalMemories = Math.max(node.totalMemories, node.syncedMemories);
        node.lastSync = Date.now();
        this.syncHistory.push(session);
        return { ...session };
    }

    getSyncHistory(): SyncSession[] {
        return [...this.syncHistory];
    }
}
