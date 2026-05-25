import React, { useState, useMemo } from 'react';
import { Plus, Zap, Shield, Sparkles, Bot, Globe, Search, CheckCircle2 } from 'lucide-react';
import ProviderIcon from '../ProviderIcon/ProviderIcon';
import { adapterRegistry } from '../../kernel/instances';
import type { ApiKey } from '../../types/metrics';

interface BrowseModelsViewProps {
  onAddProvider: (provider?: string) => void;
  installedKeys?: ApiKey[];
}

interface ProviderInfo {
  name: string;
  description: string;
  category: 'All' | 'Fast' | 'Enterprise' | 'Multimodal' | 'Open-Source';
  features: string[];
}

const PROVIDERS: ProviderInfo[] = [
  {
    name: 'OpenRouter',
    description: 'Access 200+ models from OpenAI, Anthropic, Meta and more through a single API.',
    category: 'All',
    features: ['Unified API', 'Price comparison', 'Fallback support']
  },
  {
    name: 'Gemini',
    description: "Google's latest multimodal AI models with strong reasoning and coding abilities.",
    category: 'Multimodal',
    features: ['Multimodal', 'Reasoning', 'Coding']
  },
  {
    name: 'Groq',
    description: 'Ultra-fast inference on open-source models with industry-leading speed.',
    category: 'Fast',
    features: ['Ultra-fast', 'Low latency', 'Open-source']
  },
  {
    name: 'NVIDIA',
    description: 'Enterprise-grade AI models optimized for performance on NVIDIA hardware.',
    category: 'Enterprise',
    features: ['Enterprise', 'Optimized', 'High performance']
  },
  {
    name: 'OpenAI',
    description: 'Industry-leading models like GPT-4, GPT-3.5, DALL-E and more.',
    category: 'All',
    features: ['GPT-4', 'DALL-E', 'Whisper']
  },
  {
    name: 'Mistral',
    description: 'Powerful open-source and proprietary models from Mistral AI.',
    category: 'Open-Source',
    features: ['Open-source', 'Mistral 7B', 'Mixtral']
  },
  {
    name: 'Cohere',
    description: 'Enterprise NLP models for text generation, classification, and embeddings.',
    category: 'Enterprise',
    features: ['Embeddings', 'Classification', 'RAG']
  },
  {
    name: 'Together',
    description: 'Fast inference on open-source models with fine-tuning.',
    category: 'Open-Source',
    features: ['Fast', 'Fine-tuning', 'Open-source']
  },
  {
    name: 'Fireworks',
    description: 'High-performance inference platform for generative AI.',
    category: 'Fast',
    features: ['High performance', 'Low cost', 'Open-source']
  },
  {
    name: 'DeepSeek',
    description: 'Chinese AI company with strong coding and reasoning models.',
    category: 'All',
    features: ['Coding', 'Reasoning', 'Chinese']
  },
  {
    name: 'Cerebras',
    description: '1M tok/day free tier with wafer-scale AI acceleration.',
    category: 'Fast',
    features: ['Fast inference', 'Free tier', 'CS-3']
  },
  {
    name: 'Cloudflare',
    description: 'Edge AI inference with Workers AI and many open models.',
    category: 'Open-Source',
    features: ['Edge', 'Free tier', 'Workers AI']
  },
  {
    name: 'Azure',
    description: 'Microsoft Azure OpenAI Service with enterprise security.',
    category: 'Enterprise',
    features: ['Enterprise', 'Security', 'Azure']
  },
  {
    name: 'HuggingFace',
    description: 'The AI community building the future of AI.',
    category: 'Open-Source',
    features: ['Open-source', 'Models', 'Datasets']
  },
  {
    name: 'Blackbox',
    description: 'AI-powered code completion and generation platform.',
    category: 'All',
    features: ['Code completion', 'Chat', 'Search']
  },
  {
    name: 'Scaleway',
    description: 'European cloud provider with GPU inference endpoints.',
    category: 'Enterprise',
    features: ['GPU', 'Inference', 'European cloud']
  },
  {
    name: 'GitHub',
    description: 'GitHub Models — access to leading AI models via Azure.',
    category: 'Enterprise',
    features: ['Models', 'Azure', 'Codespaces']
  },
];

const CATEGORIES = ['All', 'Fast', 'Enterprise', 'Multimodal', 'Open-Source'] as const;

const BrowseModelsView: React.FC<BrowseModelsViewProps> = ({ onAddProvider, installedKeys = [] }) => {
  const [activeCategory, setActiveCategory] = useState<typeof CATEGORIES[number]>('All');
  const [searchQuery, setSearchQuery] = useState('');

  const installedProviders = useMemo(() =>
    new Set(installedKeys.map(k => k.provider.toLowerCase())), [installedKeys]);

  const availableFromRegistry = useMemo(() =>
    new Set(adapterRegistry.getAllProviders?.() ?? []), []);

  const enrichedProviders = useMemo(() =>
    PROVIDERS.map(p => ({
      ...p,
      isInstalled: installedProviders.has(p.name.toLowerCase()),
      hasAdapter: availableFromRegistry.has(p.name.toLowerCase()),
    })), [installedProviders, availableFromRegistry]);

  const filteredProviders = enrichedProviders.filter(p =>
    (activeCategory === 'All' || p.category === activeCategory) &&
    (p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.features.some(f => f.toLowerCase().includes(searchQuery.toLowerCase()))) &&
    (!searchQuery || p.hasAdapter || p.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="provider-search-wrapper" style={{ marginBottom: '0.5rem' }}>
        <Search className="provider-search-icon" size={18} />
        <input
          type="text"
          placeholder="Search providers, models, or features..."
          aria-label="Search providers"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="provider-search-input"
        />
      </div>
      <div className="provider-browse-categories">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`provider-browse-category ${activeCategory === cat ? 'provider-browse-category--active' : 'provider-browse-category--inactive'}`}
          >
            {cat === 'Fast' && <Zap size={14} />}
            {cat === 'Enterprise' && <Shield size={14} />}
            {cat === 'Multimodal' && <Sparkles size={14} />}
            {cat === 'Open-Source' && <Bot size={14} />}
            {cat === 'All' && <Globe size={14} />}
            {cat}
          </button>
        ))}
      </div>

      <div className="provider-browse-grid">
        {filteredProviders.map(provider => (
          <div key={provider.name} className={`glass-panel provider-browse-card${provider.isInstalled ? ' provider-browse-card--installed' : ''}`}>
            <div className="provider-inline-flex" style={{ gap: '1rem', marginBottom: '0.5rem' }}>
              <div className="provider-icon-box">
                <ProviderIcon provider={provider.name} size={24} />
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>
                  {provider.name}
                  {provider.isInstalled && <CheckCircle2 size={14} color="#10b981" style={{ marginLeft: 8 }} aria-label="Installed" />}
                </h3>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{provider.category}</span>
              </div>
            </div>
            <p className="provider-browse-desc">{provider.description}</p>
            <div className="provider-browse-features">
              {provider.features.map((feat, i) => (
                <span key={i} className="provider-browse-feature">{feat}</span>
              ))}
            </div>
            <button className="btn-primary provider-browse-btn" onClick={() => onAddProvider(provider.name)} aria-label={`Configure ${provider.name}`}
              style={provider.isInstalled ? { opacity: 0.5, cursor: 'default' } : {}} disabled={provider.isInstalled}>
              <Plus size={16} /> {provider.isInstalled ? 'Already Configured' : `Configure ${provider.name}`}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BrowseModelsView;
