import type { ISTopology } from '../contracts/topology';

export const AuditorTopology: ISTopology = {
  id: 'topo-auditor-001',
  version: '1.0.0',
  name: 'Secure Transaction Auditor',
  nodes: [
    {
      id: 'n1',
      type: 'router',
      label: 'Semantic Entry',
      config: { model: 'gpt-4o-mini', prompt: 'Classify audit depth.' }
    },
    {
      id: 'n2',
      type: 'agent',
      label: 'Data Collector',
      config: { model: 'claude-3-haiku', tools: ['sql_fetcher'] }
    },
    {
      id: 'n3',
      type: 'agent',
      label: 'Anomalies Analyst',
      config: { model: 'gpt-4o', prompt: 'Detect drift patterns.' }
    },
    {
      id: 'n4',
      type: 'guardrail',
      label: 'PII Scrubber',
      config: { action: 'redact' }
    }
  ],
  edges: [
    { id: 'e1', from: 'n1', to: 'n2', trigger: 'data_flow' },
    { id: 'e2', from: 'n2', to: 'n3', trigger: 'on_success' },
    { id: 'e3', from: 'n3', to: 'n4', trigger: 'data_flow' }
  ],
  policies: [
    {
      id: 'p1',
      type: 'privacy',
      target_nodes: ['all'],
      value: 'GDPR_STRICT',
      action: 'block'
    }
  ]
};
