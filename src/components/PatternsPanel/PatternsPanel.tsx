import React, { useState } from 'react';
import { 
  Book, 
  Lightbulb, 
  Search, 
  Zap, 
  Shield, 
  ExternalLink,
  GitBranch,
  Save,
  Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { t } from '../../i18n/translations';
import { eventBus, EVENTS } from '../../kernel/events/event-bus';
import ModuleInfo from '../ModuleInfo/ModuleInfo';

interface PatternNote {
  id: string;
  title: string;
  category: 'architecture' | 'insight' | 'best-practice' | 'routing' | 'experimental';
  provider?: 'google' | 'groq' | 'nvidia' | 'openrouter' | 'all';
  content: string;
  tags: string[];
  links: string[];
  timestamp: number;
}

const INITIAL_NOTES: PatternNote[] = [
  {
    id: 'p1',
    title: 'Google Gemini 2.0 Flash: Streaming Optimization',
    category: 'best-practice',
    provider: 'google',
    content: 'When using Gemini 2.0 Flash, ensure that safety settings are balanced. High latency spikes often occur when safety filters are overly aggressive at the block level. Better to handle at the PolicyService level after streaming starts.',
    tags: ['streaming', 'latency', 'safety'],
    links: ['https://ai.google.dev/docs'],
    timestamp: Date.now()
  },
  {
    id: 'p2',
    title: 'Groq: Low Latency Routing Pattern',
    category: 'routing',
    provider: 'groq',
    content: 'For simple classification tasks (under 200 tokens), Groq Llama-3-8b is 5x more efficient than Gemini. The router should prefer Groq specifically for prompt classification and initial intent detection.',
    tags: ['performance', 'routing', 'efficiency'],
    links: [],
    timestamp: Date.now()
  }
];

const PatternsPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'all' | 'google' | 'groq' | 'nvidia' | 'openrouter'>('all');
  const [notes] = useState<PatternNote[]>(INITIAL_NOTES);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNote, setSelectedNote] = useState<PatternNote | null>(null);

  const filteredNotes = notes.filter(n => {
    const matchesTab = activeTab === 'all' || n.provider === activeTab;
    const matchesSearch = n.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         n.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         n.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesTab && matchesSearch;
  });

  const providerColors: Record<string, string> = {
    google: '#8b5cf6',
    groq: '#10b981',
    nvidia: '#f59e0b',
    openrouter: '#3b82f6',
    all: '#94a3b8'
  };

  return (
    <div className="patterns-container" style={{ padding: '2rem', maxWidth: 1400, margin: '0 auto', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f8fafc', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Book size={28} color="var(--accent-primary)" /> {t('patterns.title')}
          </h1>
          <p style={{ fontSize: '0.9rem', color: '#64748b' }}>{t('patterns.subtitle')}</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <div className="search-box" style={{ position: 'relative' }}>
            <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} size={18} />
            <input 
              type="text" 
              placeholder={t('patterns.search_placeholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ padding: '0.6rem 1rem 0.6rem 2.5rem', borderRadius: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#f8fafc', width: 300 }}
            />
          </div>
          <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.2rem', borderRadius: 12, background: 'var(--accent-primary)', color: 'white', border: 'none', fontWeight: 600, cursor: 'pointer', opacity: 0.5 }}
            onClick={() => eventBus.emit(EVENTS.NOTIFICATION, { message: t('patterns.coming_soon'), type: 'info' })}
          >
            <Plus size={18} /> {t('patterns.create')}
          </button>
        </div>
      </header>

      <nav style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '1rem' }}>
        {['all', 'google', 'groq', 'nvidia', 'openrouter'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as 'all' | 'google' | 'groq' | 'nvidia' | 'openrouter')}
            style={{
              padding: '0.5rem 1.2rem',
              borderRadius: 10,
              background: activeTab === tab ? 'rgba(255,255,255,0.1)' : 'transparent',
              color: activeTab === tab ? '#f8fafc' : '#64748b',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 600,
              textTransform: 'capitalize',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: providerColors[tab] }} />
            {tab}
          </button>
        ))}
      </nav>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '2rem', flex: 1, minHeight: 0 }}>
        <div style={{ overflowY: 'auto', paddingRight: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '1.5rem' }}>
            <AnimatePresence>
              {filteredNotes.map(note => (
                <motion.div
                  key={note.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  onClick={() => setSelectedNote(note)}
                  className="glass-panel"
                  style={{
                    padding: '1.5rem',
                    borderRadius: 20,
                    border: '1px solid rgba(255,255,255,0.05)',
                    background: 'rgba(255,255,255,0.02)',
                    cursor: 'pointer',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                >
                  <div style={{ position: 'absolute', top: 0, left: 0, width: 4, height: '100%', background: providerColors[note.provider || 'all'] }} />
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: providerColors[note.provider || 'all'], fontWeight: 800, letterSpacing: '0.05em' }}>
                      {note.category.replace('-', ' ')}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: '#475569' }}>
                      {new Date(note.timestamp).toLocaleDateString()}
                    </span>
                  </div>

                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc', marginBottom: '1rem' }}>{note.title}</h3>
                  <p style={{ fontSize: '0.9rem', color: '#94a3b8', lineHeight: 1.6, marginBottom: '1.5rem', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {note.content}
                  </p>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {note.tags.map(tag => (
                      <span key={tag} style={{ fontSize: '0.7rem', padding: '0.2rem 0.6rem', borderRadius: 6, background: 'rgba(255,255,255,0.05)', color: '#64748b' }}>
                        #{tag}
                      </span>
                    ))}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        <aside style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 20, border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(139,92,246,0.03)' }}>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f8fafc', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Lightbulb size={18} color="#f59e0b" /> {t('patterns.insight_feed')} <span style={{ fontSize: '0.6rem', color: '#64748b', fontWeight: 400 }}>(example)</span>
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {[
                { icon: <Zap size={14} />, text: 'NVIDIA API: Latency in EU-West is 20% lower today.', time: '2m ago' },
                { icon: <Shield size={14} />, text: 'Safety Violation: Gemini blocked a prompt on Politics.', time: '15m ago' },
                { icon: <GitBranch size={14} />, text: 'Router: Switched 50 requests to Groq due to TPS spikes.', time: '1h ago' }
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: '0.75rem', fontSize: '0.8rem' }}>
                  <div style={{ color: '#64748b', marginTop: '2px' }}>{item.icon}</div>
                  <div>
                    <div style={{ color: '#e2e8f0' }}>{item.text}</div>
                    <div style={{ color: '#475569', fontSize: '0.7rem' }}>{item.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 20, border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)', flex: 1 }}>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f8fafc', marginBottom: '1rem' }}>{t('patterns.backlog')} <span style={{ fontSize: '0.6rem', color: '#64748b', fontWeight: 400 }}>(example)</span></h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {[
                'Implement RAG Cache partitioning',
                'Optimize WebScraper for IPv6',
                'Add token budget visualizer',
                'Self-healing fallback implementation'
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.8rem', color: '#94a3b8' }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#3b82f6' }} />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>

      <AnimatePresence>
        {selectedNote && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedNote(null)}
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={e => e.stopPropagation()}
              className="glass-panel"
              style={{ width: '100%', maxWidth: 800, maxHeight: '80vh', overflowY: 'auto', padding: '2.5rem', borderRadius: 24, border: '1px solid rgba(255,255,255,0.1)', background: '#0f172a' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
                <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: providerColors[selectedNote.provider || 'all'], fontWeight: 800, letterSpacing: '0.1em' }}>
                  {selectedNote.provider || t('patterns.detail.generic')} / {selectedNote.category}
                </span>
                <button onClick={() => setSelectedNote(null)} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer' }}>
                  {t('patterns.detail.close')}
                </button>
              </div>

              <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f8fafc', marginBottom: '1.5rem' }}>{selectedNote.title}</h2>
              
              <div style={{ fontSize: '1rem', color: '#e2e8f0', lineHeight: 1.8, marginBottom: '2rem', whiteSpace: 'pre-wrap' }}>
                {selectedNote.content}
              </div>

              {selectedNote.links.length > 0 && (
                <div style={{ marginBottom: '2rem' }}>
                  <h4 style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '0.75rem' }}>{t('patterns.detail.resources')}</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {selectedNote.links.map(link => (
                      <a key={link} href={link} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-primary)', fontSize: '0.9rem', textDecoration: 'none' }}>
                        <ExternalLink size={14} /> {link}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '2rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {selectedNote.tags.map(tag => (
                    <span key={tag} style={{ fontSize: '0.8rem', padding: '0.3rem 0.8rem', borderRadius: 8, background: 'rgba(255,255,255,0.05)', color: '#64748b' }}>
                      #{tag}
                    </span>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button className="btn-secondary" style={{ padding: '0.6rem 1.2rem', borderRadius: 12, background: 'rgba(255,255,255,0.05)', color: '#f8fafc', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', opacity: 0.5 }}
                    onClick={() => eventBus.emit(EVENTS.NOTIFICATION, { message: t('patterns.coming_soon'), type: 'info' })}>
                    {t('patterns.detail.edit')}
                  </button>
                  <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.5rem', borderRadius: 12, background: 'var(--accent-primary)', color: 'white', border: 'none', fontWeight: 600, cursor: 'pointer', opacity: 0.5 }}
                    onClick={() => eventBus.emit(EVENTS.NOTIFICATION, { message: t('patterns.coming_soon'), type: 'info' })}>
                    <Save size={18} /> {t('patterns.detail.save')}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <ModuleInfo moduleKey="patterns" />
    </div>
  );
};

export default PatternsPanel;
