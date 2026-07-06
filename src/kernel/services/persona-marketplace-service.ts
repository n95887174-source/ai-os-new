import type {
    IPersonaMarketplaceService,
    PersonaListing,
    PersonaCategory,
} from '../contracts/persona-marketplace';

const MOCK_PERSONAS: PersonaListing[] = [
    {
        id: 'pm-1',
        name: 'Elara Strategist',
        description: 'Strategic planning expert with military simulation background',
        category: 'professional',
        author: 'Core',
        version: '1.0',
        rating: 4.8,
        downloads: 1240,
        price: 0,
        tags: ['strategy', 'planning', 'analysis'],
        promptPreview: 'You are Elara, a seasoned strategist...',
        installed: false,
        createdAt: Date.now() - 86400000 * 30,
    },
    {
        id: 'pm-2',
        name: 'Dr. Nova Quantum',
        description: 'Quantum physicist specialized in multi-agent systems',
        category: 'academic',
        author: 'Research Labs',
        version: '2.1',
        rating: 4.6,
        downloads: 890,
        price: 0,
        tags: ['science', 'research', 'quantum'],
        promptPreview: 'You are Dr. Nova, a quantum physicist...',
        installed: false,
        createdAt: Date.now() - 86400000 * 25,
    },
    {
        id: 'pm-3',
        name: 'Pixel Artist Bot',
        description: 'Creative AI for visual design and art direction',
        category: 'creative',
        author: 'Artisan AI',
        version: '1.3',
        rating: 4.9,
        downloads: 2100,
        price: 0,
        tags: ['art', 'design', 'creative'],
        promptPreview: 'You are a digital artist...',
        installed: false,
        createdAt: Date.now() - 86400000 * 20,
    },
    {
        id: 'pm-4',
        name: 'Code Sage',
        description: 'Senior software architect with 20+ years experience',
        category: 'technical',
        author: 'DevTools Inc',
        version: '3.0',
        rating: 4.7,
        downloads: 3400,
        price: 0,
        tags: ['coding', 'architecture', 'review'],
        promptPreview: 'You are Code Sage, a software architect...',
        installed: false,
        createdAt: Date.now() - 86400000 * 15,
    },
    {
        id: 'pm-5',
        name: 'Mythos Weaver',
        description: 'Fantasy world-building and narrative design specialist',
        category: 'entertainment',
        author: 'StoryForge',
        version: '1.0',
        rating: 4.5,
        downloads: 670,
        price: 0,
        tags: ['fantasy', 'writing', 'world-building'],
        promptPreview: 'You are a master storyteller...',
        installed: false,
        createdAt: Date.now() - 86400000 * 10,
    },
    {
        id: 'pm-6',
        name: 'Data Oracle',
        description: 'Data science and statistical analysis expert',
        category: 'professional',
        author: 'Core',
        version: '2.0',
        rating: 4.4,
        downloads: 1560,
        price: 0,
        tags: ['data', 'analytics', 'statistics'],
        promptPreview: 'You are Data Oracle...',
        installed: false,
        createdAt: Date.now() - 86400000 * 7,
    },
    {
        id: 'pm-7',
        name: 'Philosopher AI',
        description: 'Ethical reasoning and philosophical debate specialist',
        category: 'academic',
        author: 'Socratic Labs',
        version: '1.2',
        rating: 4.3,
        downloads: 430,
        price: 0,
        tags: ['philosophy', 'ethics', 'debate'],
        promptPreview: 'You are a philosopher...',
        installed: false,
        createdAt: Date.now() - 86400000 * 5,
    },
    {
        id: 'pm-8',
        name: 'DevOps Guardian',
        description: 'Infrastructure and deployment automation expert',
        category: 'technical',
        author: 'Ops Team',
        version: '1.5',
        rating: 4.6,
        downloads: 2800,
        price: 0,
        tags: ['devops', 'infrastructure', 'deploy'],
        promptPreview: 'You are a DevOps engineer...',
        installed: false,
        createdAt: Date.now() - 86400000 * 3,
    },
    {
        id: 'pm-9',
        name: 'Empathy Engine',
        description: 'Emotional intelligence and interpersonal dynamics',
        category: 'custom',
        author: 'Community',
        version: '1.0',
        rating: 4.2,
        downloads: 310,
        price: 0,
        tags: ['empathy', 'psychology', 'communication'],
        promptPreview: 'You are an empathy-focused AI...',
        installed: false,
        createdAt: Date.now() - 86400000,
    },
    {
        id: 'pm-10',
        name: 'Legal Mind',
        description: 'Legal analysis and contract review specialist',
        category: 'professional',
        author: 'LexAI',
        version: '2.0',
        rating: 4.1,
        downloads: 980,
        price: 0,
        tags: ['legal', 'contracts', 'compliance'],
        promptPreview: 'You are a legal expert...',
        installed: false,
        createdAt: Date.now(),
    },
];

/**
 * @deprecated MOCK — simulated backend. Replace with real implementation before production use.
 */
export class PersonaMarketplaceService implements IPersonaMarketplaceService {
    private listings: PersonaListing[] = MOCK_PERSONAS.map((p) => ({ ...p }));

    getListings(category?: PersonaCategory): PersonaListing[] {
        let result = this.listings;
        if (category) result = result.filter((l) => l.category === category);
        return result.map((l) => ({ ...l }));
    }

    search(query: string): PersonaListing[] {
        const q = query.toLowerCase();
        return this.listings
            .filter(
                (l) =>
                    l.name.toLowerCase().includes(q) ||
                    l.description.toLowerCase().includes(q) ||
                    l.tags.some((t) => t.includes(q)),
            )
            .map((l) => ({ ...l }));
    }

    install(id: string): void {
        const p = this.listings.find((l) => l.id === id);
        if (p) p.installed = true;
    }

    uninstall(id: string): void {
        const p = this.listings.find((l) => l.id === id);
        if (p) p.installed = false;
    }

    rate(id: string, rating: number): void {
        const p = this.listings.find((l) => l.id === id);
        if (p) p.rating = (p.rating * p.downloads + rating) / (p.downloads + 1);
    }

    getInstalled(): PersonaListing[] {
        return this.listings.filter((l) => l.installed).map((l) => ({ ...l }));
    }
}
