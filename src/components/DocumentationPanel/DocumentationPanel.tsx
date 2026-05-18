import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, HelpCircle, Shield, Cpu,
  ExternalLink, Zap, Code, Terminal,
  Blocks, Database, Brain, Puzzle,
  Network, Activity, Search, X,
  FileJson, GitBranch,
  BookMarked, ChevronRight, BookText,
} from 'lucide-react';

type DocSection = 'getting-started' | 'architecture' | 'api-reference' | 'safety' | 'faq' | 'changelog';

interface DocSearchResult {
  section: DocSection;
  title: string;
  content: string;
  matchIndex: number;
}

const NAV_ITEMS: { id: DocSection; icon: React.ReactNode; label: string }[] = [
  { id: 'getting-started', icon: <Zap size={18} />, label: 'Getting Started' },
  { id: 'architecture', icon: <Blocks size={18} />, label: 'System Architecture' },
  { id: 'api-reference', icon: <FileJson size={18} />, label: 'API Reference' },
  { id: 'safety', icon: <Shield size={18} />, label: 'Safety & Invariants' },
  { id: 'faq', icon: <HelpCircle size={18} />, label: 'F.A.Q.' },
  { id: 'changelog', icon: <BookText size={18} />, label: 'Changelog' },
];

const NavItem = React.memo(({
  id, icon, label, activeSection, onSelect,
}: {
  id: DocSection; icon: React.ReactNode; label: string;
  activeSection: DocSection; onSelect: (id: DocSection) => void;
}) => (
  <button
    onClick={() => onSelect(id)}
    style={{
      display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.8rem 1rem', width: '100%',
      background: activeSection === id ? 'rgba(59,130,246,0.1)' : 'transparent',
      color: activeSection === id ? '#3b82f6' : 'var(--text-muted)',
      border: '1px solid',
      borderColor: activeSection === id ? 'rgba(59,130,246,0.2)' : 'transparent',
      borderRadius: 12, cursor: 'pointer', fontSize: '0.9rem', fontWeight: activeSection === id ? 700 : 600,
      transition: 'all 0.2s', textAlign: 'left',
    }}
    aria-pressed={activeSection === id}
  >
    <span aria-hidden="true">{icon}</span>
    {label}
  </button>
));

const SearchBar = ({ query, onChange, results, onSelect }: {
  query: string; onChange: (q: string) => void;
  results: DocSearchResult[]; onSelect: (section: DocSection) => void;
}) => (
  <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
    <div style={{
      display: 'flex', alignItems: 'center', gap: '0.5rem',
      padding: '0.6rem 1rem', background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12,
    }}>
      <Search size={16} color="#94a3b8" />
      <input
        type="text"
        value={query}
        onChange={e => onChange(e.target.value)}
        placeholder="Search documentation..."
        style={{
          flex: 1, background: 'none', border: 'none', outline: 'none',
          color: '#f8fafc', fontSize: '0.9rem',
        }}
      />
      {query && (
        <button onClick={() => onChange('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
          <X size={14} />
        </button>
      )}
    </div>
    {query && results.length > 0 && (
      <div style={{
        position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10,
        background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 12, marginTop: '0.25rem', overflow: 'hidden',
      }}>
        {results.slice(0, 8).map((r, i) => (
          <button
            key={i}
            onClick={() => { onSelect(r.section); onChange(''); }}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              padding: '0.75rem 1rem', width: '100%', background: 'none',
              border: 'none', borderBottom: '1px solid rgba(255,255,255,0.05)',
              color: '#cbd5e1', cursor: 'pointer', textAlign: 'left', fontSize: '0.85rem',
            }}
          >
            <ChevronRight size={12} color="#3b82f6" />
            <span style={{ fontWeight: 600 }}>{r.title}</span>
            <span style={{ color: '#64748b', marginLeft: 'auto', fontSize: '0.75rem' }}>
              {r.section}
            </span>
          </button>
        ))}
      </div>
    )}
  </div>
);

