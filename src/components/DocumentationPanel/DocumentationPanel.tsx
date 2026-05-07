import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BookOpen, HelpCircle, Shield, Cpu, MessageSquare, 
  ExternalLink, ChevronRight, Zap, Code, Terminal,
  Lock, Info
} from 'lucide-react';

type DocSection = 'getting-started' | 'architecture' | 'safety' | 'faq';

const DocumentationPanel: React.FC = () => {
  const [activeSection, setActiveSection] = useState<DocSection>('getting-started');

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.05 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
  };

  const NavItem = ({ id, icon, label }: { id: DocSection, icon: React.ReactNode, label: string }) => (
    <button
      onClick={() => setActiveSection(id)}
      style={{
        display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.8rem 1rem', width: '100%',
        background: activeSection === id ? 'rgba(59,130,246,0.1)' : 'transparent',
        color: activeSection === id ? '#3b82f6' : 'var(--text-muted)',
        border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: '0.9rem', fontWeight: activeSection === id ? 600 : 500,
        transition: 'all 0.2s', textAlign: 'left'
      }}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <div style={{ display: 'flex', gap: '3rem', height: '100%' }}>
      {/* Doc Navigation Sidebar */}
      <div style={{ width: 240, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <BookOpen size={28} color="#3b82f6" /> Help
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.4rem' }}>User Guide & System Docs.</p>
        </div>
        
        <NavItem id="getting-started" icon={<Zap size={18} />} label="Getting Started" />
        <NavItem id="architecture" icon={<Cpu size={18} />} label="System Architecture" />
        <NavItem id="safety" icon={<Shield size={18} />} label="Safety Contract" />
        <NavItem id="faq" icon={<HelpCircle size={18} />} label="F.A.Q." />

        <div style={{ marginTop: 'auto', padding: '1.5rem', background: 'rgba(59,130,246,0.05)', borderRadius: 16, border: '1px solid rgba(59,130,246,0.1)' }}>
          <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.85rem', fontWeight: 700 }}>Support</h4>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '1rem' }}>
            Need technical help? Join our community or check GitHub.
          </p>
          <a href="https://github.com/google-deepmind" target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#3b82f6', textDecoration: 'none', fontSize: '0.8rem', fontWeight: 700 }}>
            <ExternalLink size={14} /> Visit Repository
          </a>
        </div>
      </div>

      {/* Content Area */}
      <div style={{ flex: 1, maxWidth: 800 }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeSection}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}
          >
            {activeSection === 'getting-started' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <h1 style={{ fontSize: '2.2rem', fontWeight: 800, margin: 0 }}>Getting Started</h1>
                <p style={{ fontSize: '1.1rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                  Welcome to Super-Agents OS. This guide will help you connect your first AI provider and start using our intelligent routing features.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {[
                    { title: '1. Add your API Key', text: 'Go to AI Providers and click "Add Provider". We support OpenRouter, Gemini, Groq, and more.' },
                    { title: '2. Select a Chat Mode', text: 'Use "All at once" for comparing models, or "Auto" for the most efficient results.' },
                    { title: '3. Start Conversing', text: 'Your messages are processed in real-time. The system automatically tracks latency and reliability.' }
                  ].map((step, i) => (
                    <div key={i} style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.03)', borderRadius: 16, border: '1px solid var(--border)' }}>
                      <h4 style={{ margin: '0 0 0.5rem', fontSize: '1rem', fontWeight: 700, color: '#3b82f6' }}>{step.title}</h4>
                      <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>{step.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeSection === 'architecture' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <h1 style={{ fontSize: '2.2rem', fontWeight: 800, margin: 0 }}>System Architecture</h1>
                <p style={{ fontSize: '1.1rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                  Super-Agents OS is built on a deterministic, event-sourced core designed for maximum stability and speed.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                  <div style={{ padding: '1.5rem', background: 'rgba(0,0,0,0.2)', borderRadius: 16, border: '1px solid var(--border)' }}>
                    <div style={{ color: '#3b82f6', marginBottom: '1rem' }}><Cpu size={32} /></div>
                    <h4 style={{ margin: '0 0 0.5rem' }}>System Kernel</h4>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                      The single source of truth (SSOT). Every message, error, and score passes through the Kernel's reducer.
                    </p>
                  </div>
                  <div style={{ padding: '1.5rem', background: 'rgba(0,0,0,0.2)', borderRadius: 16, border: '1px solid var(--border)' }}>
                    <div style={{ color: '#a855f7', marginBottom: '1rem' }}><Terminal size={32} /></div>
                    <h4 style={{ margin: '0 0 0.5rem' }}>Bandit Router</h4>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                      Uses the UCB1 algorithm to intelligently route your prompts based on live performance data.
                    </p>
                  </div>
                </div>

                <div style={{ padding: '1.5rem', background: 'rgba(59,130,246,0.05)', borderRadius: 16, border: '1px solid rgba(59,130,246,0.1)' }}>
                  <h4 style={{ margin: '0 0 0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Code size={18} color="#3b82f6" /> Developer Notes
                  </h4>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                    The system communicates via an <strong>EventBus</strong>. This decoupling ensures that adding new providers or UI panels never breaks the core runtime logic.
                  </p>
                </div>
              </div>
            )}

            {activeSection === 'safety' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <h1 style={{ fontSize: '2.2rem', fontWeight: 800, margin: 0 }}>Safety Contract</h1>
                <p style={{ fontSize: '1.1rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                  Our system enforces strict invariants to ensure your data is safe and your results are predictable.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {[
                    { inv: 'INV-1', desc: 'Weights Normalization', detail: 'The sum of all routing priority weights must always equal 1.0.' },
                    { inv: 'INV-2', desc: 'Single Source of Truth', detail: 'The Kernel is the absolute authority for all system state.' },
                    { inv: 'INV-3', desc: 'Determinism', detail: 'Decisions are predictable and repeatable based on state and strategy.' },
                    { inv: 'INV-4', desc: 'Safety Drift Cap', detail: 'Adaptive weight adjustments are limited to +/- 15% to prevent runaway behavior.' }
                  ].map((rule, i) => (
                    <div key={i} style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start', padding: '1rem 0', borderBottom: '1px solid var(--border)' }}>
                      <div style={{ background: '#3b82f6', color: 'white', fontSize: '0.7rem', fontWeight: 900, padding: '0.3rem 0.6rem', borderRadius: 6, flexShrink: 0 }}>
                        {rule.inv}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.25rem' }}>{rule.desc}</div>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>{rule.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeSection === 'faq' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <h1 style={{ fontSize: '2.2rem', fontWeight: 800, margin: 0 }}>F.A.Q.</h1>
                
                {[
                  { q: 'Where are my API keys stored?', a: 'Your keys are stored exclusively in your browser\'s LocalStorage. They are never sent to our servers.' },
                  { q: 'Does this cost anything?', a: 'Super-Agents OS is a free, local-first tool. You only pay the LLM providers (like Google or OpenAI) directly via your API keys.' },
                  { q: 'Can I add custom providers?', a: 'Yes! Select the "Custom" provider in the setup wizard to connect to OpenAI-compatible proxies or local servers like LM Studio.' },
                  { q: 'What is "Smart Mode"?', a: 'It\'s an automated routing system that picks the fastest and most reliable provider available at the moment of your request.' }
                ].map((faq, i) => (
                  <div key={i} style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: 16, border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                      <HelpCircle size={18} color="#3b82f6" />
                      <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>{faq.q}</h4>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>{faq.a}</p>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default DocumentationPanel;
