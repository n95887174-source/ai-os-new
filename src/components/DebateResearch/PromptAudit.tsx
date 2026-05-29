import React, { useState, useMemo, useEffect } from 'react';
import { BookOpen, AlertTriangle, Info, CheckCircle, File, Search, BarChart3, Thermometer, Wrench, FolderOpen, HardDrive, X, Loader2, ChevronDown, ChevronRight, Layers } from 'lucide-react';
import { workspaceService } from '../../kernel/instances';
import { useTranslation } from '../../i18n/useTranslation';

interface AgentPrompt {
  id: string;
  name: string;
  group: string;
  prompt: string;
  temperature: number;
  tools: string[];
  wordCount: number;
  hasTools: boolean;
  hasKeyTerms: boolean;
  avgWordLen: number;
}

const STATIC_AGENTS: AgentPrompt[] = [
  { id: 'agent-network', name: 'Network Engineer', group: 'Technical', prompt: 'You are a network engineer. Evaluate communication protocols, topology design, and data flow. Focus on latency, throughput, and fault tolerance.', temperature: 0.2, tools: [] },
  { id: 'agent-risk', name: 'Risk Analyst', group: 'Analytical', prompt: 'You are a risk analyst. Categorize risks by probability and impact. Propose mitigation strategies using frameworks like STRIDE, DREAD, or FAIR.', temperature: 0.15, tools: ['data_analysis', 'risk_matrix'] },
  { id: 'agent-ethics', name: 'Ethics Officer', group: 'Analytical', prompt: 'You are an ethics officer. Evaluate decisions for fairness, transparency, accountability, and bias. Flag ethical risks and propose responsible alternatives.', temperature: 0.2, tools: [] },
  { id: 'agent-architect', name: 'System Architect', group: 'Technical', prompt: 'You are a senior system architect. Focus on scalability, modularity, and clean architecture patterns. Evaluate trade-offs between monolith, microservices, and serverless.', temperature: 0.2, tools: ['code_interpreter', 'code_review', 'sandbox_exec'] },
  { id: 'agent-security', name: 'Security Engineer', group: 'Technical', prompt: 'You are a security engineer. Identify threats, attack vectors, and security gaps. Apply defense-in-depth and least-privilege principles. Use STRIDE and OWASP Top 10.', temperature: 0.15, tools: ['vulnerability_scan', 'code_audit', 'threat_model'] },
  { id: 'agent-devops', name: 'DevOps Engineer', group: 'Technical', prompt: 'You are a DevOps engineer. Design CI/CD pipelines, infrastructure-as-code, and deployment strategies. Focus on reliability, observability, and incident response.', temperature: 0.2, tools: ['code_interpreter', 'code_review', 'sandbox_exec'] },
  { id: 'agent-database', name: 'Database Engineer', group: 'Technical', prompt: 'You are a database engineer. Design schemas, optimize queries, plan migrations. Consider indexing, sharding, replication, and ACID vs BASE trade-offs.', temperature: 0.2, tools: ['data_analysis', 'sql_executor'] },
  { id: 'agent-perf', name: 'Performance Engineer', group: 'Technical', prompt: 'You are a performance engineer. Identify bottlenecks, measure throughput and latency. Propose concrete optimizations backed by data.', temperature: 0.25, tools: ['benchmark', 'profiler'] },
  { id: 'agent-critic', name: 'Critical Auditor', group: 'Analytical', prompt: 'You are a critical auditor. Find weaknesses, edge cases, and logical fallacies. Leave no assumption unchecked. Provide concrete improvement suggestions.', temperature: 0.1, tools: ['vulnerability_scan', 'code_audit', 'threat_model'] },
  { id: 'agent-data', name: 'Data Scientist', group: 'Analytical', prompt: 'You are a data scientist. Base analysis on statistical reasoning and empirical evidence. Distinguish correlation from causation. Quantify uncertainty with confidence intervals.', temperature: 0.3, tools: ['data_analysis', 'visualization', 'web_search'] },
  { id: 'agent-research', name: 'Research Analyst', group: 'Analytical', prompt: 'You are a research analyst. Gather and synthesize information from multiple sources. Evaluate evidence quality. Flag uncertainty and conflicting findings.', temperature: 0.4, tools: ['web_search', 'summarize', 'document_query'] },
  { id: 'agent-quality', name: 'Quality Engineer', group: 'Technical', prompt: 'You are a quality engineer. Design testing strategies, identify coverage gaps, enforce quality gates. Consider unit, integration, e2e, and property-based testing.', temperature: 0.2, tools: ['code_interpreter', 'code_review', 'sandbox_exec'] },
  { id: 'agent-creative', name: 'Creative Visionary', group: 'Creative', prompt: 'You are a creative visionary. Generate novel ideas, think outside the box, and explore unconventional approaches. Use analogies and lateral thinking.', temperature: 0.8, tools: [] },
  { id: 'agent-designer', name: 'Product Designer', group: 'Creative', prompt: 'You are a product designer. Focus on user-centered design, interaction patterns, and visual hierarchy. Consider accessibility, consistency, and emotional impact.', temperature: 0.5, tools: [] },
  { id: 'agent-content', name: 'Content Strategist', group: 'Creative', prompt: 'You are a content strategist. Craft clear, engaging, and audience-appropriate content. Structure information for readability and impact.', temperature: 0.6, tools: ['web_search', 'summarize', 'document_query'] },
  { id: 'agent-ux', name: 'UX Researcher', group: 'Creative', prompt: 'You are a UX researcher. Analyze user behavior, identify pain points, and propose evidence-based improvements. Use heuristics and usability principles.', temperature: 0.35, tools: ['web_search', 'summarize', 'document_query'] },
  { id: 'agent-pm', name: 'Project Manager', group: 'Management', prompt: 'You are a project manager. Break down work into milestones, identify dependencies, assess resource needs, and track progress. Communicate clearly with stakeholders.', temperature: 0.3, tools: [] },
  { id: 'agent-po', name: 'Product Owner', group: 'Management', prompt: 'You are a product owner. Define requirements, prioritize the backlog by business value, and make scope trade-off decisions. Keep the team focused on delivering user value.', temperature: 0.3, tools: [] },
  { id: 'agent-lead', name: 'Team Lead', group: 'Management', prompt: 'You are a technical team lead. Guide development, mentor team members, unblock obstacles, and ensure code quality. Balance technical excellence with delivery velocity.', temperature: 0.25, tools: ['code_interpreter', 'code_review', 'sandbox_exec'] },
  { id: 'agent-writer', name: 'Technical Writer', group: 'Specialized', prompt: 'You are a technical writer. Document APIs, architecture decisions, and user guides. Write clearly, precisely, and for your target audience. Use consistent terminology.', temperature: 0.3, tools: ['web_search', 'summarize', 'document_query'] },
  { id: 'agent-doc-architect', name: 'Architect Agent', group: 'Documentation', prompt: 'You are a documentation architect. You describe system structure precisely, mapping code components to architectural concepts. You never invent features or layers that do not exist. Your output is accurate, structurally complete, and traceable to specific source files.', temperature: 0.1, tools: [] },
  { id: 'agent-doc-auditor', name: 'Auditor Agent', group: 'Documentation', prompt: 'You are a documentation auditor. Your only job is to find errors, inconsistencies, and contradictions in documentation. You cross-check every claim against the actual code structure. You have the authority to reject any statement that does not match the system. You are critical and precise.', temperature: 0.05, tools: [] },
  { id: 'agent-doc-simplifier', name: 'Simplifier Agent', group: 'Documentation', prompt: 'You are a documentation simplifier. You take complex technical descriptions and make them accessible without changing their meaning. You never add new concepts — you only clarify existing ones. You remove jargon, shorten sentences, and restructure for readability.', temperature: 0.3, tools: [] },
  { id: 'agent-doc-historian', name: 'Historian Agent', group: 'Documentation', prompt: 'You are a documentation historian. You provide narrative context for architectural decisions. You explain why the system evolved the way it did, what problems were solved at each stage, and how past decisions constrain future options. You connect changes across versions.', temperature: 0.4, tools: [] },
  { id: 'agent-doc-checker', name: 'Consistency Checker', group: 'Documentation', prompt: 'You are a consistency checker. Your job is to run the ConsistencyChecker service and report mismatches between documentation and code. You compare every documented file path, type name, interface, event, and method against the actual code manifest. You flag each unresolved reference with its source file and line number. You produce a structured report of passed and failed checks. You never modify the documentation — you only report discrepancies.', temperature: 0.1, tools: [] },
];

