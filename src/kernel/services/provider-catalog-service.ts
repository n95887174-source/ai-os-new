/**
 * Provider Marketplace Auto-Discovery Service
 * Dynamic provider catalog with auto-detection
 */

import { rootLogger } from './logger-service';
import { EventBus } from '../events/event-bus';
import { EVENTS } from '../events/event-names';
const LOGGER = rootLogger.child('ProviderCatalog');

export interface ProviderCatalogEntry {
    id: string;
    name: string;
    baseURL: string;
    authType: 'api-key' | 'oauth' | 'bearer' | 'none';
    capabilities: string[];
    models: string[];
    features: {
        streaming: boolean;
        tools: boolean;
        vision: boolean;
        embeddings: boolean;
    };
    pricing: {
        inputPer1M: number;
        outputPer1M: number;
        currency: string;
    };
    autoDetected: boolean;
    lastChecked: number;
    status: 'available' | 'unavailable' | 'unknown';
}

export interface DiscoveredProvider {
    id: string;
    name: string;
    url: string;
    models: string[];
    verified: boolean;
}

const DEFAULT_CATALOG: ProviderCatalogEntry[] = [
    {
        id: 'openai',
        name: 'OpenAI',
        baseURL: 'https://api.openai.com/v1',
        authType: 'api-key',
        capabilities: ['chat', 'embeddings', 'images'],
        models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo'],
        features: { streaming: true, tools: true, vision: true, embeddings: true },
        pricing: { inputPer1M: 2.5, outputPer1M: 10, currency: 'USD' },
        autoDetected: false,
        lastChecked: 0,
        status: 'unknown',
    },
    {
        id: 'google',
        name: 'Google Gemini',
        baseURL: 'https://generativelanguage.googleapis.com/v1beta',
        authType: 'api-key',
        capabilities: ['chat', 'vision', 'embeddings'],
        models: ['gemini-2.0-flash', 'gemini-2.5-flash', 'gemini-2.5-pro'],
        features: { streaming: true, tools: true, vision: true, embeddings: true },
        pricing: { inputPer1M: 0.1, outputPer1M: 0.4, currency: 'USD' },
        autoDetected: false,
        lastChecked: 0,
        status: 'unknown',
    },
    {
        id: 'groq',
        name: 'Groq',
        baseURL: 'https://api.groq.com/openai/v1',
        authType: 'api-key',
        capabilities: ['chat'],
        models: ['llama-3.1-8b-instant', 'llama-3.3-70b-versatile'],
        features: { streaming: true, tools: true, vision: false, embeddings: false },
        pricing: { inputPer1M: 0.08, outputPer1M: 0.24, currency: 'USD' },
        autoDetected: false,
        lastChecked: 0,
        status: 'unknown',
    },
    {
        id: 'openrouter',
        name: 'OpenRouter',
        baseURL: 'https://openrouter.ai/api/v1',
        authType: 'api-key',
        capabilities: ['chat', 'embeddings'],
        models: ['*'], // Dynamic
        features: { streaming: true, tools: true, vision: false, embeddings: true },
        pricing: { inputPer1M: 0.5, outputPer1M: 1.5, currency: 'USD' },
        autoDetected: false,
        lastChecked: 0,
        status: 'unknown',
    },
    {
        id: 'ollama',
        name: 'Ollama',
        baseURL: 'http://localhost:11434/v1',
        authType: 'none',
        capabilities: ['chat'],
        models: ['llama3', 'codellama', 'mistral', 'qwen2'],
        features: { streaming: true, tools: false, vision: false, embeddings: false },
        pricing: { inputPer1M: 0, outputPer1M: 0, currency: 'FREE' },
        autoDetected: true,
        lastChecked: 0,
        status: 'unknown',
    },
    {
        id: 'lmstudio',
        name: 'LM Studio',
        baseURL: 'http://localhost:1234/v1',
        authType: 'none',
        capabilities: ['chat'],
        models: ['*'], // Dynamic
        features: { streaming: true, tools: false, vision: false, embeddings: false },
        pricing: { inputPer1M: 0, outputPer1M: 0, currency: 'FREE' },
        autoDetected: true,
        lastChecked: 0,
        status: 'unknown',
    },
    {
        id: 'nvidia',
        name: 'NVIDIA NIM',
        baseURL: 'https://integrate.api.nvidia.com',
        authType: 'api-key',
        capabilities: ['chat'],
        models: [
            'meta/llama-3.3-70b-instruct',
            'meta/llama-3.1-8b-instruct',
            'mistralai/mistral-nemo',
        ],
        features: { streaming: true, tools: false, vision: false, embeddings: false },
        pricing: { inputPer1M: 0.6, outputPer1M: 0.6, currency: 'USD' },
        autoDetected: false,
        lastChecked: 0,
        status: 'unknown',
    },
];

