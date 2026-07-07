import type { ILifecycle } from '../contracts/lifecycle';
import type { IEventBus } from '../types/interfaces';
import { rootLogger } from './logger-service';

const LOGGER = rootLogger.child('AgentMarketplace');

export interface MarketplaceItem {
    id: string;
    type: 'prompt' | 'skill' | 'template' | 'topology';
    title: string;
    description: string;
    author: string;
    rating: number;
    downloads: number;
    content: unknown;
}

export interface AgentMarketplaceDeps {
    eventBus: IEventBus;
}

export class AgentMarketplace implements ILifecycle {
    private items: MarketplaceItem[] = [];

    constructor(_deps: AgentMarketplaceDeps) {
        this.seedMockData();
    }

    async init() {
        LOGGER.info('AgentMarketplace', 'init: no persistence — ephemeral mock data');
    }
    async start() {
        LOGGER.info('AgentMarketplace', 'start: ready');
    }
    destroy() {
        LOGGER.info('AgentMarketplace', 'destroy: clearing items');
        this.items = [];
    }

    private seedMockData() {
        this.items.push(
            {
                id: 'item-1',
                type: 'topology',
                title: 'Security Audit Swarm',
                description: '3 agents checking for vulns',
                author: 'AI-OS Team',
                rating: 4.8,
                downloads: 120,
                content: {},
            },
            {
                id: 'item-2',
                type: 'prompt',
                title: 'Socratic Challenger',
                description: 'Advanced prompt for deep technical debates',
                author: 'Community',
                rating: 4.5,
                downloads: 89,
                content: 'You are a strict Socratic challenger...',
            },
            {
                id: 'item-3',
                type: 'template',
                title: 'Code Reviewer',
                description: 'Standard code review agent setup',
                author: 'Community',
                rating: 4.9,
                downloads: 340,
                content: {},
            },
        );
    }

    search(query: string, type?: MarketplaceItem['type']): MarketplaceItem[] {
        let results = this.items;
        if (type) results = results.filter((i) => i.type === type);
        if (query) {
            const q = query.toLowerCase();
            results = results.filter(
                (i) => i.title.toLowerCase().includes(q) || i.description.toLowerCase().includes(q),
            );
        }
        return results;
    }

    publish(item: Omit<MarketplaceItem, 'id' | 'rating' | 'downloads'>): MarketplaceItem {
        if (!item.type || !['prompt', 'skill', 'template', 'topology'].includes(item.type)) {
            throw new Error('Invalid marketplace item type');
        }
        if (!item.title || typeof item.title !== 'string' || item.title.length < 1) {
            throw new Error('Item title is required');
        }
        if (!item.description || typeof item.description !== 'string') {
            throw new Error('Item description is required');
        }
        const newItem: MarketplaceItem = {
            ...item,
            id: `mkt-${crypto.randomUUID()}`,
            rating: 0,
            downloads: 0,
        };
        this.items.push(newItem);
        return newItem;
    }

    install(itemId: string): MarketplaceItem | null {
        const item = this.items.find((i) => i.id === itemId);
        if (item) {
            item.downloads++;
            return item;
        }
        return null;
    }
}
