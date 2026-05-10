import { eventBus } from '../core/events';
import { dexieDb } from '../core/DatabaseService';
import type { CognitiveSkill } from '../types/domain';

export type { CognitiveSkill };

const STORAGE_KEY = 'super_agents_skills';

const DEFAULT_SKILLS: CognitiveSkill[] = [
  { id: 'sk-1', name: 'Deep Web Researcher', description: 'Performs multi-step parallel searches, extracts semantic content, and synthesizes comprehensive research briefs.', category: 'analysis', status: 'active', toolsUsed: ['Google Search API', 'Web Scraper', 'Summarizer'], version: '2.1.0', executionCount: 47 },
  { id: 'sk-2', name: 'Code Reviewer Pro', description: 'Analyzes PRs or local codebases for security vulnerabilities, style violations, and algorithmic inefficiencies.', category: 'analysis', status: 'installed', toolsUsed: ['Git CLI', 'AST Parser', 'Linter'], version: '1.4.2', executionCount: 23 },
  { id: 'sk-3', name: 'Social Media Manager', description: 'Monitors trends, generates contextual content schedules, and orchestrates multi-platform posting.', category: 'generation', status: 'not_installed', toolsUsed: ['Twitter API', 'LinkedIn API', 'Image Gen'], version: '3.0.1', executionCount: 0 },
  { id: 'sk-4', name: 'Data Visualization Agent', description: 'Ingests raw CSV/JSON data and autonomously generates python matplotlib/seaborn code to render charts.', category: 'generation', status: 'active', toolsUsed: ['Python Sandbox', 'Pandas'], version: '1.0.5', executionCount: 12 },
  { id: 'sk-5', name: 'Swarm Orchestrator', description: 'Advanced skill to dynamically spawn sub-agents, distribute tasks, and aggregate results for complex goals.', category: 'orchestration', status: 'installed', toolsUsed: ['Docker CLI', 'Agent Router'], version: '0.9.0-beta', executionCount: 8 },
];

class SkillService {
  private skills: CognitiveSkill[] = [];

  constructor() {
    this.load();
  }

  private async load() {
    try {
      const count = await dexieDb.skills.count();
      if (count > 0) {
        this.skills = await dexieDb.skills.toArray();
      } else {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          try {
            this.skills = JSON.parse(stored);
            await dexieDb.skills.bulkAdd(this.skills);
            localStorage.removeItem(STORAGE_KEY);
          } catch {
            this.skills = DEFAULT_SKILLS;
            await dexieDb.skills.bulkAdd(this.skills);
          }
        } else {
          this.skills = DEFAULT_SKILLS;
          await dexieDb.skills.bulkAdd(this.skills);
        }
      }
    } catch (e) {
      console.error('[SkillService] Failed to load skills', e);
      this.skills = DEFAULT_SKILLS;
    }
  }

  private async persist() {
    try {
      await dexieDb.skills.bulkPut(this.skills);
    } catch (e) {
      console.error('[SkillService] Failed to persist skills', e);
    }
  }

  private emit() {
    eventBus.emit('skills:updated', this.skills);
  }

  getSkills(): CognitiveSkill[] {
    return this.skills;
  }

  getInstalled(): CognitiveSkill[] {
    return this.skills.filter(s => s.status !== 'not_installed');
  }

  getAvailable(): CognitiveSkill[] {
    return this.skills.filter(s => s.status === 'not_installed');
  }

  toggleActive(id: string) {
    this.skills = this.skills.map(s => {
      if (s.id === id && s.status !== 'not_installed') {
        return { ...s, status: s.status === 'active' ? 'installed' : 'active' as const };
      }
      return s;
    });
    this.persist().catch(console.error);
    this.emit();
  }

  installSkill(id: string) {
    this.skills = this.skills.map(s =>
      s.id === id ? { ...s, status: 'installed' as const } : s
    );
    this.persist().catch(console.error);
    this.emit();
  }

  incrementExecution(id: string) {
    this.skills = this.skills.map(s =>
      s.id === id ? { ...s, executionCount: s.executionCount + 1 } : s
    );
    this.persist().catch(console.error);
  }
}

export const skillService = new SkillService();
