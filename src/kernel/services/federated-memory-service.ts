import type {
    IFederatedMemoryService,
    FederatedNode,
    FederationConfig,
    SyncSession,
    FederationRole,
} from '../contracts/federated-memory';
import type { IDatabaseService } from '../types/interfaces';
import { rootLogger } from './logger-service';

const LOGGER = rootLogger.child('FederatedMemoryService');
const genId = () => crypto.randomUUID();
const NODES_KEY = 'federated_memory_nodes';
const HISTORY_KEY = 'federated_memory_history';
const CONFIG_KEY = 'federated_memory_config';
const MAX_HISTORY = 200;
const SYNC_TIMEOUT = 10000;

export interface FederatedMemoryServiceDeps {
    database?: IDatabaseService;
}

export class FederatedMemoryService implements IFederatedMemoryService {
    private config: FederationConfig;
    private nodes: FederatedNode[] = [];
    private syncHistory: SyncSession[] = [];
    private deps: FederatedMemoryServiceDeps;

    constructor(deps?: FederatedMemoryServiceDeps) {
        this.deps = deps ?? {};
        this.config = {
            nodeId: genId(),
            nodeName: 'local-node',
            role: 'hub',
            syncInterval: 60000,
            maxPayloadSize: 10485760,
            encryptionEnabled: true,
            allowedPeers: [],
        };
    }

    async init(): Promise<void> {
        try {
            const db = this.deps.database;
            if (!db) return;
            const [savedNodes, savedHistory, savedConfig] = await Promise.all([
                db.getKv<FederatedNode[]>(NODES_KEY),
                db.getKv<SyncSession[]>(HISTORY_KEY),
                db.getKv<FederationConfig>(CONFIG_KEY),
            ]);
            if (savedNodes) this.nodes = savedNodes;
            if (savedHistory) this.syncHistory = savedHistory.slice(-MAX_HISTORY);
            if (savedConfig) this.config = savedConfig;
        } catch (e) {
            LOGGER.warn('init', 'Failed to load persisted state', { error: String(e) });
        }
    }

    private async persistNodes(): Promise<void> {
        try {
            await this.deps.database?.setKv(NODES_KEY, this.nodes);
        } catch (e) {
            LOGGER.warn('persistNodes', 'Failed to persist', { error: String(e) });
        }
    }

    private async persistHistory(): Promise<void> {
        try {
            await this.deps.database?.setKv(HISTORY_KEY, this.syncHistory.slice(-MAX_HISTORY));
        } catch (e) {
            LOGGER.warn('persistHistory', 'Failed to persist', { error: String(e) });
        }
    }

    private async persistConfig(): Promise<void> {
        try {
            await this.deps.database?.setKv(CONFIG_KEY, this.config);
        } catch (e) {
            LOGGER.warn('persistConfig', 'Failed to persist', { error: String(e) });
        }
    }

    getNodes(): FederatedNode[] {
        return this.nodes.map((n) => ({ ...n }));
    }

    getConfig(): FederationConfig {
        return { ...this.config };
    }

    updateConfig(updates: Partial<FederationConfig>): FederationConfig {
        this.config = { ...this.config, ...updates };
        void this.persistConfig();
        return { ...this.config };
    }

    connectNode(id: string, name: string, endpoint: string, role: FederationRole): FederatedNode {
        const existing = this.nodes.find((n) => n.id === id);
        if (existing) {
            existing.status = 'connected';
            existing.lastSync = Date.now();
            void this.persistNodes();
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
        void this.persistNodes();
        return { ...node };
    }

    disconnectNode(id: string): void {
        const node = this.nodes.find((n) => n.id === id);
        if (node) {
            node.status = 'disconnected';
            void this.persistNodes();
        }
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
            id: genId(),
            direction: 'bidirectional',
            peerNodeId: nodeId,
            status: 'in_progress',
            memoriesTransferred: 0,
            startedAt: Date.now(),
        };

        try {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), SYNC_TIMEOUT);

            const response = await fetch(node.endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'sync',
                    nodeId: this.config.nodeId,
                    nodeName: this.config.nodeName,
                    role: this.config.role,
                    timestamp: Date.now(),
                }),
                signal: controller.signal,
            });
            clearTimeout(timer);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json().catch(() => ({}));
            const count =
                typeof result.memoriesTransferred === 'number' ? result.memoriesTransferred : 0;

            session.status = 'completed';
            session.memoriesTransferred = count;
            session.completedAt = Date.now();
            node.syncedMemories += count;
            node.totalMemories = Math.max(node.totalMemories, node.syncedMemories);
            node.lastSync = Date.now();
        } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            LOGGER.warn('syncNode', `Sync failed for ${nodeId}`, { error: msg });
            session.status = 'failed';
            session.error = msg;
            node.status = 'error';
        }

        node.lastSync = Date.now();
        this.syncHistory.push(session);
        if (this.syncHistory.length > MAX_HISTORY) {
            this.syncHistory = this.syncHistory.slice(-MAX_HISTORY);
        }

        void this.persistNodes();
        void this.persistHistory();
        return { ...session };
    }

    getSyncHistory(): SyncSession[] {
        return this.syncHistory.map((s) => ({ ...s }));
    }
}
