import type { ISTopology } from '../contracts/topology';

const CODER_TOOLS = ['code_interpreter', 'code_review', 'sandbox_exec'];
const ANALYTICS_TOOLS = ['data_analysis', 'visualization', 'web_search'];
const SECURITY_TOOLS = ['vulnerability_scan', 'code_audit', 'threat_model'];
const SEARCH_TOOLS = ['web_search', 'summarize', 'document_query'];

export const AuditorTopology: ISTopology = {
  id: 'topo-workforce-001',
  version: '2.0.0',
  name: 'Agent Workforce',
  description: '20 specialized agents across technical, analytical, creative, management, and specialized domains. Router dispatches to relevant agents; aggregator synthesizes results.',
  nodes: [
    { id: 'router', type: 'router', label: 'Mission Router', config: { model: 'auto', routingPrompt: 'Classify the incoming task and route it to the most relevant specialized agents.' } },
    { id: 'aggregator', type: 'aggregator', label: 'Synthesis Aggregator', config: { prompt: 'Collect and synthesize outputs from all agents into a coherent final response.' } },

    // ── Technical (6) ──
    { id: 'agent-architect', type: 'agent', label: 'System Architect', config: { roleName: 'System Architect', prompt: 'You are a senior system architect. Focus on scalability, modularity, and clean architecture patterns. Evaluate trade-offs between monolith, microservices, and serverless.', temperature: 0.2, tools: CODER_TOOLS, model: 'auto' } },
    { id: 'agent-security', type: 'agent', label: 'Security Engineer', config: { roleName: 'Security Engineer', prompt: 'You are a security engineer. Identify threats, attack vectors, and security gaps. Apply defense-in-depth and least-privilege principles. Use STRIDE and OWASP Top 10.', temperature: 0.15, tools: SECURITY_TOOLS, model: 'auto' } },
    { id: 'agent-devops', type: 'agent', label: 'DevOps Engineer', config: { roleName: 'DevOps Engineer', prompt: 'You are a DevOps engineer. Design CI/CD pipelines, infrastructure-as-code, and deployment strategies. Focus on reliability, observability, and incident response.', temperature: 0.2, tools: CODER_TOOLS, model: 'auto' } },
    { id: 'agent-database', type: 'agent', label: 'Database Engineer', config: { roleName: 'Database Engineer', prompt: 'You are a database engineer. Design schemas, optimize queries, plan migrations. Consider indexing, sharding, replication, and ACID vs BASE trade-offs.', temperature: 0.2, tools: ['data_analysis', 'sql_executor'], model: 'auto' } },
    { id: 'agent-network', type: 'agent', label: 'Network Engineer', config: { roleName: 'Network Engineer', prompt: 'You are a network engineer. Evaluate communication protocols, topology design, and data flow. Focus on latency, throughput, and fault tolerance.', temperature: 0.2, tools: [], model: 'auto' } },
    { id: 'agent-perf', type: 'agent', label: 'Performance Engineer', config: { roleName: 'Performance Engineer', prompt: 'You are a performance engineer. Identify bottlenecks, measure throughput and latency. Propose concrete optimizations backed by data.', temperature: 0.25, tools: ['benchmark', 'profiler'], model: 'auto' } },

    // ── Analytical (5) ──
    { id: 'agent-critic', type: 'agent', label: 'Critical Auditor', config: { roleName: 'Critical Auditor', prompt: 'You are a critical auditor. Find weaknesses, edge cases, and logical fallacies. Leave no assumption unchecked. Provide concrete improvement suggestions.', temperature: 0.1, tools: SECURITY_TOOLS, model: 'auto' } },
    { id: 'agent-data', type: 'agent', label: 'Data Scientist', config: { roleName: 'Data Scientist', prompt: 'You are a data scientist. Base analysis on statistical reasoning and empirical evidence. Distinguish correlation from causation. Quantify uncertainty with confidence intervals.', temperature: 0.3, tools: ANALYTICS_TOOLS, model: 'auto' } },
    { id: 'agent-risk', type: 'agent', label: 'Risk Analyst', config: { roleName: 'Risk Analyst', prompt: 'You are a risk analyst. Categorize risks by probability and impact. Propose mitigation strategies using frameworks like STRIDE, DREAD, or FAIR.', temperature: 0.15, tools: ANALYTICS_TOOLS, model: 'auto' } },
    { id: 'agent-research', type: 'agent', label: 'Research Analyst', config: { roleName: 'Research Analyst', prompt: 'You are a research analyst. Gather and synthesize information from multiple sources. Evaluate evidence quality. Flag uncertainty and conflicting findings.', temperature: 0.4, tools: SEARCH_TOOLS, model: 'auto' } },
    { id: 'agent-quality', type: 'agent', label: 'Quality Engineer', config: { roleName: 'Quality Engineer', prompt: 'You are a quality engineer. Design testing strategies, identify coverage gaps, enforce quality gates. Consider unit, integration, e2e, and property-based testing.', temperature: 0.2, tools: CODER_TOOLS, model: 'auto' } },

    // ── Creative (4) ──
    { id: 'agent-creative', type: 'agent', label: 'Creative Visionary', config: { roleName: 'Creative Visionary', prompt: 'You are a creative visionary. Generate novel ideas, think outside the box, and explore unconventional approaches. Use analogies and lateral thinking.', temperature: 0.8, tools: [], model: 'auto' } },
    { id: 'agent-designer', type: 'agent', label: 'Product Designer', config: { roleName: 'Product Designer', prompt: 'You are a product designer. Focus on user-centered design, interaction patterns, and visual hierarchy. Consider accessibility, consistency, and emotional impact.', temperature: 0.5, tools: [], model: 'auto' } },
    { id: 'agent-content', type: 'agent', label: 'Content Strategist', config: { roleName: 'Content Strategist', prompt: 'You are a content strategist. Craft clear, engaging, and audience-appropriate content. Structure information for readability and impact.', temperature: 0.6, tools: SEARCH_TOOLS, model: 'auto' } },
    { id: 'agent-ux', type: 'agent', label: 'UX Researcher', config: { roleName: 'UX Researcher', prompt: 'You are a UX researcher. Analyze user behavior, identify pain points, and propose evidence-based improvements. Use heuristics and usability principles.', temperature: 0.35, tools: SEARCH_TOOLS, model: 'auto' } },

    // ── Management (3) ──
    { id: 'agent-pm', type: 'agent', label: 'Project Manager', config: { roleName: 'Project Manager', prompt: 'You are a project manager. Break down work into milestones, identify dependencies, assess resource needs, and track progress. Communicate clearly with stakeholders.', temperature: 0.3, tools: [], model: 'auto' } },
    { id: 'agent-po', type: 'agent', label: 'Product Owner', config: { roleName: 'Product Owner', prompt: 'You are a product owner. Define requirements, prioritize the backlog by business value, and make scope trade-off decisions. Keep the team focused on delivering user value.', temperature: 0.3, tools: [], model: 'auto' } },
    { id: 'agent-lead', type: 'agent', label: 'Team Lead', config: { roleName: 'Team Lead', prompt: 'You are a technical team lead. Guide development, mentor team members, unblock obstacles, and ensure code quality. Balance technical excellence with delivery velocity.', temperature: 0.25, tools: CODER_TOOLS, model: 'auto' } },

    // ── Specialized (2) ──
    { id: 'agent-writer', type: 'agent', label: 'Technical Writer', config: { roleName: 'Technical Writer', prompt: 'You are a technical writer. Document APIs, architecture decisions, and user guides. Write clearly, precisely, and for your target audience. Use consistent terminology.', temperature: 0.3, tools: SEARCH_TOOLS, model: 'auto' } },
    { id: 'agent-ethics', type: 'agent', label: 'Ethics Officer', config: { roleName: 'Ethics Officer', prompt: 'You are an ethics officer. Evaluate decisions for fairness, transparency, accountability, and bias. Flag ethical risks and propose responsible alternatives.', temperature: 0.2, tools: [], model: 'auto' } },
  ],
  edges: [
    { id: 'e-router-architect', from: 'router', to: 'agent-architect', trigger: 'data_flow' },
    { id: 'e-router-security', from: 'router', to: 'agent-security', trigger: 'data_flow' },
    { id: 'e-router-devops', from: 'router', to: 'agent-devops', trigger: 'data_flow' },
    { id: 'e-router-database', from: 'router', to: 'agent-database', trigger: 'data_flow' },
    { id: 'e-router-network', from: 'router', to: 'agent-network', trigger: 'data_flow' },
    { id: 'e-router-perf', from: 'router', to: 'agent-perf', trigger: 'data_flow' },
    { id: 'e-router-critic', from: 'router', to: 'agent-critic', trigger: 'data_flow' },
    { id: 'e-router-data', from: 'router', to: 'agent-data', trigger: 'data_flow' },
    { id: 'e-router-risk', from: 'router', to: 'agent-risk', trigger: 'data_flow' },
    { id: 'e-router-research', from: 'router', to: 'agent-research', trigger: 'data_flow' },
    { id: 'e-router-quality', from: 'router', to: 'agent-quality', trigger: 'data_flow' },
    { id: 'e-router-creative', from: 'router', to: 'agent-creative', trigger: 'data_flow' },
    { id: 'e-router-designer', from: 'router', to: 'agent-designer', trigger: 'data_flow' },
    { id: 'e-router-content', from: 'router', to: 'agent-content', trigger: 'data_flow' },
    { id: 'e-router-ux', from: 'router', to: 'agent-ux', trigger: 'data_flow' },
    { id: 'e-router-pm', from: 'router', to: 'agent-pm', trigger: 'data_flow' },
    { id: 'e-router-po', from: 'router', to: 'agent-po', trigger: 'data_flow' },
    { id: 'e-router-lead', from: 'router', to: 'agent-lead', trigger: 'data_flow' },
    { id: 'e-router-writer', from: 'router', to: 'agent-writer', trigger: 'data_flow' },
    { id: 'e-router-ethics', from: 'router', to: 'agent-ethics', trigger: 'data_flow' },

    // Agents → Aggregator
    { id: 'e-architect-agg', from: 'agent-architect', to: 'aggregator', trigger: 'on_success' },
    { id: 'e-security-agg', from: 'agent-security', to: 'aggregator', trigger: 'on_success' },
    { id: 'e-devops-agg', from: 'agent-devops', to: 'aggregator', trigger: 'on_success' },
    { id: 'e-database-agg', from: 'agent-database', to: 'aggregator', trigger: 'on_success' },
    { id: 'e-network-agg', from: 'agent-network', to: 'aggregator', trigger: 'on_success' },
    { id: 'e-perf-agg', from: 'agent-perf', to: 'aggregator', trigger: 'on_success' },
    { id: 'e-critic-agg', from: 'agent-critic', to: 'aggregator', trigger: 'on_success' },
    { id: 'e-data-agg', from: 'agent-data', to: 'aggregator', trigger: 'on_success' },
    { id: 'e-risk-agg', from: 'agent-risk', to: 'aggregator', trigger: 'on_success' },
    { id: 'e-research-agg', from: 'agent-research', to: 'aggregator', trigger: 'on_success' },
    { id: 'e-quality-agg', from: 'agent-quality', to: 'aggregator', trigger: 'on_success' },
    { id: 'e-creative-agg', from: 'agent-creative', to: 'aggregator', trigger: 'on_success' },
    { id: 'e-designer-agg', from: 'agent-designer', to: 'aggregator', trigger: 'on_success' },
    { id: 'e-content-agg', from: 'agent-content', to: 'aggregator', trigger: 'on_success' },
    { id: 'e-ux-agg', from: 'agent-ux', to: 'aggregator', trigger: 'on_success' },
    { id: 'e-pm-agg', from: 'agent-pm', to: 'aggregator', trigger: 'on_success' },
    { id: 'e-po-agg', from: 'agent-po', to: 'aggregator', trigger: 'on_success' },
    { id: 'e-lead-agg', from: 'agent-lead', to: 'aggregator', trigger: 'on_success' },
    { id: 'e-writer-agg', from: 'agent-writer', to: 'aggregator', trigger: 'on_success' },
    { id: 'e-ethics-agg', from: 'agent-ethics', to: 'aggregator', trigger: 'on_success' },
  ],
  policies: [],
};
