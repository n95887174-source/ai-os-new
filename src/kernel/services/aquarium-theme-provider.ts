import type { IStorageAdapter } from '../contracts/storage-adapter';
import type { ILifecycle } from '../contracts/lifecycle';

export interface AquariumTheme {
  id: string;
  name: string;
  description: string;
  background: string;
  gradientFrom: string;
  gradientTo: string;
  entityColors: { fish: string; seaweed: string; bubble: string; food: string; jellyfish: string };
  ambientParticles: boolean;
  isBuiltin: boolean;
}

const STORAGE_KEY = 'superagents-aquarium-theme';

const BUILTIN_THEMES: AquariumTheme[] = [
  {
    id: 'ocean', name: 'Ocean', description: 'Classic underwater ecosystem',
    background: '#0a0a1a', gradientFrom: '#0a0a2e', gradientTo: '#050510',
    entityColors: { fish: '#3b82f6', seaweed: '#10b981', bubble: 'rgba(59,130,246,0.3)', food: '#f59e0b', jellyfish: '#a855f7' },
    ambientParticles: true, isBuiltin: true,
  },
  {
    id: 'space', name: 'Deep Space', description: 'Providers as spacecraft among stars',
    background: '#000010', gradientFrom: '#000020', gradientTo: '#000005',
    entityColors: { fish: '#f59e0b', seaweed: '#22c55e', bubble: 'rgba(245,158,11,0.3)', food: '#ef4444', jellyfish: '#06b6d4' },
    ambientParticles: true, isBuiltin: true,
  },
  {
    id: 'forest', name: 'Enchanted Forest', description: 'Birds and creatures in a magical forest',
    background: '#0a1a0a', gradientFrom: '#0a200a', gradientTo: '#051005',
    entityColors: { fish: '#22c55e', seaweed: '#166534', bubble: 'rgba(34,197,94,0.2)', food: '#f97316', jellyfish: '#a855f7' },
    ambientParticles: true, isBuiltin: true,
  },
  {
    id: 'cyberpunk', name: 'Cyberpunk', description: 'Neon-lit digital landscape',
    background: '#0a0010', gradientFrom: '#150020', gradientTo: '#050008',
    entityColors: { fish: '#f43f5e', seaweed: '#8b5cf6', bubble: 'rgba(244,63,94,0.3)', food: '#22d3ee', jellyfish: '#fbbf24' },
    ambientParticles: true, isBuiltin: true,
  },
];

export class AquariumThemeProvider implements ILifecycle {
  private themes: AquariumTheme[] = [...BUILTIN_THEMES];
  private activeThemeId: string = 'ocean';
  private storage?: IStorageAdapter;

  constructor(storage?: IStorageAdapter) {
    this.storage = storage;
  }

  async init(): Promise<void> {
    try {
      const stored = this.storage?.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as { activeThemeId: string };
        this.activeThemeId = parsed.activeThemeId || 'ocean';
      }
    } catch { /* ignore */ }
  }

  async start(): Promise<void> {}
  async destroy(): Promise<void> {}

  getAll(): AquariumTheme[] { return [...this.themes]; }
  getActive(): AquariumTheme { return this.themes.find(t => t.id === this.activeThemeId) ?? this.themes[0]; }

  setActive(id: string): boolean {
    const theme = this.themes.find(t => t.id === id);
    if (!theme) return false;
    this.activeThemeId = id;
    this.persist();
    return true;
  }

  private persist(): void {
    try { this.storage?.setItem(STORAGE_KEY, JSON.stringify({ activeThemeId: this.activeThemeId })); } catch { /* full */ }
  }
}