const GROUP_COLORS: Record<string, string> = {
  Technical: '#3b82f6', Analytical: '#a855f7', Creative: '#f59e0b',
  Management: '#06b6d4', Specialized: '#10b981', Documentation: '#8b5cf6',
};

function computeStats(agents: AgentPrompt[]): AgentPrompt[] {
  return agents.map(a => ({
    ...a,
    wordCount: a.prompt.split(/\s+/).length,
    hasTools: a.tools.length > 0,
    hasKeyTerms: /\b(?:must|never|always|only|every|any|all|none)\b/i.test(a.prompt),
    avgWordLen: a.prompt.split(/\s+/).reduce((s, w) => s + w.length, 0) / Math.max(1, a.prompt.split(/\s+/).length),
  }));
}

function jaccardSimilarity(a: string, b: string): number {
  const setA = new Set(a.toLowerCase().split(/\s+/));
  const setB = new Set(b.toLowerCase().split(/\s+/));
  const intersection = new Set([...setA].filter(x => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  return intersection.size / union.size;
}

const GROUP_ORDER = ['Technical', 'Analytical', 'Creative', 'Management', 'Specialized', 'Documentation'];

const PromptAudit: React.FC = () => {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'temp' | 'words'>('name');
  const [groupFilter, setGroupFilter] = useState<string>('all');
  const [liveAgents, setLiveAgents] = useState<AgentPrompt[] | null>(null);
  const [wsAttached, setWsAttached] = useState(workspaceService.isAttached());

  useEffect(() => {
    if (wsAttached) {
      workspaceService.readFile('src/kernel/state/topology-defaults.ts').then(content => {
        const parsed: AgentPrompt[] = [];
        const regex = /id:\s*'([^']+)'[^}]*label:\s*'([^']+)'[^}]*prompt:\s*'([^']+)'[^}]*temperature:\s*([\d.]+)[^}]*tools:\s*\[([^\]]*)\]/gs;
        let match;
        while ((match = regex.exec(content)) !== null) {
          const toolsStr = match[5].trim();
          const tools = toolsStr ? toolsStr.split(',').map(t => t.trim().replace(/['"]/g, '').replace(/\s+/g, ' ')).filter(Boolean) : [];
          const groupMatch = content.slice(0, match.index).match(/\/\/\s*─+\s*(\w+)\s/);
          const group = groupMatch?.[1] || 'Other';
          const groupMap: Record<string, string> = { Technical: 'Technical', Analytical: 'Analytical', Creative: 'Creative', Management: 'Management', Specialized: 'Specialized', Documentation: 'Documentation' };
          parsed.push({
            id: match[1], name: match[2], group: groupMap[group] || 'Other',
            prompt: match[3], temperature: parseFloat(match[4]), tools,
            wordCount: 0, hasTools: false, hasKeyTerms: false, avgWordLen: 0,
          });
        }
        if (parsed.length > 0) setLiveAgents(parsed);
      }).catch(() => {});
    }
  }, [wsAttached]);

  const agents = useMemo(() => computeStats(liveAgents || STATIC_AGENTS), [liveAgents]);

  const filtered = useMemo(() => {
    let list = agents;
    if (groupFilter !== 'all') list = list.filter(a => a.group === groupFilter);
    if (search) list = list.filter(a => a.name.toLowerCase().includes(search.toLowerCase()));
    return [...list].sort((a, b) => {
      if (sortBy === 'temp') return b.temperature - a.temperature;
      if (sortBy === 'words') return b.wordCount - a.wordCount;
      return a.name.localeCompare(b.name);
    });
  }, [agents, search, sortBy, groupFilter]);

  const collisions = useMemo(() => {
    const pairs: { a: string; b: string; sim: number }[] = [];
    for (let i = 0; i < agents.length; i++) {
      for (let j = i + 1; j < agents.length; j++) {
        const sim = jaccardSimilarity(agents[i].prompt, agents[j].prompt);
        if (sim > 0.5) pairs.push({ a: agents[i].name, b: agents[j].name, sim: Math.round(sim * 100) });
      }
    }
    return pairs.sort((a, b) => b.sim - a.sim);
  }, [agents]);

  const avgWords = useMemo(() => Math.round(agents.reduce((s, a) => s + a.wordCount, 0) / agents.length), [agents]);
  const withToolsCount = agents.filter(a => a.hasTools).length;
  const withKeyTerms = agents.filter(a => a.hasKeyTerms).length;
  const avgTemp = useMemo(() => agents.reduce((s, a) => s + a.temperature, 0) / agents.length, [agents]);

  const tempBuckets = useMemo(() => {
    const buckets = [
      { label: '0-0.2', min: 0, max: 0.2, agents: [] as string[], color: '#3b82f6' },
      { label: '0.2-0.4', min: 0.2, max: 0.4, agents: [] as string[], color: '#10b981' },
      { label: '0.4-0.6', min: 0.4, max: 0.6, agents: [] as string[], color: '#f59e0b' },
      { label: '0.6+', min: 0.6, max: 1, agents: [] as string[], color: '#ef4444' },
    ];
    for (const a of agents) {
      const b = buckets.find(b => a.temperature >= b.min && a.temperature < b.max) || buckets[buckets.length - 1];
      b.agents.push(a.name);
    }
    return buckets;
  }, [agents]);

  const groupCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const a of agents) counts[a.group] = (counts[a.group] || 0) + 1;
    return counts;
  }, [agents]);

  const mostCommonTools = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const a of agents) for (const t of a.tools) counts[t] = (counts[t] || 0) + 1;
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 10);
  }, [agents]);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ padding: '1.5rem 1.5rem 0.75rem', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <BookOpen size={20} color="#3b82f6" />
          <span style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc' }}>Prompt Audit</span>
          {wsAttached && liveAgents && <span style={{ fontSize: '0.65rem', color: '#10b981' }}>Live</span>}
        </div>
      </div>

      {/* Stat cards */}
      <div style={{ padding: '0.75rem 1.25rem', display: 'flex', gap: 8, flexWrap: 'wrap', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
        <div style={{ padding: '0.5rem 0.85rem', borderRadius: 8, background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', minWidth: 80 }}>
          <div style={{ fontSize: '1rem', fontWeight: 800, color: '#60a5fa' }}>{agents.length}</div>
          <div style={{ fontSize: '0.62rem', color: '#64748b' }}>Agents</div>
        </div>
        <div style={{ padding: '0.5rem 0.85rem', borderRadius: 8, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', minWidth: 80 }}>
          <div style={{ fontSize: '1rem', fontWeight: 800, color: '#f59e0b' }}>{avgWords}</div>
          <div style={{ fontSize: '0.62rem', color: '#64748b' }}>Avg words</div>
        </div>
        <div style={{ padding: '0.5rem 0.85rem', borderRadius: 8, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', minWidth: 80 }}>
          <div style={{ fontSize: '1rem', fontWeight: 800, color: '#10b981' }}>{withToolsCount}</div>
          <div style={{ fontSize: '0.62rem', color: '#64748b' }}>With tools</div>
        </div>
        <div style={{ padding: '0.5rem 0.85rem', borderRadius: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', minWidth: 80 }}>
          <div style={{ fontSize: '1rem', fontWeight: 800, color: '#ef4444' }}>{withKeyTerms}</div>
          <div style={{ fontSize: '0.62rem', color: '#64748b' }}>Constraints</div>
        </div>
        <div style={{ padding: '0.5rem 0.85rem', borderRadius: 8, background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.2)', minWidth: 80 }}>
          <div style={{ fontSize: '1rem', fontWeight: 800, color: '#a855f7' }}>{avgTemp.toFixed(2)}</div>
          <div style={{ fontSize: '0.62rem', color: '#64748b' }}>Avg temp</div>
        </div>
      </div>

      {/* Temperature distribution */}
      <div style={{ padding: '0.6rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: 5 }}>
          <Thermometer size={12} /> Temperature Distribution
        </div>
        <div style={{ display: 'flex', gap: 4, height: 24 }}>
          {tempBuckets.map(b => {
            const pct = agents.length > 0 ? (b.agents.length / agents.length) * 100 : 0;
            return (
              <div key={b.label} style={{ flex: `${pct}`, minWidth: pct > 0 ? 30 : 0, background: `${b.color}25`, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${b.color}30`, position: 'relative' }} title={b.agents.join(', ')}>
                <span style={{ fontSize: '0.6rem', color: b.color, fontWeight: 700 }}>{b.label} ({b.agents.length})</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Group distribution */}
      <div style={{ padding: '0.6rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: 5 }}>
          <Layers size={12} /> Groups
        </div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {GROUP_ORDER.filter(g => groupCounts[g]).map(g => {
            const pct = agents.length > 0 ? ((groupCounts[g] || 0) / agents.length) * 100 : 0;
            const color = GROUP_COLORS[g] || '#64748b';
            return (
              <div key={g} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '0.2rem 0.5rem', borderRadius: 5, background: `${color}10`, border: groupFilter === g ? `1px solid ${color}` : '1px solid transparent', cursor: 'pointer' }}
                onClick={() => setGroupFilter(groupFilter === g ? 'all' : g)}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: color }} />
                <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>{g}</span>
                <span style={{ fontSize: '0.62rem', color: '#64748b' }}>{groupCounts[g]} ({Math.round(pct)}%)</span>
              </div>
            );
          })}
          {groupFilter !== 'all' && (
            <button onClick={() => setGroupFilter('all')} style={{ background: 'none', border: 'none', color: '#60a5fa', cursor: 'pointer', fontSize: '0.65rem', padding: '0.2rem 0.4rem' }}>Clear</button>
          )}
        </div>
      </div>

      {/* Most common tools */}
      <div style={{ padding: '0.6rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: 5 }}>
          <Wrench size={12} /> Most Used Tools
        </div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {mostCommonTools.map(([tool, count]) => (
            <span key={tool} style={{ fontSize: '0.65rem', padding: '0.15rem 0.4rem', borderRadius: 3, background: 'rgba(16,185,129,0.12)', color: '#34d399', display: 'flex', alignItems: 'center', gap: 4 }}>
              {tool} <span style={{ color: '#64748b', fontSize: '0.6rem' }}>{count}x</span>
            </span>
          ))}
        </div>
      </div>

      {/* Controls */}
      <div style={{ padding: '0.5rem 1.25rem', display: 'flex', gap: 6, alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, flex: 1, background: 'rgba(0,0,0,0.3)', borderRadius: 6, padding: '4px 8px' }}>
          <Search size={12} color="#64748b" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Filter agents..." style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: '#e2e8f0', fontSize: '0.75rem' }} />
          {search && <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 0 }}><X size={10} /></button>}
        </div>
        <select value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)} style={{ padding: '0.3rem 0.5rem', borderRadius: 5, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.06)', color: '#94a3b8', fontSize: '0.7rem', outline: 'none' }}>
          <option value="name">Name</option>
          <option value="temp">Temperature</option>
          <option value="words">Length</option>
        </select>
      </div>

      {/* Agent list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0.6rem 1.25rem' }}>
        {filtered.map(a => {
          const tempColor = a.temperature < 0.2 ? '#3b82f6' : a.temperature < 0.4 ? '#10b981' : a.temperature < 0.6 ? '#f59e0b' : '#ef4444';
          return (
            <div key={a.id} style={{ marginBottom: '0.4rem', padding: '0.6rem 0.8rem', borderRadius: 8, background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.03)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: '0.3rem' }}>
                <div style={{ width: 3, height: 14, borderRadius: 2, background: GROUP_COLORS[a.group] || '#64748b' }} />
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#e2e8f0' }}>{a.name}</span>
                <span style={{ fontSize: '0.62rem', color: '#64748b', padding: '0.1rem 0.35rem', borderRadius: 3, background: 'rgba(255,255,255,0.04)' }}>{a.group}</span>
                <span style={{ fontSize: '0.62rem', color: tempColor, fontWeight: 600 }}>T:{a.temperature}</span>
                <span style={{ fontSize: '0.62rem', color: '#64748b' }}>{a.wordCount}w</span>
                {a.hasTools && <span style={{ fontSize: '0.6rem', padding: '0.1rem 0.3rem', borderRadius: 3, background: 'rgba(16,185,129,0.12)', color: '#10b981' }}>{a.tools.length}t</span>}
                {a.hasKeyTerms && <span style={{ fontSize: '0.6rem', padding: '0.1rem 0.3rem', borderRadius: 3, background: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}>C</span>}
              </div>
              <p style={{ margin: 0, fontSize: '0.72rem', color: '#94a3b8', lineHeight: 1.4 }}>{a.prompt}</p>
            </div>
          );
        })}
      </div>

      {/* Collisions */}
      {collisions.length > 0 && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '0.6rem 1.25rem', maxHeight: 150, overflowY: 'auto' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#f59e0b', marginBottom: '0.3rem', display: 'flex', alignItems: 'center', gap: 5 }}>
            <AlertTriangle size={12} /> {collisions.length} similar pairs ({'>'}50%)
          </div>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {collisions.map((c, i) => (
              <span key={i} style={{ fontSize: '0.65rem', padding: '0.15rem 0.4rem', borderRadius: 3, background: 'rgba(245,158,11,0.08)', color: '#d4a04a' }}>
                {c.a} ↔ {c.b} ({c.sim}%)
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PromptAudit;
