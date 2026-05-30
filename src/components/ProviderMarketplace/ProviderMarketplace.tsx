import React, { useState, useEffect } from 'react';
import { Star, TrendingUp, Zap, Shield, ThumbsUp, ThumbsDown, Minus, ExternalLink, Lightbulb, RefreshCcw } from 'lucide-react';
import { kernel } from '../../kernel/instances';
import PanelLoader from '../PanelLoader';
import { glassPanel, glassPanelPad15r, flexBetween, textXsMuted, progressBarSmall } from '../../styles/common';

interface ProviderRanking {
  provider: string; score: number; reliability: number; avgLatency: number; requests: number;
  costPerRequest: number; recommendation: 'recommended' | 'good' | 'fair' | 'avoid';
}

interface Suggestion {
  provider: string; reason: string; matchScore: number;
}

const PROVIDER_LOGOS: Record<string, string> = {
  openai: 'OpenAI', anthropic: 'Anthropic', gemini: 'Gemini', groq: 'Groq',
  nvidia: 'NVIDIA', openrouter: 'OpenRouter', deepseek: 'DeepSeek',
  mistral: 'Mistral', cohere: 'Cohere', cloudflare: 'Cloudflare',
  together: 'Together', fireworks: 'Fireworks', cerebras: 'Cerebras',
};

const PROVIDER_DESCS: Record<string, string> = {
  openai: 'GPT-4, GPT-4o series — best-in-class reasoning and coding',
  anthropic: 'Claude 3.5 — long context, safety-focused, strong reasoning',
  gemini: 'Google Gemini — multimodal, large context, competitive pricing',
  groq: 'LPU-powered inference — fastest open-source model serving',
  nvidia: 'NVIDIA NIM — self-hosted models, enterprise-grade inference',
  openrouter: 'Unified API to 200+ models across 20+ providers',
  deepseek: 'Cost-effective coding models, strong Mixture-of-Experts',
  mistral: 'Efficient open-source models with strong European data privacy',
  cohere: 'Enterprise RAG and classification, Command-R series',
  cloudflare: 'Workers AI — 300 RPM free, global edge inference',
  together: 'Open-source model hosting, fine-tuning API',
  fireworks: 'Fast open-source model serving, function calling support',
  cerebras: 'CS-3 wafer-scale — fastest inference for Llama models',
};

const ProviderMarketplace: React.FC = () => {
  const [rankings, setRankings] = useState<ProviderRanking[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 15000);
    return () => clearInterval(interval);
  }, []);

  const refresh = () => {
    const state = kernel.getState();
    setRankings(kernel.tracker.getProviderRankings(state));
    setSuggestions(kernel.tracker.getCollaborativeSuggestions(state));
  };

  const getRecBadge = (r: string) => {
    switch (r) {
      case 'recommended': return { label: 'Recommended', color: '#10b981', icon: <ThumbsUp size={12} /> };
      case 'good': return { label: 'Good', color: '#3b82f6', icon: <Minus size={12} /> };
      case 'fair': return { label: 'Fair', color: '#f59e0b', icon: <ThumbsDown size={12} /> };
      case 'avoid': return { label: 'Avoid', color: '#ef4444', icon: <ThumbsDown size={12} /> };
    }
  };

  const getScoreColor = (s: number) => s > 0.8 ? '#10b981' : s > 0.6 ? '#3b82f6' : s > 0.3 ? '#f59e0b' : '#ef4444';

  return (
    <PanelLoader title="Provider Marketplace">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 16, height: '100%', overflow: 'auto' }}>

        {suggestions.length > 0 && (
          <div className="glass-panel" style={{ ...glassPanelPad15r }}>
            <div style={{ ...flexBetween, marginBottom: 8 }}>
              <span style={{ fontSize: '0.85rem', color: '#e2e8f0', fontWeight: 600 }}>Suggestions</span>
              <Lightbulb size={16} style={{ color: '#f59e0b' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {suggestions.slice(0, 5).map(s => (
                <div key={s.provider} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#e4e4e7' }}>
                  <span style={{ fontWeight: 600, color: '#f59e0b', minWidth: 80 }}>{PROVIDER_LOGOS[s.provider] || s.provider}</span>
                  <span style={{ color: '#a1a1aa', flex: 1 }}>{s.reason}</span>
                  <span style={{ fontSize: 11, color: '#71717a' }}>{(s.matchScore * 100).toFixed(0)}% match</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
          {rankings.map(r => {
            const badge = getRecBadge(r.recommendation);
            return (
              <div key={r.provider} className="glass-panel" style={{ ...glassPanel, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={flexBetween}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontWeight: 700, color: '#e4e4e7', fontSize: 14 }}>{PROVIDER_LOGOS[r.provider] || r.provider}</span>
                    <span style={{ padding: '0.1rem 0.4rem', borderRadius: 999, fontSize: '0.65rem', fontWeight: 600, background: `${badge.color}20`, color: badge.color, display: 'flex', alignItems: 'center', gap: 3 }}>
                      {badge.icon} {badge.label}
                    </span>
                  </div>
                  <span style={{ fontSize: 20, fontWeight: 700, color: getScoreColor(r.score) }}>{(r.score * 100).toFixed(0)}</span>
                </div>

                <div style={{ fontSize: 11, color: '#71717a', lineHeight: 1.4 }}>{PROVIDER_DESCS[r.provider] || ''}</div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, fontSize: 11, color: '#a1a1aa' }}>
                  <span>Reliability: <strong style={{ color: '#e4e4e7' }}>{(r.reliability * 100).toFixed(0)}%</strong></span>
                  <span>Latency: <strong style={{ color: '#e4e4e7' }}>{r.avgLatency.toFixed(0)}ms</strong></span>
                  <span>Requests: <strong style={{ color: '#e4e4e7' }}>{r.requests}</strong></span>
                  <span>Cost/req: <strong style={{ color: '#e4e4e7' }}>${r.costPerRequest.toFixed(4)}</strong></span>
                </div>

                <div style={{ ...progressBarSmall }}>
                  <div style={{ ...progressBarSmall, width: `${r.score * 100}%`, background: getScoreColor(r.score) }} />
                </div>
              </div>
            );
          })}
        </div>

        {rankings.length === 0 && (
          <div className="glass-panel" style={{ ...glassPanelPad15r, textAlign: 'center', color: '#64748b', fontSize: 13 }}>
            No provider metrics yet. Start using providers to see rankings.
          </div>
        )}

      </div>
    </PanelLoader>
  );
};

export default ProviderMarketplace;
