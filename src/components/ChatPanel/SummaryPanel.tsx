import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { ChevronDown, ChevronRight, Loader2, Sparkles, Tag } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { chatSummarizerService } from '../../kernel/instances';
import type { ChatSummary } from '../../kernel/services/chat-summarizer-service';
import { useTranslation } from '../../i18n/useTranslation';
import { glassPanel, flexCenterGap3, textXsMuted } from '../../styles/common';

interface SummaryPanelProps {
  sessionId: string;
  messageCount: number;
}

const SummaryPanel: React.FC<SummaryPanelProps> = memo(({ sessionId, messageCount }) => {
  const { t } = useTranslation();
  const [summary, setSummary] = useState<ChatSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const existing = chatSummarizerService.getSummary(sessionId);
    if (!cancelled && isMountedRef.current) setSummary(existing ?? null);
    return () => { cancelled = true; };
  }, [sessionId]);

  const handleSummarize = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const s = await chatSummarizerService.manualSummarize(sessionId, []);
      if (isMountedRef.current && s) setSummary(s);
    } catch (err) {
      console.warn('[SummaryPanel] Summarization failed:', err);
      if (isMountedRef.current) setError(t('summary.error'));
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }, [sessionId, t]);

  if (messageCount < 30 && !summary) {
    return (
      <div style={{ padding: '0.5rem 1rem', marginBottom: '0.5rem' }}>
        <div style={{ ...glassPanel, padding: '0.6rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Sparkles size={13} color="var(--text-muted)" style={{ opacity: 0.5 }} />
          <span style={{ ...textXsMuted, fontSize: '0.72rem' }}>
            {t('summary.hint').replace('{count}', String(30 - messageCount))}
          </span>
        </div>
      </div>
    );
  }

  if (summary) {
    return (
      <div style={{ padding: '0 1rem', marginBottom: '0.5rem' }}>
        <div style={{ ...glassPanel, padding: 0, overflow: 'hidden' }}>
          <button
            onClick={() => setExpanded(!expanded)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '0.6rem 1rem', background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-main)',
            }}
          >
            <div style={{ ...flexCenterGap3 }}>
              <Sparkles size={13} color="#a855f7" />
              <span style={{ fontSize: '0.78rem', fontWeight: 700 }}>{t('summary.title')}</span>
              <span style={{ ...textXsMuted, fontSize: '0.65rem' }}>
                {t('summary.messages_covered').replace('{count}', String(summary.messageCount))}
              </span>
            </div>
            {expanded ? <ChevronDown size={14} color="var(--text-muted)" /> : <ChevronRight size={14} color="var(--text-muted)" />}
          </button>

          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                style={{ overflow: 'hidden' }}
              >
                <div style={{ padding: '0 1rem 0.8rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  <p style={{ fontSize: '0.8rem', lineHeight: 1.6, color: 'var(--text-muted)', margin: '0.6rem 0' }}>
                    {summary.summary}
                  </p>

                  {summary.keyFacts.length > 0 && (
                    <div style={{ marginTop: '0.5rem' }}>
                      <div style={{ ...flexCenterGap3, marginBottom: '0.4rem' }}>
                        <Tag size={11} color="var(--text-muted)" />
                        <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          {t('summary.key_facts')}
                        </span>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                        {summary.keyFacts.map((fact: string, i: number) => (
                          <span
                            key={i}
                            style={{
                              padding: '0.2rem 0.55rem', borderRadius: 100,
                              background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.15)',
                              fontSize: '0.68rem', color: '#c084fc', fontWeight: 500,
                            }}
                          >
                            {fact}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '0 1rem', marginBottom: '0.5rem' }}>
      <div style={{ ...glassPanel, padding: '0.6rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ ...flexCenterGap3 }}>
          <Sparkles size={13} color="var(--text-muted)" />
          <span style={{ ...textXsMuted, fontSize: '0.72rem' }}>
            {t('summary.available').replace('{count}', String(messageCount))}
          </span>
        </div>
        <button
          onClick={handleSummarize}
          disabled={loading}
          style={{
            padding: '0.3rem 0.75rem', borderRadius: 8,
            background: 'rgba(168,85,247,0.12)', border: '1px solid rgba(168,85,247,0.2)',
            color: '#c084fc', fontSize: '0.72rem', fontWeight: 700, cursor: loading ? 'wait' : 'pointer',
            display: 'flex', alignItems: 'center', gap: 6,
          }}
        >
          {loading ? <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} /> : <Sparkles size={11} />}
          {t('summary.summarize')}
        </button>
      </div>
      {error && (
        <div style={{ fontSize: '0.68rem', color: '#ef4444', padding: '0.3rem 0.5rem' }}>{error}</div>
      )}
    </div>
  );
});

SummaryPanel.displayName = 'SummaryPanel';

export default SummaryPanel;
