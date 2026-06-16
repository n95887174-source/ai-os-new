/**
 * Inline Citations Service
 * Tracks and displays source attributions for RAG and tool results
 */

import { genId } from '../../utils/gen-id';
import { rootLogger } from './logger-service';
import { EventBus } from '../event-bus';
import { EVENTS } from '../events/event-names';
import { StorageAdapter } from './storage-adapter';

const LOGGER = rootLogger.child('CitationsService');

export interface Citation {
  id: string;
  source: string;
  sourceType: 'memory' | 'web' | 'tool' | 'document' | 'knowledge';
  content: string;
  score: number; // 0-1 relevance score
  url?: string;
  metadata?: Record<string, string>;
  createdAt: number;
}

export interface MessageCitation {
  messageId: string;
  citations: Citation[];
  format: 'inline' | 'footnote' | 'sidebar';
}

export interface CitationDisplay {
  index: number;
  citation: Citation;
  highlightedText?: string;
}

class InlineCitationsService {
  private storage: StorageAdapter;
  private citations: Map<string, Citation> = new Map();
  private messageCitations: Map<string, MessageCitation> = new Map();
  private nextIndex: Map<string, number> = new Map();

  constructor() {
    this.storage = StorageAdapter.UI;
  }

  async init(): Promise<void> {
    const saved = await this.storage.get<{
      citations: [string, Citation][];
      messageCitations: [string, MessageCitation][];
    }>('data');

    if (saved) {
      for (const [id, citation] of saved.citations || []) {
        this.citations.set(id, citation);
      }
      for (const [msgId, msgCitation] of saved.messageCitations || []) {
        this.messageCitations.set(msgId, msgCitation);
      }
    }

    LOGGER.info('CitationsService', `Initialized with ${this.citations.size} citations`);
  }

  /**
   * Add citations to a message
   */
  addCitations(
    messageId: string,
    newCitations: Array<Omit<Citation, 'id' | 'createdAt'>>,
    format: 'inline' | 'footnote' | 'sidebar' = 'inline'
  ): MessageCitation {
    // Get next index for this message
    const idx = this.nextIndex.get(messageId) || 1;

    const citations: Citation[] = newCitations.map((c, _i) => {
      const id = genId('citation');
      const citation: Citation = {
        ...c,
        id,
        createdAt: Date.now(),
      };
      this.citations.set(id, citation);
      return citation;
    });

    const messageCitation: MessageCitation = {
      messageId,
      citations,
      format,
    };

    this.messageCitations.set(messageId, messageCitation);
    this.nextIndex.set(messageId, idx + citations.length);
    this.save();

    EventBus.emit(EVENTS.CITATIONS_ADDED, { messageId, count: citations.length });
    LOGGER.info('CitationsService', 'Citations added', { messageId, count: citations.length });

    return messageCitation;
  }

  /**
   * Get citations for a message
   */
  getCitations(messageId: string): MessageCitation | undefined {
    return this.messageCitations.get(messageId);
  }

  /**
   * Get display format for rendering
   */
  getDisplay(messageId: string): CitationDisplay[] {
    const msgCitation = this.messageCitations.get(messageId);
    if (!msgCitation) return [];

    return msgCitation.citations.map((citation, idx) => ({
      index: idx + 1,
      citation,
      highlightedText: citation.content.slice(0, 100) + (citation.content.length > 100 ? '...' : ''),
    }));
  }

  /**
   * Render citations as superscript numbers
   */
  renderInlineCitations(text: string, messageId: string): string {
    const display = this.getDisplay(messageId);
    if (display.length === 0) return text;

    // Build citation map
    const citationMap = new Map<string, string>();
    display.forEach(d => {
      citationMap.set(d.highlightedText || d.citation.content.slice(0, 50), `[${d.index}]`);
    });

    // Replace matching text with cited version
    let result = text;
    for (const [content, marker] of citationMap.entries()) {
      const regex = new RegExp(content.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      result = result.replace(regex, match => `${match}${marker}`);
    }

    return result;
  }

  /**
   * Generate footnotes section
   */
  generateFootnotes(messageId: string): string {
    const display = this.getDisplay(messageId);
    if (display.length === 0) return '';

    return display.map(d => 
      `[${d.index}] ${d.citation.source} — ${d.citation.content.slice(0, 150)}${d.citation.content.length > 150 ? '...' : ''}`
    ).join('\n');
  }

  /**
   * Get sidebar content
   */
  getSidebarContent(messageId: string): {
    title: string;
    items: Array<{ index: number; source: string; content: string; score: number; url?: string }>;
  } {
    const display = this.getDisplay(messageId);
    if (display.length === 0) {
      return { title: 'Sources', items: [] };
    }

    return {
      title: `Sources (${display.length})`,
      items: display.map(d => ({
        index: d.index,
        source: d.citation.source,
        content: d.citation.content.slice(0, 200) + (d.citation.content.length > 200 ? '...' : ''),
        score: d.citation.score,
        url: d.citation.url,
      })),
    };
  }

  /**
   * Search citations
   */
  searchCitations(query: string): Citation[] {
    const lower = query.toLowerCase();
    return Array.from(this.citations.values())
      .filter(c => 
        c.content.toLowerCase().includes(lower) ||
        c.source.toLowerCase().includes(lower)
      )
      .sort((a, b) => b.score - a.score);
  }

  /**
   * Get citations by source type
   */
  getBySourceType(type: Citation['sourceType']): Citation[] {
    return Array.from(this.citations.values()).filter(c => c.sourceType === type);
  }

  /**
   * Get all citations for a session
   */
  getSessionCitations(_sessionId: string): Citation[] {
    // This would require session-to-message mapping
    return Array.from(this.citations.values()).sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * Export citations as formatted text
   */
  exportCitations(messageId: string): string {
    const msgCitation = this.messageCitations.get(messageId);
    if (!msgCitation) return '';

    return msgCitation.citations.map((c, i) => 
      `[${i + 1}] ${c.source} (${Math.round(c.score * 100)}%): ${c.content}`
    ).join('\n\n');
  }

  /**
   * Get citation stats
   */
  getStats(): {
    total: number;
    byType: Record<Citation['sourceType'], number>;
    avgScore: number;
    topSources: string[];
  } {
    const all = Array.from(this.citations.values());
    const byType: Record<Citation['sourceType'], number> = {
      memory: 0,
      web: 0,
      tool: 0,
      document: 0,
      knowledge: 0,
    };

    for (const c of all) {
      byType[c.sourceType]++;
    }

    const topSources = Array.from(new Set(all.map(c => c.source)))
      .map(source => ({ source, count: all.filter(c => c.source === source).length }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map(s => s.source);

    return {
      total: all.length,
      byType,
      avgScore: all.length > 0 ? all.reduce((sum, c) => sum + c.score, 0) / all.length : 0,
      topSources,
    };
  }

  private async save(): Promise<void> {
    await this.storage.set('data', {
      citations: Array.from(this.citations.entries()),
      messageCitations: Array.from(this.messageCitations.entries()),
    });
  }
}

// Singleton
export const inlineCitationsService = new InlineCitationsService();

// Add missing event
if (!EVENTS.CITATIONS_ADDED) {
  (EVENTS as unknown as Record<string, string>).CITATIONS_ADDED = 'citations:added';
}