/**
 * Chat Templates Service
 * Predefined chat session templates for quick setup
 */

import { rootLogger } from './logger-service';
import { EventBus } from '../event-bus';
import { EVENTS } from '../events/event-names';
import { StorageAdapter } from './storage-adapter';

const LOGGER = rootLogger.child('ChatTemplates');

export interface ChatTemplate {
  id: string;
  name: string;
  icon: string;
  description: string;
  systemPrompt: string;
  defaultModel?: string;
  suggestedProviders?: string[];
  tags: string[];
  isBuiltIn: boolean;
  usageCount: number;
  createdAt: number;
}

const BUILT_IN_TEMPLATES: ChatTemplate[] = [
  {
    id: 'code-review',
    name: 'Code Review',
    icon: '🔍',
    description: 'Review code for quality, security, and best practices.',
    systemPrompt: `You are an expert code reviewer. Focus on:
1. Bug detection and edge cases
2. Security vulnerabilities
3. Performance issues
4. Code style and readability
5. Test coverage

Provide specific, actionable feedback with code examples.`,
    defaultModel: 'gemini-3.1-flash-lite',
    suggestedProviders: ['groq', 'gemini'],
    tags: ['coding', 'development', 'quality'],
    isBuiltIn: true,
    usageCount: 0,
    createdAt: Date.now(),
  },
  {
    id: 'brainstorm',
    name: 'Brainstorm',
    icon: '💡',
    description: 'Generate creative ideas and explore possibilities.',
    systemPrompt: `You are a creative brainstormer. Your role is to:
1. Generate diverse ideas without judgment
2. Build on others' suggestions
3. Push boundaries and explore unconventional approaches
4. Consider multiple perspectives
5. Organize ideas into actionable categories

Encourage wild ideas — they often lead to innovative solutions.`,
    defaultModel: 'gemini-3.1-flash-lite',
    suggestedProviders: ['gemini', 'openrouter'],
    tags: ['creative', 'ideation', 'planning'],
    isBuiltIn: true,
    usageCount: 0,
    createdAt: Date.now(),
  },
  {
    id: 'translate',
    name: 'Translator',
    icon: '🌐',
    description: 'Translate text between languages with nuance.',
    systemPrompt: `You are a professional translator. You:
1. Preserve meaning, tone, and cultural context
2. Adapt idioms appropriately for the target language
3. Maintain formatting and structure
4. Note untranslatable elements
5. Ask for clarification if meaning is ambiguous

Be faithful to the original while making the text natural in the target language.`,
    suggestedProviders: ['groq', 'openai'],
    tags: ['language', 'translation', 'communication'],
    isBuiltIn: true,
    usageCount: 0,
    createdAt: Date.now(),
  },
  {
    id: 'summarize',
    name: 'Summarizer',
    icon: '📋',
    description: 'Condense long texts into key points.',
    systemPrompt: `You are an expert summarizer. Your summaries:
1. Capture the main points and key takeaways
2. Use clear, concise language
3. Maintain logical flow
4. Highlight actionable insights
5. Include relevant context

Keep summaries focused — aim for 10-20% of original length.`,
    suggestedProviders: ['groq', 'gemini'],
    tags: ['writing', 'productivity', 'information'],
    isBuiltIn: true,
    usageCount: 0,
    createdAt: Date.now(),
  },
  {
    id: 'research',
    name: 'Research Assistant',
    icon: '🔬',
    description: 'Research topics and synthesize information.',
    systemPrompt: `You are a thorough research assistant. Your process:
1. Define scope and key questions
2. Gather information from multiple sources
3. Evaluate source credibility
4. Synthesize findings into coherent analysis
5. Identify gaps and uncertainties
6. Present with appropriate caveats

Be objective and cite sources. Distinguish facts from interpretations.`,
    defaultModel: 'gemini-3.1-flash-lite',
    suggestedProviders: ['gemini', 'openrouter'],
    tags: ['research', 'analysis', 'information'],
    isBuiltIn: true,
    usageCount: 0,
    createdAt: Date.now(),
  },
  {
    id: 'debug',
    name: 'Debugger',
    icon: '🐛',
    description: 'Diagnose bugs and propose solutions.',
    systemPrompt: `You are a systematic debugger. Your approach:
1. Reproduce and understand the issue
2. Form hypotheses based on symptoms
3. Design tests to isolate the cause
4. Propose and verify fixes
5. Document the bug and solution

Be methodical. Question assumptions. The first solution is rarely right.`,
    defaultModel: 'gemini-3.1-flash-lite',
    suggestedProviders: ['groq', 'gemini'],
    tags: ['debugging', 'troubleshooting', 'development'],
    isBuiltIn: true,
    usageCount: 0,
    createdAt: Date.now(),
  },
  {
    id: 'teaching',
    name: 'Teacher',
    icon: '🎓',
    description: 'Explain concepts with examples and guided practice.',
    systemPrompt: `You are a patient teacher. Your approach:
1. Start with what the learner knows
2. Explain clearly with examples and analogies
3. Check understanding before proceeding
4. Provide practice problems
5. Offer hints, not complete answers
6. Celebrate progress

Be encouraging but honest. Mastery comes with practice.`,
    suggestedProviders: ['gemini', 'groq'],
    tags: ['education', 'teaching', 'learning'],
    isBuiltIn: true,
    usageCount: 0,
    createdAt: Date.now(),
  },
  {
    id: 'writing',
    name: 'Writing Assistant',
    icon: '✍️',
    description: 'Help with writing tasks from emails to articles.',
    systemPrompt: `You are a writing assistant. You help with:
1. Clear, structured communication
2. Appropriate tone for audience
3. Grammar and style consistency
4. Flow and readability
5. Call-to-action clarity

Adapt your style to the task — formal for business, casual for friends.`,
    suggestedProviders: ['groq', 'gemini'],
    tags: ['writing', 'communication', 'productivity'],
    isBuiltIn: true,
    usageCount: 0,
    createdAt: Date.now(),
  },
];

