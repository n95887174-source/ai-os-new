import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BookOpen, HelpCircle, Shield, Cpu,
  ExternalLink, Zap, Code, Terminal,
  ArrowRight, FileText, Blocks
} from 'lucide-react';

type DocSection = 'getting-started' | 'architecture' | 'safety' | 'faq';

const NavItem = ({ id, icon, label, activeSection, onSelect }: { id: DocSection; icon: React.ReactNode; label: string; activeSection: DocSection; onSelect: (id: DocSection) => void }) => (
  <button
    onClick={() => onSelect(id)}
    style={{
      display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.8rem 1rem', width: '100%',
      background: activeSection === id ? 'rgba(59,130,246,0.1)' : 'transparent',
      color: activeSection === id ? '#3b82f6' : 'var(--text-muted)',
      border: '1px solid',
      borderColor: activeSection === id ? 'rgba(59,130,246,0.2)' : 'transparent',
      borderRadius: 12, cursor: 'pointer', fontSize: '0.9rem', fontWeight: activeSection === id ? 700 : 600,
      transition: 'all 0.2s', textAlign: 'left'
    }}
  >
    {icon}
    {label}
  </button>
);

const DocumentationPanel: React.FC = () => {
  const [activeSection, setActiveSection] = useState<DocSection>('getting-started');

  return (
    <div style={{ display: 'flex', gap: '3rem', height: '100%', overflow: 'hidden' }}>
      {/* Doc Navigation Sidebar */}
      <div style={{ width: 260, display: 'flex', flexDirection: 'column', gap: '0.5rem', flexShrink: 0 }}>
        <div style={{ marginBottom: '1.5rem', paddingBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#f8fafc' }}>
            <BookOpen size={28} color="#3b82f6" /> OS Manual
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: '0.5rem', lineHeight: 1.5 }}>Official documentation, architecture references, and security guidelines.</p>
        </div>
        
        <NavItem id="getting-started" icon={<Zap size={18} />} label="Getting Started" activeSection={activeSection} onSelect={setActiveSection} />
        <NavItem id="architecture" icon={<Blocks size={18} />} label="System Architecture" activeSection={activeSection} onSelect={setActiveSection} />
        <NavItem id="safety" icon={<Shield size={18} />} label="Safety & Invariants" activeSection={activeSection} onSelect={setActiveSection} />
        <NavItem id="faq" icon={<HelpCircle size={18} />} label="F.A.Q. & Troubleshooting" activeSection={activeSection} onSelect={setActiveSection} />

        <div style={{ marginTop: 'auto', padding: '1.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)' }}>
          <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.85rem', fontWeight: 800, color: '#f8fafc' }}>Developer Support</h4>
          <p style={{ fontSize: '0.75rem', color: '#94a3b8', lineHeight: 1.6, marginBottom: '1rem' }}>
            Need technical help or want to contribute? Check our open source repository.
          </p>
          <a href="https://github.com/google-deepmind" target="_blank" rel="noopener noreferrer" className="btn-secondary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', textDecoration: 'none', fontSize: '0.8rem', padding: '0.6rem', borderRadius: 8 }}>
            <ExternalLink size={14} /> View Repository
          </a>
        </div>
      </div>

      {/* Content Area */}
      <div style={{ flex: 1, maxWidth: 850, overflowY: 'auto', paddingRight: '2rem', paddingBottom: '3rem' }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeSection}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
            style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}
          >
            {activeSection === 'getting-started' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <h1 style={{ fontSize: '2.5rem', fontWeight: 800, margin: 0, color: '#f8fafc', letterSpacing: '-0.02em' }}>Getting Started</h1>
                <p style={{ fontSize: '1.1rem', color: '#94a3b8', lineHeight: 1.6 }}>
                  Welcome to Super-Agents OS. This guide will help you configure the inference mesh, add your first API providers, and start orchestrating autonomous workflows.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '1rem' }}>
                  {[
                    { title: '1. Register Providers', text: 'Navigate to "Agent Mesh" and input your API keys. We securely support OpenRouter, Gemini, Groq, and direct OpenAI endpoints. Keys are stored locally using AES-256.', icon: <Shield size={20} color="#10b981" /> },
                    { title: '2. Configure Routing', text: 'In Settings, set your Default Chat Strategy. The "Smart Auto-Routing" (UCB1 algorithm) is recommended for production as it balances latency, cost, and provider reliability automatically.', icon: <Cpu size={20} color="#3b82f6" /> },
                    { title: '3. Execute Workflows', text: 'Launch a task in the Terminal or Chat. The OS kernel will allocate the request, parse the response, and log all events in the Telemetry dashboard in real-time.', icon: <Zap size={20} color="#a855f7" /> }
                  ].map((step, i) => (
                    <div key={i} className="glass-panel" style={{ padding: '1.5rem', borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: '1.25rem', alignItems: 'flex-start' }}>
                      <div style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.05)', borderRadius: 12 }}>
                        {step.icon}
                      </div>
                      <div>
                        <h4 style={{ margin: '0 0 0.5rem', fontSize: '1.05rem', fontWeight: 800, color: '#f8fafc' }}>{step.title}</h4>
                        <p style={{ margin: 0, fontSize: '0.9rem', color: '#94a3b8', lineHeight: 1.6 }}>{step.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeSection === 'architecture' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <h1 style={{ fontSize: '2.5rem', fontWeight: 800, margin: 0, color: '#f8fafc', letterSpacing: '-0.02em' }}>System Architecture</h1>
                <p style={{ fontSize: '1.1rem', color: '#94a3b8', lineHeight: 1.6 }}>
                  Super-Agents OS is built on a deterministic, event-sourced React/TypeScript core designed for maximum resilience, speed, and local security.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginTop: '1rem' }}>
                  <div className="glass-panel" style={{ padding: '2rem', borderRadius: 16, borderTop: '4px solid #3b82f6' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1.25rem' }}>
                      <div style={{ padding: '0.6rem', background: 'rgba(59,130,246,0.1)', borderRadius: 10 }}><Cpu size={24} color="#3b82f6" /></div>
                      <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#f8fafc' }}>System Kernel</h4>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.9rem', color: '#94a3b8', lineHeight: 1.6 }}>
                      The single source of truth (SSOT). Every message, UI action, error, and performance metric passes through the Kernel's strictly typed reducer via the global EventBus.
                    </p>
                  </div>
                  <div className="glass-panel" style={{ padding: '2rem', borderRadius: 16, borderTop: '4px solid #a855f7' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1.25rem' }}>
                      <div style={{ padding: '0.6rem', background: 'rgba(168,85,247,0.1)', borderRadius: 10 }}><Terminal size={24} color="#a855f7" /></div>
                      <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#f8fafc' }}>Bandit Router</h4>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.9rem', color: '#94a3b8', lineHeight: 1.6 }}>
                      Uses the Multi-Armed Bandit (UCB1) algorithm to intelligently route your prompts. It continuously monitors latency and success rates to penalize degraded APIs automatically.
                    </p>
                  </div>
                </div>

                <div className="glass-panel" style={{ padding: '2rem', borderRadius: 16, border: '1px solid rgba(59,130,246,0.2)', background: 'linear-gradient(145deg, rgba(59,130,246,0.05) 0%, transparent 100%)', marginTop: '1rem' }}>
                  <h4 style={{ margin: '0 0 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1.1rem', fontWeight: 800, color: '#60a5fa' }}>
                    <Code size={20} /> Developer Note: EventBus
                  </h4>
                  <p style={{ margin: '0 0 1rem', fontSize: '0.9rem', color: '#cbd5e1', lineHeight: 1.6 }}>
                    All inter-panel communication occurs via `src/core/events.ts`. This complete decoupling ensures that adding new UI dashboards or background workers never breaks the critical inference loop.
                  </p>
                  <pre style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: 8, overflowX: 'auto', border: '1px solid rgba(255,255,255,0.05)', margin: 0 }}>
                    <code style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: '#a855f7' }}>
                      <span style={{ color: '#3b82f6' }}>eventBus</span>.emit(EVENTS.MESSAGE_REQUEST, {'{'} payload: prompt {'}'});<br/>
                      <span style={{ color: '#3b82f6' }}>eventBus</span>.on(EVENTS.MESSAGE_RESPONSE, (res) ={'>'} log(res));
                    </code>
                  </pre>
                </div>
              </div>
            )}

            {activeSection === 'safety' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <h1 style={{ fontSize: '2.5rem', fontWeight: 800, margin: 0, color: '#f8fafc', letterSpacing: '-0.02em' }}>Safety & Invariants</h1>
                <p style={{ fontSize: '1.1rem', color: '#94a3b8', lineHeight: 1.6 }}>
                  To guarantee predictable execution, the OS enforces strict mathematical and logical invariants at runtime.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                  {[
                    { inv: 'INV-1', desc: 'Weights Normalization', detail: 'The sum of all routing priority weights across active providers must strictly equal 1.0 (100%). Checked before every routing decision.' },
                    { inv: 'INV-2', desc: 'Zero-Trust Architecture', detail: 'API keys and vault passwords NEVER leave the client browser. They are AES-encrypted in localStorage.' },
                    { inv: 'INV-3', desc: 'Deterministic Telemetry', detail: 'All performance metrics (latency, success rate) are moving averages capped to prevent outlier poisoning.' },
                    { inv: 'INV-4', desc: 'Safety Drift Cap', detail: 'Autonomous weight adjustments by the Bandit algorithm are limited to a maximum delta of +/- 15% per tick.' }
                  ].map((rule, i) => (
                    <div key={i} className="glass-panel" style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start', padding: '1.5rem', borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)' }}>
                      <div style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', fontSize: '0.75rem', fontWeight: 900, padding: '0.4rem 0.8rem', borderRadius: 8, flexShrink: 0, border: '1px solid rgba(239,68,68,0.2)' }}>
                        {rule.inv}
                      </div>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '1.05rem', marginBottom: '0.4rem', color: '#f8fafc' }}>{rule.desc}</div>
                        <p style={{ margin: 0, fontSize: '0.9rem', color: '#94a3b8', lineHeight: 1.6 }}>{rule.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeSection === 'faq' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <h1 style={{ fontSize: '2.5rem', fontWeight: 800, margin: 0, color: '#f8fafc', letterSpacing: '-0.02em' }}>F.A.Q.</h1>
                <p style={{ fontSize: '1.1rem', color: '#94a3b8', lineHeight: 1.6, marginBottom: '1rem' }}>
                  Common questions and troubleshooting steps for the Super-Agents ecosystem.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {[
                    { q: 'Where are my API keys stored?', a: 'Your keys are stored exclusively in your browser\'s LocalStorage via the Browser Vault API. They are never transmitted to our telemetry or servers.' },
                    { q: 'Does this cost anything?', a: 'Super-Agents OS is a free, local-first client. You only pay the LLM providers (like Google, Anthropic, or OpenAI) directly via your API keys, according to their pricing.' },
                    { q: 'Can I add local models (e.g. Ollama)?', a: 'Yes! Select the "Custom" provider in the setup wizard to connect to local proxy servers (LM Studio, Ollama) by specifying `localhost:11434` or similar endpoints.' },
                    { q: 'How does Smart Routing actually work?', a: 'It utilizes an Upper Confidence Bound (UCB1) reinforcement learning approach. It tracks the round-trip latency and success rate of your requests, balancing the exploitation of the fastest model against the exploration of newly added models.' }
                  ].map((faq, i) => (
                    <div key={i} className="glass-panel" style={{ padding: '1.5rem', borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.2)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                        <div style={{ padding: '0.5rem', background: 'rgba(59,130,246,0.1)', borderRadius: 10 }}>
                          <HelpCircle size={20} color="#3b82f6" />
                        </div>
                        <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#f8fafc' }}>{faq.q}</h4>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.95rem', color: '#cbd5e1', lineHeight: 1.6, paddingLeft: '3.25rem' }}>{faq.a}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default DocumentationPanel;