class ProviderCatalogService {
    private catalog: Map<string, ProviderCatalogEntry> = new Map();
    private autoDetectedProviders: DiscoveredProvider[] = [];
    private async db(): Promise<import('../types/interfaces').IDatabaseService> {
        const { database } = await import('../instances');
        return database;
    }

    private unsubs: Array<() => void> = [];

    async init(): Promise<void> {
        // Load default catalog
        for (const entry of DEFAULT_CATALOG) {
            this.catalog.set(entry.id, { ...entry });
        }

        // Load custom entries
        const saved = await (
            await this.db()
        ).getKv<ProviderCatalogEntry[]>('provider_catalog_custom');
        if (saved) {
            for (const entry of saved) {
                this.catalog.set(entry.id, entry);
            }
        }

        // Auto-detect local providers
        await this.detectLocalProviders();

        // SI-53: Subscribe to health check results to update catalog models
        this.unsubs.push(
            EventBus.on(EVENTS.KEY_HEALTH_CHECK_COMPLETED, (data: unknown) => {
                const d = data as { provider?: string; status?: string; models?: string[] };
                if (d?.status === 'active' && d?.models && d.models.length > 0 && d.provider) {
                    const entry = this.catalog.get(d.provider);
                    if (entry) {
                        const known = new Set(entry.models);
                        for (const m of d.models) {
                            if (!known.has(m)) {
                                entry.models.push(m);
                                known.add(m);
                            }
                        }
                        entry.status = 'available';
                        entry.lastChecked = Date.now();
                    }
                }
            }),
        );

        LOGGER.info('ProviderCatalog', `Initialized with ${this.catalog.size} providers`);
    }

    destroy() {
        this.unsubs.forEach((u) => u());
    }

    /**
     * Get all catalog entries
     */
    getAll(): ProviderCatalogEntry[] {
        return Array.from(this.catalog.values());
    }

    /**
     * Get provider by ID
     */
    getById(id: string): ProviderCatalogEntry | undefined {
        return this.catalog.get(id);
    }

    /**
     * Search providers
     */
    search(query: string): ProviderCatalogEntry[] {
        const lower = query.toLowerCase();
        return this.getAll().filter(
            (p) =>
                p.name.toLowerCase().includes(lower) ||
                p.capabilities.some((c) => c.includes(lower)) ||
                p.models.some((m) => m.includes(lower)),
        );
    }

    /**
     * Get providers by capability
     */
    getByCapability(capability: string): ProviderCatalogEntry[] {
        return this.getAll().filter((p) => p.capabilities.includes(capability));
    }

    /**
     * Probe provider availability
     */
    async probe(providerId: string): Promise<boolean> {
        const entry = this.catalog.get(providerId);
        if (!entry) return false;

        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 10000);
            let response: Response;
            try {
                response = await fetch(`${entry.baseURL}/models`, {
                    method: 'GET',
                    headers: this.getAuthHeaders(entry),
                    signal: controller.signal,
                });
            } finally {
                clearTimeout(timeout);
            }

            entry.status = response.ok ? 'available' : 'unavailable';
            entry.lastChecked = Date.now();

