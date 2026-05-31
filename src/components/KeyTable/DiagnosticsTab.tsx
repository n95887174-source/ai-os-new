import React, { useMemo } from 'react';
import { AlertTriangle, Info, Zap, Shield, CheckCircle, Activity } from 'lucide-react';
import type { ApiKey } from '../../types/metrics';
import { advisorService, type DiagnosticFinding } from '../../kernel/instances';

interface DiagnosticsTabProps {
  apiKey: ApiKey;
}

const SEVERITY_CONFIG = {
  critical: { icon: <AlertTriangle size={18} />, color: '#ef4444', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.2)', label: 'Critical' },
  warning: { icon: <Zap size={18} />, color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)', label: 'Warning' },
  info: { icon: <Info size={18} />, color: '#3b82f6', bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.2)', label: 'Info' },
};

const DiagnosticsTab: React.FC<DiagnosticsTabProps> = ({ apiKey }) => {
  const findings = useMemo(() => advisorService.analyzeKey(apiKey.id) ?? [], [apiKey]);
  const summary = useMemo(() => advisorService.getDiagnosticSummary(findings), [findings]);
  const healthScore = useMemo(() => advisorService.getHealthScore(findings), [findings]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
        <div style={{ position: 'relative', width: 80, height: 80 }}>
          <svg width="80" height="80" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="35" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
            <circle
              cx="40" cy="40" r="35" fill="none"
              stroke={healthScore > 80 ? '#10b981' : healthScore > 50 ? '#f59e0b' : '#ef4444'}
              strokeWidth="6"
              strokeDasharray={`${(healthScore / 100) * 220} 220`}
              strokeLinecap="round"
              transform="rotate(-90 40 40)"
              style={{ transition: 'stroke-dasharray 0.5s' }}
            />
          </svg>
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#f8fafc' }}>{healthScore}</div>
            <div style={{ fontSize: '0.55rem', color: '#64748b', textTransform: 'uppercase' }}>Health</div>
          </div>
        </div>
        <div>
          <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#e2e8f0', marginBottom: '0.25rem' }}>Diagnostic Summary</div>
          <div style={{ fontSize: '0.8rem', color: '#94a3b8', lineHeight: 1.5 }}>{summary}</div>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', fontSize: '0.7rem' }}>
            <span style={{ color: '#ef4444' }}>{findings.filter(f => f.severity === 'critical').length} critical</span>
            <span style={{ color: '#f59e0b' }}>{findings.filter(f => f.severity === 'warning').length} warnings</span>
            <span style={{ color: '#3b82f6' }}>{findings.filter(f => f.severity === 'info').length} info</span>
          </div>
        </div>
      </div>

      {findings.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {findings.map((f, i) => {
            const cfg = SEVERITY_CONFIG[f.severity];
            return (
              <div
                key={`${f.category}-${i}`}
                style={{
                  padding: '1rem 1.25rem',
                  borderRadius: 12,
                  background: cfg.bg,
                  border: `1px solid ${cfg.border}`,
                  borderLeft: `4px solid ${cfg.color}`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                  <span style={{ color: cfg.color, flexShrink: 0, marginTop: 2 }}>{cfg.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f8fafc' }}>{f.message}</span>
                      <span style={{ padding: '0.15rem 0.4rem', borderRadius: 4, fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', background: `${cfg.color}20`, color: cfg.color }}>
                        {cfg.label}
                      </span>
                      <span style={{ padding: '0.15rem 0.4rem', borderRadius: 4, fontSize: '0.6rem', fontWeight: 700, background: 'rgba(255,255,255,0.05)', color: '#64748b' }}>
                        {f.category}
                      </span>
                      {f.metric && (
                        <span style={{ padding: '0.15rem 0.4rem', borderRadius: 4, fontSize: '0.6rem', fontFamily: 'monospace', background: 'rgba(0,0,0,0.2)', color: '#94a3b8' }}>
                          {f.metric}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#94a3b8', lineHeight: 1.6, marginBottom: '0.5rem' }}>
                      {f.explanation}
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', padding: '0.5rem 0.75rem', borderRadius: 8, background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.15)' }}>
                      <Activity size={14} color="#60a5fa" style={{ flexShrink: 0, marginTop: 2 }} />
                      <span style={{ fontSize: '0.75rem', color: '#cbd5e1', lineHeight: 1.4 }}>{f.suggestion}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
          <CheckCircle size={40} style={{ opacity: 0.3, marginBottom: '1rem' }} />
          <div style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>No Issues Found</div>
          <div style={{ fontSize: '0.85rem' }}>This key is operating within normal parameters.</div>
        </div>
      )}
      <div style={{ marginTop: '0.5rem', textAlign: 'center' }}>
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            const DOCS: Record<string, string> = {
              OpenRouter: 'https://openrouter.ai/keys', OpenAI: 'https://platform.openai.com/api-keys',
              Gemini: 'https://aistudio.google.com/app/apikey', Anthropic: 'https://console.anthropic.com/settings/keys',
              Groq: 'https://console.groq.com/keys', Mistral: 'https://console.mistral.ai/api-keys/',
              Together: 'https://api.together.xyz/settings/api-keys', Fireworks: 'https://fireworks.ai/account/api-keys',
              DeepSeek: 'https://platform.deepseek.com/api_keys', Cohere: 'https://dashboard.cohere.com/api-keys',
              HuggingFace: 'https://huggingface.co/settings/tokens', NVIDIA: 'https://build.nvidia.com/explore/discover',
              Cerebras: 'https://inference.cerebras.ai/', Cloudflare: 'https://developers.cloudflare.com/workers-ai/',
              Azure: 'https://portal.azure.com/',
            };
            const url = DOCS[apiKey.provider];
            if (url) window.open(url, '_blank', 'noopener,noreferrer');
          }}
          style={{ fontSize: '0.75rem', color: '#3b82f6', textDecoration: 'none' }}
        >
          View {apiKey.provider} documentation →
        </a>
      </div>
    </div>
  );
};

export default DiagnosticsTab;