const CodeBlock = ({ code }: { code: string }) => (
  <pre style={{
    background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: 8,
    overflowX: 'auto', border: '1px solid rgba(255,255,255,0.05)',
    margin: '0.5rem 0',
  }}>
    <code style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: '#a855f7', lineHeight: 1.6, whiteSpace: 'pre' }}>
      {code}
    </code>
  </pre>
);

const GettingStarted = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
    <h1 style={{ fontSize: '2.5rem', fontWeight: 800, margin: 0, color: '#f8fafc' }}>
      Getting Started
    </h1>
    <p style={{ fontSize: '1.1rem', color: '#94a3b8', lineHeight: 1.6 }}>
      Super-Agents OS is a local-first, browser-based inference operating system.
      Configure providers, manage memory, assign agent roles, and orchestrate multi-model cognitive workflows.
    </p>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '1rem' }}>
      {[
        { title: '1. Add Providers', text: 'Navigate to Providers and add API keys for OpenRouter, Gemini, Groq, NVIDIA, or custom endpoints. Keys are encrypted at rest in IndexedDB and never leave your browser.', icon: <Shield size={20} color="#10b981" /> },
        { title: '2. Configure Routing', text: 'In Settings, set your Default Chat Strategy. "Smart Auto-Routing" (UCB1) balances latency, cost, and reliability. Alternatives: broadcast (all providers), race (fastest wins), cost (cheapest first), and performance (lowest latency).', icon: <Cpu size={20} color="#3b82f6" /> },
        { title: '3. Memory & Semantic Search', text: 'Every cognitive step is automatically stored in the Vector Memory Mesh. The panel provides full-text search via Orama (offline BM25) and semantic search via Transformers.js with all-MiniLM-L6-v2 embeddings (384-dim). Toggle "Semantic" mode for intent-based retrieval.', icon: <Brain size={20} color="#a855f7" /> },
        { title: '4. SuperAgents', text: 'Use the Roles panel to define agent personas with system prompts, the Skills panel to register executable capabilities (code, API, DB), and the Tasks panel to trace multi-step cognitive workflows. Connectors integrate external data via MCP servers.', icon: <Puzzle size={20} color="#f59e0b" /> },
        { title: '5. Execute & Monitor', text: 'Chat or use the Terminal to kick off tasks. Watch traces in the Telemetry dashboard, agent statistics in the Agents panel, and deliberation heatmaps in the Hive topology view.', icon: <Activity size={20} color="#84cc16" /> },
      ].map((step, i) => (
        <div key={i} className="glass-panel" style={{ padding: '1.5rem', borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: '1.25rem', alignItems: 'flex-start' }}>
          <div style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.05)', borderRadius: 12 }}>{step.icon}</div>
          <div>
            <h4 style={{ margin: '0 0 0.5rem', fontSize: '1.05rem', fontWeight: 800, color: '#f8fafc' }}>{step.title}</h4>
            <p style={{ margin: 0, fontSize: '0.9rem', color: '#94a3b8', lineHeight: 1.6 }}>{step.text}</p>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const Architecture = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
    <h1 style={{ fontSize: '2.5rem', fontWeight: 800, margin: 0, color: '#f8fafc' }}>System Architecture</h1>
    <p style={{ fontSize: '1.1rem', color: '#94a3b8', lineHeight: 1.6 }}>
      Built on a deterministic, event-sourced TypeScript kernel with service-oriented architecture
      designed for resilience, privacy, and hot-swappable components.
    </p>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginTop: '1rem' }}>
      {[
        { title: 'Kernel Layer', icon: <Cpu size={24} color="#3b82f6" />, border: '#3b82f6', text: 'SystemKernel (reducer-pattern state machine), EventBus (typed), DI Container, Bootstrap. Deep immutable state, ring buffer event log, composite event keys.' },
        { title: 'Services', icon: <Terminal size={24} color="#a855f7" />, border: '#a855f7', text: 'KeyService, RouterService (UCB1 bandit), MemoryService, ToolService, AdvisorService, RotationService. All services use ILifecycle (init→start→destroy) and ITransaction for atomic mutations.' },
        { title: 'Contracts & Types', icon: <FileJson size={24} color="#10b981" />, border: '#10b981', text: '32 contract interfaces (IKeyVault, IProviderAdapter, ILogger, ITransaction, IRotationService). 16 Zod schemas. All business logic lives in kernel — legacy src/services/ are thin Proxy wrappers.' },
        { title: 'Persistence', icon: <Database size={24} color="#f59e0b" />, border: '#f59e0b', text: 'Dexie (IndexedDB) stores memories, keys, sessions, traces, roles, skills, connectors. localStorage for vault encryption keys. Schema versioning supports incremental migrations.' },
      ].map((card, i) => (
        <div key={i} className="glass-panel" style={{ padding: '2rem', borderRadius: 16, borderTop: `4px solid ${card.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1.25rem' }}>
            <div style={{ padding: '0.6rem', background: `rgba(${card.border === '#3b82f6' ? '59,130,246' : card.border === '#a855f7' ? '168,85,247' : card.border === '#10b981' ? '16,185,129' : '245,158,11'},0.1)`, borderRadius: 10 }}>{card.icon}</div>
            <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#f8fafc' }}>{card.title}</h4>
          </div>
          <p style={{ margin: 0, fontSize: '0.9rem', color: '#94a3b8', lineHeight: 1.6 }}>{card.text}</p>
        </div>
      ))}
    </div>
    <div className="glass-panel" style={{ padding: '2rem', borderRadius: 16, border: '1px solid rgba(59,130,246,0.2)', background: 'linear-gradient(145deg, rgba(59,130,246,0.05) 0%, transparent 100%)', marginTop: '1rem' }}>
      <h4 style={{ margin: '0 0 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1.1rem', fontWeight: 800, color: '#60a5fa' }}>
        <Network size={20} /> Kernel Service Map
      </h4>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.85rem', color: '#cbd5e1', lineHeight: 1.6 }}>
        <div>
          <strong style={{ color: '#60a5fa' }}>KeyService</strong> — Key CRUD, encryption, health, quotas, pools<br />
          <strong style={{ color: '#60a5fa' }}>RouterService</strong> — UCB1 bandit, SLA modes, fallback chains<br />
          <strong style={{ color: '#60a5fa' }}>RotationService</strong> — Auto key rotation, TTL, scheduling<br />
          <strong style={{ color: '#60a5fa' }}>MemoryService</strong> — BM25 + semantic search, Orama worker<br />
          <strong style={{ color: '#60a5fa' }}>ToolService</strong> — Script/API/DB tools, sandboxed execution
        </div>
        <div>
          <strong style={{ color: '#60a5fa' }}>OrchestrationService</strong> — Topology-driven multi-node DAG execution<br />
          <strong style={{ color: '#60a5fa' }}>AdvisorService</strong> — Meta-agent for system optimization<br />
          <strong style={{ color: '#60a5fa' }}>PolicyService</strong> — Guardrails (latency, PII, cost)<br />
          <strong style={{ color: '#60a5fa' }}>HealthCheckService</strong> — Provider key liveness verification<br />
          <strong style={{ color: '#60a5fa' }}>MCPService</strong> — Model Context Protocol connections
        </div>
      </div>
    </div>
    <div className="glass-panel" style={{ padding: '2rem', borderRadius: 16, border: '1px solid rgba(139,92,246,0.2)', background: 'linear-gradient(145deg, rgba(139,92,246,0.05) 0%, transparent 100%)' }}>
      <h4 style={{ margin: '0 0 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1.1rem', fontWeight: 800, color: '#a78bfa' }}>
        <Code size={20} /> Layering & Dependency Rule
      </h4>
      <p style={{ margin: '0 0 1rem', fontSize: '0.9rem', color: '#cbd5e1', lineHeight: 1.6 }}>
        The kernel never imports UI, services, or types from legacy layers. All cross-layer communication
        goes through contract interfaces (I*). The bootstrap uses LifecycleManager for deterministic
        init→start→destroy ordering.
      </p>
      <CodeBlock code={`// UI → Kernel contracts only\nkernel.transaction(async (tx) => {\n  kernel.setSLAMode('ECONOMY', tx);\n  kernel.setBaseWeights({...}, tx);\n});`} />
    </div>
  </div>
);

const ApiReference = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
    <h1 style={{ fontSize: '2.5rem', fontWeight: 800, margin: 0, color: '#f8fafc' }}>API Reference</h1>
    <p style={{ fontSize: '1.1rem', color: '#94a3b8', lineHeight: 1.6 }}>
      Core service APIs and event contracts for the Super-Agents OS platform.
    </p>
    {[
      { title: 'EventBus', desc: 'Global typed event system for inter-service communication.', code: 'eventBus.on(event, callback) => unsubscribe\n      eventBus.emit(event, data)\n      eventBus.on(\'*\', callback) // wildcard' },
      { title: 'Kernel', desc: 'System state machine with deep immutable state.', code: 'kernel.getState() => SystemState\n      kernel.transaction(fn) => Promise<void>\n      kernel.setSLAMode(mode, tx?) => void\n      kernel.setBaseWeights(w, tx?) => void' },
      { title: 'RouterService', desc: 'Provider routing with UCB1 multi-armed bandit.', code: 'routerService.route(messages, requestId) => Promise<ChatResult>\n      routerService.setStrategy(strategy) => void\n      routerService.getRankedProviders(type) => ProviderScore[]' },
      { title: 'OrchestrationService', desc: 'Topology-driven multi-node execution graph.', code: 'orchestrator.mount(topology) => void\n      orchestrator.getActiveTopology() => Topology | null\n      orchestrator.spawnAgent(config) => Agent' },
      { title: 'MemoryService', desc: 'Hybrid memory with semantic and keyword search.', code: 'memoryService.search(query) => MemorySearchResult[]\n      memoryService.addEntry(entry) => void\n      memoryService.getStats() => MemoryStats' },
      { title: 'KeyService', desc: 'API key management with encryption and health tracking.', code: 'keyService.getKeys() => ApiKey[]\n      keyService.addKey(data) => Promise<ApiKey>\n      keyService.removeKey(id) => void\n      keyService.getAlerts() => Alert[]' },
    ].map((api, i) => (
      <div key={i} className="glass-panel" style={{ padding: '1.5rem', borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
          <div style={{ padding: '0.5rem', background: 'rgba(59,130,246,0.1)', borderRadius: 10 }}>
            <Code size={18} color="#3b82f6" />
          </div>
          <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#f8fafc' }}>{api.title}</h4>
        </div>
        <p style={{ fontSize: '0.9rem', color: '#94a3b8', lineHeight: 1.6, marginBottom: '0.75rem' }}>{api.desc}</p>
        <CodeBlock code={api.code} />
      </div>
    ))}
    <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 16, border: '1px solid rgba(139,92,246,0.2)', background: 'linear-gradient(145deg, rgba(139,92,246,0.05) 0%, transparent 100%)' }}>
      <h4 style={{ margin: '0 0 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1.1rem', fontWeight: 800, color: '#a78bfa' }}>
        <GitBranch size={20} /> Event Reference (Key Events)
      </h4>
      <div style={{ fontSize: '0.85rem', color: '#cbd5e1', lineHeight: 2 }}>
        <code style={{ color: '#3b82f6' }}>'chat:send'</code> — Incoming chat request<br />
        <code style={{ color: '#3b82f6' }}>'chat:stream:chunk'</code> — Streaming response chunk<br />
        <code style={{ color: '#3b82f6' }}>'chat:stream:end'</code> — Stream completion<br />
        <code style={{ color: '#3b82f6' }}>'router:signal'</code> — Routing decision feedback<br />
        <code style={{ color: '#3b82f6' }}>'kernel:updated'</code> — State change notification<br />
        <code style={{ color: '#3b82f6' }}>'system:notification'</code> — UI notification<br />
        <code style={{ color: '#3b82f6' }}>'cognitive:step:completed'</code> — Pipeline step done<br />
        <code style={{ color: '#3b82f6' }}>'policy:violation'</code> — Policy guardrail triggered
      </div>
    </div>
  </div>
);

const Safety = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
    <h1 style={{ fontSize: '2.5rem', fontWeight: 800, margin: 0, color: '#f8fafc' }}>Safety & Invariants</h1>
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
        { inv: 'INV-8', desc: 'Role Validation', detail: 'Every agent role defined in the Roles panel must pass schema validation (name, systemPrompt, temperature). Invalid roles are rejected before persistence.' },
        { inv: 'INV-9', desc: 'Concurrency Throttling', detail: 'Maximum concurrent requests per provider key is dynamically capped based on recent error rates and latency trends.' },
        { inv: 'INV-10', desc: 'Audit Trail', detail: 'All administrative actions (config changes, key operations, system reloads) are logged with actor, timestamp, and details for forensic analysis.' },
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
);

const FAQ = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
    <h1 style={{ fontSize: '2.5rem', fontWeight: 800, margin: 0, color: '#f8fafc' }}>F.A.Q.</h1>
    <p style={{ fontSize: '1.1rem', color: '#94a3b8', lineHeight: 1.6, marginBottom: '1rem' }}>
      Common questions and troubleshooting steps for the Super-Agents ecosystem.
    </p>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {[
        { q: 'Where are my API keys stored?', a: 'Your keys are stored exclusively in your browser\'s localStorage via the Browser Vault API. They are never transmitted to our telemetry or external servers.' },
        { q: 'Does this cost anything?', a: 'Super-Agents OS is a free, local-first client. You only pay the LLM providers (Google, Anthropic, OpenAI, etc.) directly via your API keys, according to their pricing.' },
        { q: 'How does semantic search work?', a: 'When enabled, the Semantic toggle sends your query through a Transformers.js pipeline (all-MiniLM-L6-v2, 384-dim) running in a Web Worker. The generated embedding is compared against stored vectors using cosine similarity.' },
        { q: 'Is my data persisted across sessions?', a: 'Yes. All data (memories, keys, roles, skills, connectors, chat sessions, traces) is stored in IndexedDB via Dexie. It survives page reloads, browser restarts, and incognito sessions.' },
        { q: 'Can I add local models (e.g. Ollama)?', a: 'Yes! Select the "Custom" provider in the setup wizard to connect to local proxy servers (LM Studio, Ollama) by specifying localhost:11434 or similar endpoints.' },
        { q: 'How does Smart Routing actually work?', a: 'It uses an Upper Confidence Bound (UCB1) reinforcement learning approach. It tracks round-trip latency and success rate, balancing exploitation of the fastest model against exploration of newly added models.' },
        { q: 'What are MCP Connectors?', a: 'Model Context Protocol (MCP) servers provide a standardized interface to external data sources (file system, GitHub, databases). Configure them in the Connectors panel.' },
        { q: 'What is the difference between Orama and embedding search?', a: 'Orama provides fast offline BM25 keyword search. Semantic/embedding search understands intent — "how to configure routing" will match documents about UCB1 settings even if those exact words don\'t appear.' },
        { q: 'How do I export my data?', a: 'Use the Settings panel > Data Management section to export all your data as JSON. This includes memories, keys (encrypted), chat sessions, roles, and configuration.' },
        { q: 'What happens when a provider key fails?', a: 'The system automatically marks it as "error", attempts health checks periodically, and routes requests to healthy providers. You\'ll receive a notification with details.' },
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
);

const Changelog = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
    <h1 style={{ fontSize: '2.5rem', fontWeight: 800, margin: 0, color: '#f8fafc' }}>Changelog</h1>
    <p style={{ fontSize: '1.1rem', color: '#94a3b8', lineHeight: 1.6 }}>
      Version history and release notes for Super-Agents OS.
    </p>
    {[
      { version: 'v4.1.0', date: '2026-05-18', changes: ['Kernel Consolidation — Dependency Rule enforced', 'Transaction boundary (ITransaction) for atomic mutations', 'ILifecycle standard for all kernel services', 'ILogger / LoggerService for structured observability', 'RotationService migrated to kernel', '16 Zod schemas migrated to kernel/types/', 'ISTopology contracts moved to kernel/contracts/', 'KeyRegistry no longer seeds demo placeholder keys', 'Dead SecretStores and AdapterRegistry deleted'] },
      { version: 'v4.0.3', date: '2026-05-16', changes: ['Ring buffer event log (O(1) insert/eviction)', 'Deep immutable state (deepFreeze + structuredClone)', 'Composite event keys prevent timestamp collision', 'Init validation with per-field fallback', 'Whitelist SLA and weight clamping'] },
      { version: 'v4.0.1', date: '2026-05-14', changes: ['Dexie ConstraintError fixed (add→put, bulkAdd→bulkPut)', 'Infinite re-render in KeyStore fixed (useMemo)', 'Duplicate React keys in InstalledProvidersView fixed', 'KeyService async init() extracted from constructor', 'Bootstrap duplicate kernel.init() removed'] },
      { version: 'v3.7.0', date: '2026-05-10', changes: ['Orama Worker for full-text BM25 search', 'Transformers.js real semantic embeddings (384-dim)', 'Hybrid search: auto → semantic → fulltext → substring', 'Vector persistence in Dexie'] },
      { version: 'v3.6.0', date: '2026-05-09', changes: ['Persistent IndexedDB storage via Dexie.js', 'Secure WebWorker sandbox for agent scripts', 'Multi-agent coordination via Blackboard pattern', 'MCP protocol integration', 'Observability 2.0 with real telemetry'] },
    ].map((release, i) => (
      <div key={i} className="glass-panel" style={{ padding: '1.5rem', borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ padding: '0.5rem', background: 'rgba(59,130,246,0.1)', borderRadius: 10 }}>
              <BookMarked size={18} color="#3b82f6" />
            </div>
            <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#f8fafc' }}>{release.version}</h4>
          </div>
          <span style={{ color: '#64748b', fontSize: '0.85rem' }}>{release.date}</span>
        </div>
        <ul style={{ margin: 0, paddingLeft: '1.5rem', color: '#94a3b8', fontSize: '0.9rem', lineHeight: 2 }}>
          {release.changes.map((change, j) => (
            <li key={j}>{change}</li>
          ))}
        </ul>
      </div>
    ))}
  </div>
);

const SECTION_COMPONENTS: Record<DocSection, React.FC> = {
  'getting-started': GettingStarted,
  'architecture': Architecture,
  'api-reference': ApiReference,
  'safety': Safety,
  'faq': FAQ,
  'changelog': Changelog,
};

const ALL_CONTENT: Record<DocSection, { title: string; content: string }> = {
  'getting-started': { title: 'Getting Started', content: 'Configure providers, manage memory, assign agent roles, and orchestrate multi-model cognitive workflows. Add Providers, Configure Routing, Memory & Semantic Search, SuperAgents, Execute & Monitor.' },
  'architecture': { title: 'System Architecture', content: 'Kernel Layer, Services, Contracts & Types, Persistence. Kernel Service Map. Layering & Dependency Rule. Transaction boundary, ILifecycle, ILogger, EventBus.' },
  'api-reference': { title: 'API Reference', content: 'Core service APIs and event contracts. EventBus, Kernel, RouterService, OrchestrationService, MemoryService, KeyService. Event reference for key events.' },
  'safety': { title: 'Safety & Invariants', content: 'Weights Normalization, Zero-Trust Architecture, Deterministic Telemetry, Safety Drift Cap, MCP Server Isolation, Cognitive Trace Completeness, Schema Versioning, Role Validation, Concurrency Throttling, Audit Trail.' },
  'faq': { title: 'F.A.Q.', content: 'Common questions about API key storage, costs, semantic search, data persistence, local models, Smart Routing, MCP Connectors, Orama vs embedding search, data export, provider key failures.' },
  'changelog': { title: 'Changelog', content: 'Version history from v4.1.0 down to v3.6.0. Kernel Consolidation, Kernel Hardening, Runtime Stability, Orama Worker, IndexedDB.' },
};

const DocumentationPanel: React.FC = () => {
  const [activeSection, setActiveSection] = useState<DocSection>('getting-started');
  const [searchQuery, setSearchQuery] = useState('');

  const searchResults = useMemo((): DocSearchResult[] => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    const results: DocSearchResult[] = [];

    for (const [section, data] of Object.entries(ALL_CONTENT)) {
      const titleMatch = data.title.toLowerCase().indexOf(q);
      const contentMatch = data.content.toLowerCase().indexOf(q);
      if (titleMatch >= 0 || contentMatch >= 0) {
        results.push({
          section: section as DocSection,
          title: data.title,
          content: data.content,
          matchIndex: Math.min(titleMatch >= 0 ? titleMatch : Infinity, contentMatch >= 0 ? contentMatch : Infinity),
        });
      }
    }

    return results.sort((a, b) => a.matchIndex - b.matchIndex);
  }, [searchQuery]);

  const handleSectionSelect = useCallback((id: DocSection) => {
    setActiveSection(id);
    setSearchQuery('');
  }, []);

  const SectionComponent = SECTION_COMPONENTS[activeSection];

  return (
    <div style={{ display: 'flex', gap: '3rem', height: '100%', overflow: 'hidden' }}>
      <div style={{ width: 260, display: 'flex', flexDirection: 'column', gap: '0.5rem', flexShrink: 0 }}>
        <div style={{ marginBottom: '1.5rem', paddingBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#f8fafc' }}>
            <BookOpen size={28} color="#3b82f6" /> OS Manual
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: '0.5rem', lineHeight: 1.5 }}>
            Complete platform documentation
          </p>
        </div>

        <SearchBar query={searchQuery} onChange={setSearchQuery} results={searchResults} onSelect={handleSectionSelect} />

        {NAV_ITEMS.map(item => (
          <NavItem key={item.id} {...item} activeSection={activeSection} onSelect={handleSectionSelect} />
        ))}

        <div style={{ marginTop: 'auto', padding: '1.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)' }}>
          <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.85rem', fontWeight: 800, color: '#f8fafc' }}>Developer Support</h4>
          <p style={{ fontSize: '0.75rem', color: '#94a3b8', lineHeight: 1.6, marginBottom: '1rem' }}>
            Need technical help or want to contribute? Check our open source repository.
          </p>
          <a href="https://github.com/n95887174-source/ai-os-new" target="_blank" rel="noopener noreferrer" className="btn-secondary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', textDecoration: 'none', fontSize: '0.8rem', padding: '0.6rem', borderRadius: 8 }}>
            <ExternalLink size={14} /> View Repository
          </a>
        </div>
      </div>

      <div style={{ flex: 1, maxWidth: 850, overflowY: 'auto', paddingRight: '2rem', paddingBottom: '3rem' }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeSection + (searchQuery ? '-search' : '')}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
          >
            <SectionComponent />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default DocumentationPanel;