            if (response.ok && entry.autoDetected) {
                // Update models list from response
                const data = await response.json();
                if (data.data && Array.isArray(data.data)) {
                    entry.models = data.data
                        .slice(0, 20)
                        .map((m: { id?: string }) => m.id || 'unknown');
                }
            }

            await this.save();
            EventBus.emit(EVENTS.PROVIDER_CATALOG_PROBED, { providerId, status: entry.status });

            return entry.status === 'available';
        } catch {
            entry.status = 'unavailable';
            entry.lastChecked = Date.now();
            await this.save();
            return false;
        }
    }

    /**
     * Add custom provider
     */
    async addCustom(
        entry: Omit<ProviderCatalogEntry, 'autoDetected' | 'lastChecked' | 'status'>,
    ): Promise<void> {
        const newEntry: ProviderCatalogEntry = {
            ...entry,
            autoDetected: false,
            lastChecked: 0,
            status: 'unknown',
        };

        this.catalog.set(entry.id, newEntry);
        await this.save();

        EventBus.emit(EVENTS.PROVIDER_CATALOG_ADDED, { providerId: entry.id });
        LOGGER.info('ProviderCatalog', 'Custom provider added', { id: entry.id });
    }

    /**
     * Detect local providers (Ollama, LM Studio, etc.)
     */
    async detectLocalProviders(): Promise<void> {
        const localPorts = [
            { id: 'ollama', url: 'http://localhost:11434', name: 'Ollama' },
            { id: 'lmstudio', url: 'http://localhost:1234', name: 'LM Studio' },
            { id: 'lmstudio-alt', url: 'http://localhost:8080', name: 'LM Studio (Alt)' },
        ];

        for (const port of localPorts) {
            try {
                const response = await fetch(`${port.url}/models`, {
                    method: 'GET',
                    signal: AbortSignal.timeout(3000),
                });

                if (response.ok) {
                    const data = await response.json();
                    const models =
                        data.data?.slice(0, 10).map((m: { id?: string }) => m.id || 'unknown') ||
                        [];

                    const discovered: DiscoveredProvider = {
                        id: port.id,
                        name: port.name,
                        url: port.url,
                        models,
                        verified: true,
                    };

                    this.autoDetectedProviders.push(discovered);

                    // Update catalog entry
                    const existing = this.catalog.get(port.id);
                    if (existing) {
                        existing.status = 'available';
                        existing.lastChecked = Date.now();
                        if (models.length > 0) {
                            existing.models = models;
                        }
                    }

                    EventBus.emit(EVENTS.LOCAL_PROVIDER_DETECTED, discovered);
                    LOGGER.info('ProviderCatalog', 'Local provider detected', {
                        id: port.id,
                        models: models.length,
                    });
                }
            } catch {
                // Port not available
            }
        }

        await this.save();
    }

    /**
     * Get auto-detected providers
     */
    getAutoDetected(): DiscoveredProvider[] {
        return this.autoDetectedProviders;
    }

    /**
     * Get available providers
     */
    getAvailable(): ProviderCatalogEntry[] {
        return this.getAll().filter((p) => p.status === 'available');
    }

    private getAuthHeaders(entry: ProviderCatalogEntry, apiKey?: string): Record<string, string> {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };

        switch (entry.authType) {
            case 'api-key':
                // B10-109: Use actual API key, not literal string
                headers['Authorization'] = `Bearer ${apiKey || ''}`;
                break;
            case 'bearer':
                // B10-109: Use actual bearer token, not literal string
                headers['Authorization'] = `Bearer ${apiKey || ''}`;
                break;
        }

        return headers;
    }

    private async save(): Promise<void> {
        const custom = this.getAll().filter((p) => !DEFAULT_CATALOG.some((d) => d.id === p.id));
        await (await this.db()).setKv('provider_catalog_custom', custom);
    }
}

// Singleton
export const providerCatalogService = new ProviderCatalogService();

// H-18: Clean up event listeners on HMR
if (import.meta.hot) {
    import.meta.hot.dispose(() => {
        providerCatalogService.destroy();
    });
}