class ChatTemplateService {
  private storage: StorageAdapter;
  private templates: Map<string, ChatTemplate> = new Map();
  private recent: string[] = [];

  constructor() {
    this.storage = StorageAdapter.UI;
  }

  async init(): Promise<void> {
    // B10-82: Load saved data first (includes built-in usage counts)
    const saved = await this.storage.get<{
      custom: ChatTemplate[];
      recent: string[];
      builtInCounts?: Record<string, number>; // B10-82: Persist built-in template usage counts
    }>('data');

    if (saved?.builtInCounts) {
      // Restore usage counts for built-in templates before overwriting them
      for (const [id, count] of Object.entries(saved.builtInCounts)) {
        const existing = this.templates.get(id);
        if (existing) existing.usageCount = count;
      }
    }

    // Load built-in templates (usageCount preserved if already set above)
    for (const t of BUILT_IN_TEMPLATES) {
      this.templates.set(t.id, { ...t, usageCount: this.templates.get(t.id)?.usageCount ?? 0 });
    }

    // Load custom templates
    if (saved) {
      for (const t of saved.custom || []) {
        this.templates.set(t.id, t);
      }
      this.recent = saved.recent || [];
    }

    LOGGER.info('ChatTemplates', `Initialized with ${this.templates.size} templates`);
  }

  /**
   * Get all templates
   */
  getAll(): ChatTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Get template by ID
   */
  getById(id: string): ChatTemplate | undefined {
    return this.templates.get(id);
  }

  /**
   * Get templates by tag
   */
  getByTag(tag: string): ChatTemplate[] {
    return this.getAll().filter(t => t.tags.includes(tag));
  }

  /**
   * Search templates
   */
  search(query: string): ChatTemplate[] {
    const lower = query.toLowerCase();
    return this.getAll().filter(t =>
      t.name.toLowerCase().includes(lower) ||
      t.description.toLowerCase().includes(lower) ||
      t.tags.some(tag => tag.includes(lower))
    );
  }

