import React from 'react';
import { Plus } from 'lucide-react';
import ProviderIcon from '../ProviderIcon/ProviderIcon';

interface BrowseModelsViewProps {
  onAddProvider: () => void;
}

const PROVIDER_DESCRIPTIONS: Record<string, string> = {
  OpenRouter: 'Access 200+ models from OpenAI, Anthropic, Meta and more through a single API.',
  Gemini: "Google's latest multimodal AI models with strong reasoning and coding abilities.",
  Groq: 'Ultra-fast inference on open-source models with industry-leading speed.',
  NVIDIA: 'Enterprise-grade AI models optimized for performance on NVIDIA hardware.',
};

const BrowseModelsView: React.FC<BrowseModelsViewProps> = ({ onAddProvider }) => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
    {Object.entries(PROVIDER_DESCRIPTIONS).map(([name, desc]) => (
      <div key={name} className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)' }}>
            <ProviderIcon provider={name} size={24} />
          </div>
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>{name}</h3>
        </div>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5, margin: 0, flex: 1 }}>{desc}</p>
        <button className="btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={onAddProvider}>
          <Plus size={16} /> Configure {name}
        </button>
      </div>
    ))}
  </div>
);

export default BrowseModelsView;
