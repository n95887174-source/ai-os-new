import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, HelpCircle, Shield, Cpu,
  ExternalLink, Zap, Code, Terminal,
  Blocks, Database, Brain, Puzzle,
  Network, Activity
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
                  Super-Agents OS is a local-first, browser-based inference operating system.
                  Configure providers, manage memory, assign agent roles, and orchestrate multi-model cognitive workflows.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '1rem' }}>
                  {[
                    { title: '1. Register Providers', text: 'Open "Agent Mesh" and add API keys for OpenRouter, Gemini, Groq, NVIDIA, or custom endpoints. Keys are encrypted and stored locally in your browser only.', icon: <Shield size={20} color="#10b981" /> },
                    { title: '2. Configure Routing', text: 'In Settings, set your Default Chat Strategy. "Smart Auto-Routing" (UCB1) balances latency, cost, and reliability. Alternatives: broadcast (all providers), race (fastest wins), cost (cheapest first), and performance (lowest latency).', icon: <Cpu size={20} color="#3b82f6" /> },
                    { title: '3. Memory & Semantic Search', text: 'Every cognitive step is automatically stored in the Vector Memory Mesh. The panel provides full-text search via Orama (offline BM25) and semantic search via Transformers.js with all-MiniLM-L6-v2 embeddings (384-dim). Toggle "Semantic" mode for intent-based retrieval.', icon: <Brain size={20} color="#a855f7" /> },
                    { title: '4. SuperAgents', text: 'Use the Roles panel to define agent personas with system prompts, the Skills panel to register executable capabilities (code, API, DB), and the Tasks panel to trace multi-step cognitive workflows. Connectors integrate external data via MCP servers.', icon: <Puzzle size={20} color="#f59e0b" /> },
                    { title: '5. Execute & Monitor', text: 'Chat or use the Terminal to kick off tasks. Watch traces in the Telemetry dashboard, agent statistics in the Agents panel, and deliberation heatmaps in the Hive topology view.', icon: <Activity size={20} color="#84cc16" /> }
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
                  Built on a deterministic, event-sourced React/TypeScript core with a service-oriented architecture
                  designed for resilience, privacy, and hot-swappable components.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginTop: '1rem' }}>
                  <div className="glass-panel" style={{ padding: '2rem', borderRadius: 16, borderTop: '4px solid #3b82f6' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1.25rem' }}>
                      <div style={{ padding: '0.6rem', background: 'rgba(59,130,246,0.1)', borderRadius: 10 }}><Cpu size={24} color="#3b82f6" /></div>
                      <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#f8fafc' }}>System Kernel</h4>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.9rem', color: '#94a3b8', lineHeight: 1.6 }}>
                      The single source of truth. Every message, UI action, error, and metric passes through the
                      globally typed EventBus (<code>src/core/events.ts</code>). Panels and services communicate
                      exclusively via named events, never via direct imports.
                    </p>
                  </div>
                  <div className="glass-panel" style={{ padding: '2rem', borderRadius: 16, borderTop: '4px solid #a855f7' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1.25rem' }}>
                      <div style={{ padding: '0.6rem', background: 'rgba(168,85,247,0.1)', borderRadius: 10 }}><Terminal size={24} color="#a855f7" /></div>
                      <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#f8fafc' }}>Bandit Router</h4>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.9rem', color: '#94a3b8', lineHeight: 1.6 }}>
                      Routes prompts using configurable strategies. UCB1 multi-armed bandit provides automatic
                      load balancing across providers based on real-time latency and success rate. Supports
                      broadcast, race, cost, and performance strategies.
                    </p>
                  </div>
                  <div className="glass-panel" style={{ padding: '2rem', borderRadius: 16, borderTop: '4px solid #10b981' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1.25rem' }}>
                      <div style={{ padding: '0.6rem', background: 'rgba(16,185,129,0.1)', borderRadius: 10 }}><Brain size={24} color="#10b981" /></div>
                      <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#f8fafc' }}>Memory & Search</h4>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.9rem', color: '#94a3b8', lineHeight: 1.6 }}>
                      MemoryService logs every cognitive step into Dexie/IndexedDB. A dedicated Web Worker
                      runs Orama for full-text BM25 search and Transformers.js (all-MiniLM-L6-v2) for
                      real-time semantic embedding and cosine similarity retrieval.
                    </p>
                  </div>
                  <div className="glass-panel" style={{ padding: '2rem', borderRadius: 16, borderTop: '4px solid #f59e0b' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1.25rem' }}>
                      <div style={{ padding: '0.6rem', background: 'rgba(245,158,11,0.1)', borderRadius: 10 }}><Database size={24} color="#f59e0b" /></div>
                      <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#f8fafc' }}>Persistence Layer</h4>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.9rem', color: '#94a3b8', lineHeight: 1.6 }}>
                      Dexie (IndexedDB wrapper) stores memories, chat sessions, API keys, traces, roles,
                      skills, connectors, and cognitive traces. Schema versioning supports incremental
                      migrations. A legacy SQL proxy provides backward-compatible access to the notes table.
                    </p>
                  </div>
                </div>

                <div className="glass-panel" style={{ padding: '2rem', borderRadius: 16, border: '1px solid rgba(59,130,246,0.2)', background: 'linear-gradient(145deg, rgba(59,130,246,0.05) 0%, transparent 100%)', marginTop: '1rem' }}>
                  <h4 style={{ margin: '0 0 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1.1rem', fontWeight: 800, color: '#60a5fa' }}>
                    <Network size={20} /> Service Map
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.85rem', color: '#cbd5e1', lineHeight: 1.6 }}>
                    <div>
                      <strong style={{ color: '#60a5fa' }}>CognitiveService</strong> — Chain-of-thought trace engine with Dexie persistence<br />
                      <strong style={{ color: '#60a5fa' }}>OrchestrationService</strong> — Topology-driven multi-node execution graph<br />
                      <strong style={{ color: '#60a5fa' }}>ToolService</strong> — Script/API/DB tool registry with sandboxed execution<br />
                      <strong style={{ color: '#60a5fa' }}>AgentService</strong> — Per-agent call/token/latency statistics
                    </div>
                    <div>
                      <strong style={{ color: '#60a5fa' }}>PolicyService</strong> — Guardrails (latency, PII, cost limits)<br />
                      <strong style={{ color: '#60a5fa' }}>HealthCheckService</strong> — Provider key liveness verification<br />
                      <strong style={{ color: '#60a5fa' }}>MCPService</strong> — Model Context Protocol server connections<br />
                      <strong style={{ color: '#60a5fa' }}>SandboxService</strong> — Isolated Web Worker for agent scripts
                    </div>
                  </div>
                </div>

                <div className="glass-panel" style={{ padding: '2rem', borderRadius: 16, border: '1px solid rgba(139,92,246,0.2)', background: 'linear-gradient(145deg, rgba(139,92,246,0.05) 0%, transparent 100%)' }}>
                  <h4 style={{ margin: '0 0 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1.1rem', fontWeight: 800, color: '#a78bfa' }}>
                    <Code size={20} /> Developer Note: EventBus
                  </h4>
                  <p style={{ margin: '0 0 1rem', fontSize: '0.9rem', color: '#cbd5e1', lineHeight: 1.6 }}>
                    All inter-panel and inter-service communication uses the typed EventBus.
                    This decoupling ensures that adding new panels or background workers never
                    breaks the critical inference loop.
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
                    { inv: 'INV-2', desc: 'Zero-Trust Architecture', detail: 'API keys and vault passwords never leave the client browser. They are AES-encrypted in localStorage and never transmitted to telemetry.' },
                    { inv: 'INV-3', desc: 'Deterministic Telemetry', detail: 'All performance metrics (latency, success rate) use capped moving averages to prevent outlier poisoning.' },
                    { inv: 'INV-4', desc: 'Safety Drift Cap', detail: 'Autonomous weight adjustments by the Bandit algorithm are limited to a maximum delta of +/- 15% per tick.' },
                    { inv: 'INV-5', desc: 'MCP Server Isolation', detail: 'MCP server connections are sandboxed per origin. A compromised server cannot access keys, memory, or other servers.' },
                    { inv: 'INV-6', desc: 'Cognitive Trace Completeness', detail: 'Every cognitive step logged in Dexie includes traceId, nodeId, and timestamp. Orphaned steps are detected and flagged by the CognitiveService on startup.' },
                    { inv: 'INV-7', desc: 'Schema Versioning', detail: 'All Dexie schema migrations are incremental and backward-compatible. The database version number is monotonic and never regresses.' },
                    { inv: 'INV-8', desc: 'Role Validation', detail: 'Every agent role defined in the Roles panel must pass schema validation (name, systemPrompt, temperature). Invalid roles are rejected before persistence.' }
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
                    { q: 'Where are my API keys stored?', a: 'Your keys are stored exclusively in your browser\'s localStorage via the Browser Vault API. They are never transmitted to our telemetry or external servers.' },
                    { q: 'Does this cost anything?', a: 'Super-Agents OS is a free, local-first client. You only pay the LLM providers (Google, Anthropic, OpenAI, etc.) directly via your API keys, according to their pricing.' },
                    { q: 'How does semantic search work?', a: 'When enabled, the Semantic toggle sends your query through a Transformers.js pipeline (all-MiniLM-L6-v2, 384-dim) running in a Web Worker. The generated embedding is compared against stored vectors using cosine similarity. The model is cached in browser storage after first load.' },
                    { q: 'Is my data persisted across sessions?', a: 'Yes. All data (memories, keys, roles, skills, connectors, chat sessions, traces) is stored in IndexedDB via Dexie. It survives page reloads, browser restarts, and incognito sessions (per-browser storage).' },
                    { q: 'Can I add local models (e.g. Ollama)?', a: 'Yes! Select the "Custom" provider in the setup wizard to connect to local proxy servers (LM Studio, Ollama) by specifying localhost:11434 or similar endpoints.' },
                    { q: 'How does Smart Routing actually work?', a: 'It uses an Upper Confidence Bound (UCB1) reinforcement learning approach. It tracks round-trip latency and success rate, balancing exploitation of the fastest model against exploration of newly added models.' },
                    { q: 'What are MCP Connectors?', a: 'Model Context Protocol (MCP) servers provide a standardized interface to external data sources (file system, GitHub, databases). Configure them in the Connectors panel to give agents read/write access to external context.' },
                    { q: 'What is the difference between Orama and embedding search?', a: 'Orama provides fast offline BM25 keyword search (term frequency / inverse document frequency). Semantic/embedding search understands intent — "how to configure routing" will match documents about UCB1 settings even if those exact words don\'t appear. For best results, try both modes.' }
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