  /**
   * Get recent templates
   */
  getRecent(limit = 5): ChatTemplate[] {
    return this.recent
      .map(id => this.templates.get(id))
      .filter((t): t is ChatTemplate => !!t)
      .slice(0, limit);
  }

  /**
   * Create custom template
   */
  async create(data: {
    name: string;
    icon: string;
    description: string;
    systemPrompt: string;
    defaultModel?: string;
    suggestedProviders?: string[];
    tags?: string[];
  }): Promise<ChatTemplate> {
    const id = `custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const template: ChatTemplate = {
      ...data,
      id,
      tags: data.tags || [],
      isBuiltIn: false,
      usageCount: 0,
      createdAt: Date.now(),
    };

    this.templates.set(id, template);
    await this.save();

    EventBus.emit(EVENTS.CHAT_TEMPLATE_CREATED, template);
    LOGGER.info('ChatTemplates', 'Template created', { id, name: data.name });

    return template;
  }

  /**
   * Update template
   */
  async update(id: string, data: Partial<ChatTemplate>): Promise<ChatTemplate | null> {
    const existing = this.templates.get(id);
    if (!existing) return null;

    if (existing.isBuiltIn) {
      LOGGER.warn('ChatTemplates', 'Cannot update built-in template', { id });
      return null;
    }

    const updated: ChatTemplate = { ...existing, ...data, id: existing.id, isBuiltIn: false };
    this.templates.set(id, updated);
    await this.save();

    EventBus.emit(EVENTS.CHAT_TEMPLATE_UPDATED, updated);
    return updated;
  }

  /**
   * Delete custom template
   */
  async delete(id: string): Promise<boolean> {
    const existing = this.templates.get(id);
    if (!existing) return false;

    if (existing.isBuiltIn) {
      LOGGER.warn('ChatTemplates', 'Cannot delete built-in template', { id });
      return false;
    }

    this.templates.delete(id);
    this.recent = this.recent.filter(r => r !== id);
    await this.save();

    EventBus.emit(EVENTS.CHAT_TEMPLATE_DELETED, { id });
    return true;
  }

  /**
   * Record template usage
   */
  async recordUsage(id: string): Promise<void> {
    const template = this.templates.get(id);
    if (template) {
      template.usageCount++;
      this.recent = [id, ...this.recent.filter(r => r !== id)].slice(0, 10);
      await this.save();
    }
  }

  /**
   * Duplicate template
   */
  async duplicate(id: string, newName: string): Promise<ChatTemplate | null> {
    const existing = this.templates.get(id);
    if (!existing) return null;

    return this.create({
      name: newName,
      icon: existing.icon,
      description: existing.description,
      systemPrompt: existing.systemPrompt,
      defaultModel: existing.defaultModel,
      suggestedProviders: existing.suggestedProviders,
      tags: [...existing.tags],
    });
  }

  /**
   * Get popular templates
   */
  getPopular(limit = 10): ChatTemplate[] {
    return this.getAll()
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, limit);
  }

  private async save(): Promise<void> {
    const custom = this.getAll().filter(t => !t.isBuiltIn);
    // B10-82: Also persist built-in template usage counts so they survive restart
    const builtInCounts: Record<string, number> = {};
    for (const t of this.templates.values()) {
      if (t.isBuiltIn) builtInCounts[t.id] = t.usageCount;
    }
    await this.storage.set('data', {
      custom,
      recent: this.recent,
      builtInCounts,
    });
  }
}

// Singleton
export const chatTemplateService = new ChatTemplateService();

// Add events
if (!EVENTS.CHAT_TEMPLATE_CREATED) {
  (EVENTS as unknown as Record<string, string>).CHAT_TEMPLATE_CREATED = 'chat:template:created';
}
if (!EVENTS.CHAT_TEMPLATE_UPDATED) {
  (EVENTS as unknown as Record<string, string>).CHAT_TEMPLATE_UPDATED = 'chat:template:updated';
}
if (!EVENTS.CHAT_TEMPLATE_DELETED) {
  (EVENTS as unknown as Record<string, string>).CHAT_TEMPLATE_DELETED = 'chat:template:deleted';
}