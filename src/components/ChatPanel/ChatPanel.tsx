import { storageAdapter } from '../../kernel/instances';
import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { 
  Send, Square, Zap, Loader2, AlertCircle, CheckCircle2, 
  Activity, ChevronRight, Package,
  ShieldAlert, 
  BrainCircuit,
  Plus, MessageSquare, Trash2, GitFork,
  Bookmark, Split, Layout, Settings,
  AlertTriangle, X, RefreshCw, Search, ThumbsUp, ThumbsDown, Edit3, CornerDownRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { eventBus, EVENTS } from '../../kernel/events/event-bus';
import type { ChatResponse } from '../../types/chat';
import { useKeyList } from '../../stores/useKeyStore';
import { useChatStore, useActiveSessionHistory } from '../../stores/useChatStore';
// legacy migration: decode old XOR-obfuscated values from localStorage
const decodeLegacyObfuscated = (encoded: string): string | null => {
  try {
    const chars = atob(encoded).split('');
    return chars.map((c, i) => String.fromCharCode(c.charCodeAt(0) ^ (i % 256))).join('');
  } catch { return null; }
};
import { routerService, probeService, chatSummarizerService } from '../../kernel/instances';
import type { ProbeResult } from '../../kernel/contracts/probe';
import ProviderIcon from '../ProviderIcon/ProviderIcon';
import { MarkdownRenderer } from './MarkdownRenderer';
import { VoiceButton } from './VoiceButton';
import { PersonaSelector } from './PersonaSelector';
import ModuleInfo from '../ModuleInfo/ModuleInfo';
import SummaryPanel from './SummaryPanel';
import { useAutoClearError } from '../../hooks/useAutoClearError';
import { useTranslation } from '../../i18n/useTranslation';
 
import { errorCard, flex1, flexCenterGap2, flexCenterGap3, flexCenterGap4, flexCenterGap6px, flexCenterSmGap, flexCol, iconBtnMuted, posRelative, textCenter, toastBase } from '../../styles/common';
const PROVIDER_COLORS: Record<string, string> = {
  OpenRouter: '#60a5fa',
  Gemini:     '#c084fc',
  Groq:       '#34d399',
  NVIDIA:     '#fbbf24',
};

const DEFAULT_MODELS: Record<string, string> = {
  OpenRouter: 'openai/gpt-4o',
  Gemini:     'gemini-3.1-flash-lite',
  Groq:       'llama-3.3-70b-versatile',
  NVIDIA:     'meta/llama-3.3-70b-instruct',
};

type ExecutionMode = 'auto' | 'parallel' | 'single';

function formatTime(ts: number, t: (key: string) => string): string {
  const d = new Date(ts);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const yesterday = new Date(now); yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return t('chat.yesterday_prefix') + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function groupSessions(sessions: { id: string; title: string; updatedAt: number }[], t: (key: string) => string): { label: string; sessions: typeof sessions }[] {
  const now = new Date();
  const today = now.toDateString();
  const yesterday = new Date(now); yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toDateString();
  const weekAgo = new Date(now); weekAgo.setDate(weekAgo.getDate() - 7);

  const groups: Record<string, { label: string; sessions: typeof sessions }> = {
    today: { label: t('chat.session_group_today'), sessions: [] },
    yesterday: { label: t('chat.session_group_yesterday'), sessions: [] },
    week: { label: t('chat.session_group_week'), sessions: [] },
    earlier: { label: t('chat.session_group_earlier'), sessions: [] },
  };

  for (const s of sessions) {
    const d = new Date(s.updatedAt).toDateString();
    if (d === today) groups.today.sessions.push(s);
    else if (d === yesterdayStr) groups.yesterday.sessions.push(s);
    else if (s.updatedAt >= weekAgo.getTime()) groups.week.sessions.push(s);
    else groups.earlier.sessions.push(s);
  }

  return Object.values(groups).filter(g => g.sessions.length > 0);
}

const ResponseCard = memo<{
  res: ChatResponse;
  entryId: string;
  onFork?: (entryId: string) => void;
  onRegenerate?: (entryId: string) => void;
}>(({ res, entryId, onFork, onRegenerate }) => {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null);
  const color = PROVIDER_COLORS[res?.provider] || '#94a3b8';
  const isStreaming = res.status === 'loading' || res.status === 'streaming';

  const handleCopy = useCallback(() => {
    if (!res) return;
    navigator.clipboard.writeText(res.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [res]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: 'rgba(255,255,255,0.025)',
        border: `1px solid rgba(255,255,255,0.07)`,
        borderLeft: `3px solid ${color}`,
        borderRadius: 12,
        padding: '1.2rem',
        marginTop: '0.75rem',
        position: 'relative',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div style={{ padding: 6, borderRadius: 8, background: 'rgba(255,255,255,0.03)' }}>
            <ProviderIcon provider={res.provider} size={16} />
          </div>
          <div style={flexCol}>
            <div style={flexCenterGap6px}>
              <span style={{ fontWeight: 700, fontSize: '0.9rem', color }}>{res.provider}</span>
              {isStreaming && <Loader2 size={12} color={color} style={{ animation: 'spin 1s linear infinite' }} />}
              {res.status === 'error' && <AlertCircle size={12} color="#ef4444" />}
              {res.status === 'streaming' && (
                <span style={{ fontSize: '0.6rem', color, background: `${color}20`, padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>{t('chat.live')}</span>
              )}
            </div>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>{res.model}</span>
          </div>
        </div>
        <div style={flexCenterGap3}>
          {res.latency > 0 && (
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: 4 }}>{res.latency}{t('chat.latency_ms')}</span>
          )}
          {res.status === 'done' && (
            <div style={{ display: 'flex', gap: '0.25rem' }}>
              <button onClick={() => setFeedback(feedback === 'up' ? null : 'up')} title={t('chat.helpful')} aria-label={t('chat.helpful_aria')} style={{ background: 'none', border: 'none', color: feedback === 'up' ? '#10b981' : 'var(--text-muted)', cursor: 'pointer', padding: 4 }}>
                <ThumbsUp size={13} aria-hidden="true" />
              </button>
              <button onClick={() => setFeedback(feedback === 'down' ? null : 'down')} title={t('chat.not_helpful')} aria-label={t('chat.not_helpful_aria')} style={{ background: 'none', border: 'none', color: feedback === 'down' ? '#ef4444' : 'var(--text-muted)', cursor: 'pointer', padding: 4 }}>
                <ThumbsDown size={13} aria-hidden="true" />
              </button>
               <button onClick={() => onFork?.(entryId)} title={t('chat.fork_title')} aria-label={t('chat.fork_aria')} style={iconBtnMuted}>
                <GitFork size={14} aria-hidden="true" />
              </button>
              <button onClick={handleCopy} title={t('chat.copy_title')} aria-label={t('chat.copy_aria')} style={iconBtnMuted}>
                {copied ? <CheckCircle2 size={14} color="#10b981" /> : <Package size={14} />}
              </button>
              {onRegenerate && (
                <button onClick={() => onRegenerate?.(entryId)} title={t('chat.regenerate_title')} aria-label={t('chat.regenerate_aria')} style={iconBtnMuted}>
                  <RefreshCw size={14} aria-hidden="true" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {res.status === 'loading' && !res.content && (
        <div style={{ display: 'flex', gap: 4, padding: '0.5rem 0' }}>
          {[0,1,2].map(i => (
            <motion.div key={i} animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: i * 0.2 }}
              style={{ width: 6, height: 6, borderRadius: '50%', background: color }} />
          ))}
        </div>
      )}

      {(res.status === 'streaming' || (res.status === 'loading' && res.content) || res.status === 'done') && res.content && (
        <>
          <MarkdownRenderer content={res.content} />
          {isStreaming && (
            <motion.span
              animate={{ opacity: [1, 0] }}
              transition={{ repeat: Infinity, duration: 0.8 }}
              style={{ display: 'inline-block', width: 8, height: 16, background: color, marginLeft: 2, borderRadius: 1, verticalAlign: 'middle' }}
            />
          )}
          {isStreaming && (
            <div style={{ marginTop: '0.5rem', display: 'flex', gap: '1rem', alignItems: 'center', fontSize: '0.65rem', color: 'var(--text-muted)', opacity: 0.6 }}>
              <span style={flexCenterSmGap}><Activity size={10} color="#a855f7" /> ~{Math.round((res.content?.length || 0) / 4)} {t('chat.tokens_label')}</span>
              <span style={flexCenterSmGap}><ChevronRight size={10} /> {(res.tps || 0).toFixed(1) || '—'} {t('chat.tokens_per_sec')}</span>
            </div>
          )}
          {res.status === 'done' && (
            <div style={{ marginTop: '1rem', paddingTop: '0.8rem', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: '1.5rem', alignItems: 'center', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              <span style={flexCenterSmGap}><Zap size={12} color={color} /> {res.ttft || res.latency}{t('chat.latency_ms')} {t('chat.ttft_label')}</span>
              <span style={flexCenterSmGap}><Activity size={12} color="#a855f7" /> ~{Math.round((res.content?.length || 0) / 4)} {t('chat.tokens_label')}</span>
              <span style={flexCenterSmGap}><ChevronRight size={12} /> {res.tps?.toFixed(1) || '—'} {t('chat.tokens_per_sec')}</span>
            </div>
          )}
        </>
      )}

      {res.status === 'error' && (
        <div style={errorCard}>
          {res.error}
          {onRegenerate && (
            <div style={{ marginTop: '0.5rem' }}>
              <button onClick={() => onRegenerate?.(entryId)} style={{ padding: '0.3rem 0.75rem', borderRadius: 6, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#fca5a5', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600 }}>
                {t('common.retry')}
              </button>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
});

const ChatPanel: React.FC = () => {
  const { keys, activeKeys } = useKeyList();
  const {
    isSending, sendMessage, clearHistory, cancelSending,
    sessions, activeSessionId, setActiveSessionId, createSession, deleteSession, forkSession, editEntry,
    hasMoreSessions, loadMoreSessions, getSessionConfig, switchModel, switchKey
  } = useChatStore();
  const history = useActiveSessionHistory();
  
  const [mode, setMode] = useState<ExecutionMode>('single');
  const [selectedKeys, setSelectedKeys] = useState<string[]>(() =>
    activeKeys.length > 0 ? [activeKeys[0].id] : []
  );
  const [selectedModel, setSelectedModel] = useState<string>(() =>
    activeKeys[0]?.availableModels?.[0] || DEFAULT_MODELS[activeKeys[0]?.provider || ''] || ''
  );
  const [selectedModelPerKey, setSelectedModelPerKey] = useState<Record<string, string>>(() =>
    activeKeys[0] ? { [activeKeys[0].id]: activeKeys[0]?.availableModels?.[0] || DEFAULT_MODELS[activeKeys[0].provider] || '' } : {}
  );
  const { t } = useTranslation();
  const [input, setInput] = useState('');
  const [showSidebar, setShowSidebar] = useState(true);
  const [isSplitView, setIsSplitView] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const editingEntryIdRef = useRef<string | null>(null);
  const lastEditedEntryIdRef = useRef<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [undoText, setUndoText] = useState<string | null>(null);
  const [isScrolledUp, setIsScrolledUp] = useState(false);
  const [visibleCount, setVisibleCount] = useState(50);
  const [systemPrompt, setSystemPrompt] = useState('');
  const [showSystemPrompt, setShowSystemPrompt] = useState(false);
  const [temperature, setTemperature] = useState<number>(0.7);
  const [maxTokens, setMaxTokens] = useState<number>(4096);
  const [chatProbes, setChatProbes] = useState<Map<string, ProbeResult>>(new Map());
  const [chatProbeLoading, setChatProbeLoading] = useState<string | null>(null);
  const lastPromptRef = useRef('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  const selectedKey = selectedKeys[0] ? keys.find(k => k.id === selectedKeys[0]) : undefined;
  
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isMountedRef = useRef(true);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const clearError = useAutoClearError(setError);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const handler = ({ provider, model, keyId }: { provider: string; model: string; keyId: string }) => {
      if (!isMountedRef.current) return;
      try {
        setMode('single');
        setSelectedKeys([keyId]);
        setSelectedModel(model);
        setIsSplitView(false);
        createSession(`Chat with ${provider} (${model.split('/').pop()})`);
        setError(null);
      } catch (e) {
        console.warn('[ChatPanel] Failed to create chat session:', e);
        if (isMountedRef.current) { setError(t('chat.error_create_chat_session')); clearError(); }
      }
    };
    const unsub = eventBus.on(EVENTS.START_CHAT_WITH_TARGET, handler);
    return () => unsub();
  }, [createSession, clearError]);

  useEffect(() => {
    const handler = ({ provider, model }: { provider: string; model: string }) => {
      if (!isMountedRef.current) return;
      try {
        const key = keys.find(k => k.provider === provider);
        if (!key) { setError(t('chat.error_no_key_for_provider').replace('{0}', provider)); clearError(); return; }
        setMode('single');
        setSelectedKeys([key.id]);
        setSelectedModel(model);
        setIsSplitView(false);
        createSession(`Chat with ${provider} (${model.split('/').pop()})`);
        setError(null);
      } catch (e) {
        console.warn('[ChatPanel] Failed to apply model selection:', e);
        if (isMountedRef.current) { setError(t('chat.error_apply_model_selection')); clearError(); }
      }
    };
    const unsub = eventBus.on(EVENTS.SELECT_MODEL, handler);
    return () => unsub();
  }, [keys, createSession, clearError]);

  useEffect(() => {
    if (!isMountedRef.current) return;
    setSelectedModelPerKey(prev => {
      const newMap: Record<string, string> = {};
      let changed = false;
      const ids = new Set(activeKeys.map(k => k.id));
      for (const id of ids) {
        const existing = prev[id];
        const next = existing || activeKeys.find(k => k.id === id)?.availableModels?.[0] || DEFAULT_MODELS[activeKeys.find(k => k.id === id)?.provider || ''] || '';
        newMap[id] = next;
        if (existing !== next) changed = true;
      }
      if (!changed && Object.keys(prev).every(id => ids.has(id))) return prev;
      return newMap;
    });
    setSelectedKeys(prev => {
      if (prev.length === 0) return activeKeys.length > 0 ? [activeKeys[0].id] : [];
      const valid = prev.filter(id => activeKeys.some(k => k.id === id));
      return valid.length > 0 ? valid : (activeKeys.length > 0 ? [activeKeys[0].id] : []);
    });
  }, [activeKeys]);

  const isStreamingRef = useRef(false);

  useEffect(() => {
    isStreamingRef.current = isSending;
  }, [isSending]);

  useEffect(() => {
    if (!isStreamingRef.current && !isScrolledUp) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, isScrolledUp]);

  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
    setIsScrolledUp(!atBottom);
  }, []);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isSending) return;
    if (!isMountedRef.current) return;
    if (activeKeys.length === 0) { setError(t('chat.error_no_active_keys')); clearError(); return; }
    setError(null);
    try {
      let targets: { provider: string; model: string; keyId?: string }[] = [];
      if (isSplitView && selectedKeys.length >= 2) {
        targets = selectedKeys.map(id => {
          const k = keys.find(key => key.id === id);
          return { provider: k?.provider || '', model: selectedModelPerKey[id] || k?.availableModels?.[0] || DEFAULT_MODELS[k?.provider || ''] || '', keyId: k?.id };
        });
      } else if (mode === 'single') {
        const firstKeyId = selectedKeys[0];
        const k = firstKeyId ? keys.find(key => key.id === firstKeyId) : activeKeys[0];
        if (!k) return;
        targets = [{ provider: k.provider, model: selectedModelPerKey[k.id] || selectedModel || k.availableModels?.[0] || DEFAULT_MODELS[k.provider] || '', keyId: k.id }];
      } else if (mode === 'parallel') {
        targets = activeKeys.map(k => ({ provider: k.provider, model: selectedModelPerKey[k.id] || k.availableModels?.[0] || DEFAULT_MODELS[k.provider] || '', keyId: k.id }));
      } else {
        const sessionConfig = getSessionConfig?.();
        if (sessionConfig?.provider && sessionConfig?.model) {
          targets = [{ provider: sessionConfig.provider, model: sessionConfig.model, keyId: sessionConfig.keyId }];
        } else {
          const ranked = routerService.getRankedProviders('latency', text);
          const best = ranked && ranked[0];
          if (best) targets = [{ provider: best.provider, model: best.stats?.lastModel || best.availableModels?.[0] || DEFAULT_MODELS[best.provider] || '', keyId: best.id }];
        }
      }
      if (targets.length === 0) return;
      storageAdapter.setItem('lastPrompt', text);
      lastPromptRef.current = text;
      await sendMessage(targets, text, systemPrompt || undefined, temperature, maxTokens);
      if (isMountedRef.current) {
        setInput('');
        const newCount = history.length + 1;
        if (newCount >= 30 && newCount % 30 === 0) {
          const msgs = history.flatMap((e) => [
            { id: `${e.id}:user`, role: 'user' as const, content: e.text, timestamp: e.timestamp },
            ...e.responses.map((r, i) => ({
              id: `${e.id}:assistant:${i}`,
              role: 'assistant' as const,
              content: r.content,
              timestamp: e.timestamp,
            })),
          ]);
          void chatSummarizerService.autoSummarize(activeSessionId || 'default', msgs);
        }
      }
    } catch (e) {
      console.warn('[ChatPanel] Failed to send message:', e);
      if (isMountedRef.current) { setError(t('chat.error_send_message')); clearError(); }
    }
  }, [input, isSending, isSplitView, selectedKeys, keys, activeKeys, mode, selectedModelPerKey, selectedModel, sendMessage, clearError, systemPrompt, temperature, maxTokens]);

  const handleRegenerate = useCallback(async (entryId: string) => {
    const entry = history.find(h => h.id === entryId);
    if (!entry || !entry.text) return;
    if (!isMountedRef.current) return;
    setError(null);
    try {
      let targets: { provider: string; model: string; keyId?: string }[] = [];
      if (isSplitView && selectedKeys.length >= 2) {
        targets = selectedKeys.map(id => {
          const k = keys.find(key => key.id === id);
          return { provider: k?.provider || '', model: selectedModelPerKey[id] || k?.availableModels?.[0] || DEFAULT_MODELS[k?.provider || ''] || '', keyId: k?.id };
        });
      } else if (mode === 'single') {
        const firstKeyId = selectedKeys[0];
        const k = firstKeyId ? keys.find(key => key.id === firstKeyId) : activeKeys[0];
        if (!k) return;
        targets = [{ provider: k.provider, model: selectedModelPerKey[k.id] || selectedModel || k.availableModels?.[0] || DEFAULT_MODELS[k.provider] || '', keyId: k.id }];
      } else if (mode === 'parallel') {
        targets = activeKeys.map(k => ({ provider: k.provider, model: selectedModelPerKey[k.id] || k.availableModels?.[0] || DEFAULT_MODELS[k.provider] || '', keyId: k.id }));
      } else {
        const sessionConfig = getSessionConfig?.();
        if (sessionConfig?.provider && sessionConfig?.model) {
          targets = [{ provider: sessionConfig.provider, model: sessionConfig.model, keyId: sessionConfig.keyId }];
        } else {
          const ranked = routerService.getRankedProviders('latency', entry.text);
          const best = ranked && ranked[0];
          if (best) targets = [{ provider: best.provider, model: best.stats?.lastModel || best.availableModels?.[0] || DEFAULT_MODELS[best.provider] || '', keyId: best.id }];
        }
      }
      if (targets.length === 0) return;
      await sendMessage(targets, entry.text, systemPrompt || undefined, temperature, maxTokens);
    } catch (e) {
      console.warn('[ChatPanel] Failed to regenerate response:', e);
      if (isMountedRef.current) { setError(t('chat.error_regenerate')); clearError(); }
    }
  }, [history, isSplitView, selectedKeys, keys, activeKeys, mode, selectedModelPerKey, selectedModel, sendMessage, clearError, systemPrompt, temperature, maxTokens]);

  const handleCreateSession = useCallback(() => {
    try { createSession(); setError(null); } catch (e) { console.warn('[ChatPanel] Failed to create session:', e); setError(t('chat.error_create_session')); clearError(); }
  }, [createSession, clearError]);

  const handleDeleteSession = useCallback((sessionId: string) => {
    try { deleteSession(sessionId); setError(null); } catch (e) { console.warn('[ChatPanel] Failed to delete session:', e); setError(t('chat.error_delete_session')); clearError(); }
  }, [deleteSession, clearError]);

  const handleClearHistory = useCallback(() => {
    try { clearHistory(); setError(null); } catch (e) { console.warn('[ChatPanel] Failed to clear history:', e); setError(t('chat.error_clear_history')); clearError(); }
  }, [clearHistory, clearError]);

  const handleForkSession = useCallback((entryId: string) => {
    try { forkSession(entryId); setError(null); } catch (e) { console.warn('[ChatPanel] Failed to fork session:', e); setError(t('chat.error_fork_session')); clearError(); }
  }, [forkSession, clearError]);

  const toggleSplitView = useCallback(() => {
    if (activeKeys.length < 2) { setError(t('chat.error_comparison_needs_two')); clearError(); return; }
    setError(null);
    setIsSplitView(prev => !prev);
    if (!isSplitView && selectedKeys.length < 2 && activeKeys.length >= 2) {
      const secondId = activeKeys.find(k => k.id !== selectedKeys[0])?.id;
      if (secondId && selectedKeys[0]) setSelectedKeys([selectedKeys[0], secondId]);
    }
  }, [activeKeys, isSplitView, selectedKeys, clearError]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }, [handleSend]);

  const toggleKeySelection = useCallback((id: string) => {
    if (!isMountedRef.current) return;
    const key = keys.find(k => k.id === id);
    if (!key || key.status !== 'active') { setError(t('chat.error_provider_not_active').replace('{0}', key?.label || id)); clearError(); return; }
    setSelectedKeys(prev => {
      if (!Array.isArray(prev) || prev.length === 0) return [id];
      let newKeys;
      if (prev.includes(id)) {
        if (prev.length === 1) return prev;
        newKeys = prev.filter(k => k !== id);
      } else {
        if (isSplitView && prev.length >= 2) newKeys = [prev[0]!, id];
        else if (isSplitView && prev.length === 1) newKeys = [prev[0]!, id];
        else newKeys = [id];
      }
      return newKeys;
    });
    const selectedKeyObj = keys.find(k => k.id === id);
    if (selectedKeyObj) {
      const model = selectedModelPerKey[selectedKeyObj.id] || selectedKeyObj.availableModels?.[0] || DEFAULT_MODELS[selectedKeyObj.provider] || '';
      setSelectedModel(model);
      switchKey?.(id);
      switchModel?.(selectedKeyObj.provider, model);
    }
  }, [keys, isSplitView, selectedModelPerKey, clearError]);

  const startEditing = useCallback((entryId: string, text: string) => {
    setEditingEntryId(entryId);
    editingEntryIdRef.current = entryId;
    setEditingText(text);
    setUndoText(null);
  }, []);

  const cancelEditing = useCallback(() => {
    setEditingEntryId(null);
    editingEntryIdRef.current = null;
    setEditingText('');
  }, []);

  const saveEditing = useCallback(() => {
    const id = editingEntryIdRef.current;
    if (!id || !editingText.trim()) return;
    const prevText = history.find(h => h.id === id)?.text || '';
    lastEditedEntryIdRef.current = id;
    editEntry(id, editingText.trim());
    cancelEditing();
    setUndoText(prevText);
    setTimeout(() => setUndoText(null), 5000);
  }, [editingText, editEntry, cancelEditing, history]);

  const handleUndoEdit = useCallback(() => {
    const text = undoText;
    if (!text) return;
    const targetId = lastEditedEntryIdRef.current || history[history.length - 1]?.id;
    if (!targetId) return;
    editEntry(targetId, text);
    setUndoText(null);
  }, [undoText, editEntry, history]);

  const filteredSessions = searchQuery
    ? sessions.filter(s => {
        const q = searchQuery.toLowerCase();
        if (s.title.toLowerCase().includes(q)) return true;
        return s.history.some(e => {
          if (e.text.toLowerCase().includes(q)) return true;
          return e.responses.some(r => r.content.toLowerCase().includes(q));
        });
      })
    : sessions;

  const groupedSessions = groupSessions(filteredSessions, t);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 200) + 'px';
    }
  }, [input]);

  const cancelSendingRef = useRef(cancelSending);
  useEffect(() => { cancelSendingRef.current = cancelSending; }, [cancelSending]);

  useEffect(() => {
    const saved = storageAdapter.getItem('lastPrompt');
    if (saved) lastPromptRef.current = decodeLegacyObfuscated(saved) || saved;
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'Z') {
        const saved = storageAdapter.getItem('lastPrompt');
        if (saved) { setInput(decodeLegacyObfuscated(saved) || saved); e.preventDefault(); }
      }
      if (e.ctrlKey && e.shiftKey && e.key === 'F') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === 'Escape') {
        if (isSending) { cancelSendingRef.current(); e.preventDefault(); }
        else (document.activeElement as HTMLElement)?.blur();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isSending]);

  if (activeKeys.length === 0) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1.5rem', opacity: 0.8 }}>
         <div style={{ background: 'rgba(239,68,68,0.1)', padding: '2.5rem', borderRadius: '50%', border: '1px solid rgba(239,68,68,0.2)' }}>
          <ShieldAlert size={64} color="#ef4444" />
         </div>
         <div style={textCenter}>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.75rem', color: 'var(--text-main)' }}>{t('chat.no_providers_title')}</h3>
            <p style={{ fontSize: '1rem', maxWidth: 400, color: 'var(--text-muted)', lineHeight: 1.6 }}>{t('chat.no_providers_desc')}</p>
            <button className="btn-primary" style={{ marginTop: '1.5rem' }} onClick={() => eventBus.emit(EVENTS.NAVIGATE, 'keys')}>{t('chat.configure_providers')}</button>
         </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flex: 1, minHeight: 0, gap: '0.5rem', position: 'relative', background: 'var(--bg-main)', color: 'var(--text-main)' }}>
      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            style={{ ...toastBase, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#fca5a5' }}
            role="alert" aria-live="polite"
          >
            <AlertTriangle size={14} aria-hidden="true" /> {error}
            <button onClick={() => setError(null)} style={{ cursor: 'pointer', marginLeft: 'auto', background: 'none', border: 'none', color: 'inherit' }} aria-label={t('common.dismiss_error')}>
              <X size={14} aria-hidden="true" />
            </button>
          </motion.div>
        )}
        {undoText && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            style={{ ...toastBase, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: '#34d399' }}
            role="status" aria-live="polite"
          >
            <span>{t('chat.message_edited')}</span>
            <button onClick={handleUndoEdit} style={{ cursor: 'pointer', padding: '2px 8px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6, color: 'inherit', fontWeight: 700, fontSize: '0.8rem' }}>{t('common.undo')}</button>
            <button onClick={() => setUndoText(null)} style={{ cursor: 'pointer', background: 'none', border: 'none', color: 'inherit' }} aria-label={t('common.dismiss')}>
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSidebar && (
          <motion.div 
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            style={{ display: 'flex', flexDirection: 'column', background: 'rgba(255,255,255,0.02)', borderRight: '1px solid var(--border)', alignSelf: 'stretch' }}
          >
            <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <button onClick={handleCreateSession} className="btn-primary" style={{ width: '100%', justifyContent: 'center', borderRadius: 12, padding: '0.75rem' }} aria-label={t('chat.new_conversation_aria')}>
                <Plus size={16} aria-hidden="true" /> {t('chat.new_conversation')}
              </button>
              <div style={posRelative}>
                <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} aria-hidden="true" />
                <input
                  ref={searchInputRef}
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder={t('chat.search_sessions')}
                  style={{ width: '100%', padding: '0.5rem 0.75rem 0.5rem 2rem', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-main)', fontSize: '0.8rem', outline: 'none' }}
                />
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem' }}>
              {groupedSessions.length === 0 && searchQuery && (
                <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>{t('chat.no_sessions_found')}</div>
              )}
              {groupedSessions.map(group => (
                <div key={group.label} style={{ marginBottom: '0.75rem' }}>
                  <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', padding: '0 0.5rem 0.5rem', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{group.label}</div>
                  {group.sessions.map(s => (
                    <div 
                      key={s.id}
                      onClick={() => setActiveSessionId(s.id)}
                      style={{ 
                        padding: '0.8rem 1rem', borderRadius: 12, cursor: 'pointer', marginBottom: '0.3rem',
                        background: activeSessionId === s.id ? 'rgba(59,130,246,0.12)' : 'transparent',
                        border: activeSessionId === s.id ? '1px solid rgba(59,130,246,0.2)' : '1px solid transparent',
                        display: 'flex', alignItems: 'center', gap: '0.8rem', transition: 'all 0.2s',
                        position: 'relative', overflow: 'hidden'
                      }}
                      role="button" tabIndex={0}
                      aria-label={t('chat.switch_session_aria').replace('{0}', s.title)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setActiveSessionId(s.id); }}
                    >
                      <MessageSquare size={16} color={activeSessionId === s.id ? '#3b82f6' : 'var(--text-muted)'} aria-hidden="true" />
                      <div style={{ flex: 1, overflow: 'hidden' }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: activeSessionId === s.id ? 700 : 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.title}</div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 2 }}>{formatTime(s.updatedAt, t)}</div>
                      </div>
                      {activeSessionId === s.id && (
                        <button onClick={(e) => { e.stopPropagation(); handleDeleteSession(s.id); }} style={{ ...iconBtnMuted, opacity: 0.6 }} aria-label={t('chat.delete_session_aria').replace('{0}', s.title)}>
                          <Trash2 size={14} aria-hidden="true" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ))}
              {hasMoreSessions && (
                <div style={{ textAlign: 'center', padding: '0.75rem' }}>
                  <button onClick={loadMoreSessions} style={{ padding: '0.4rem 1rem', borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: '0.7rem', cursor: 'pointer', fontWeight: 600, width: '100%' }}>
                    {t('chat.load_more')}
                  </button>
                </div>
              )}
            </div>

            <div style={{ padding: '1rem', borderTop: '1px solid var(--border)', background: 'rgba(0,0,0,0.1)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem' }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(45deg, #3b82f6, #8b5cf6)' }} aria-hidden="true" />
                <div style={flex1}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>{t('chat.operator_label')}</div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{t('chat.pro_account')}</div>
                </div>
                <button onClick={() => eventBus.emit(EVENTS.NAVIGATE, 'settings')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }} aria-label={t('chat.settings_aria')}>
                  <Settings size={14} aria-hidden="true" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, background: 'transparent' }}>
        <div style={{ flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.01)', backdropFilter: 'blur(10px)' }}>
          <div style={flexCenterGap4}>
            <button onClick={() => setShowSidebar(!showSidebar)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: 8, padding: 6, color: 'var(--text-muted)', cursor: 'pointer' }} aria-label={showSidebar ? t('chat.hide_sidebar_aria') : t('chat.show_sidebar_aria')}>
              <Layout size={18} aria-hidden="true" />
            </button>
            <div>
              <div style={{ fontSize: '1rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
                  {sessions.find(s => s.id === activeSessionId)?.title || t('chat.default_session_title')}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} aria-hidden="true" />
                {t('chat.engine_status').replace('{0}', String(activeKeys.length))}
              </div>
            </div>
          </div>

          <div style={flexCenterGap3}>
            <button 
              onClick={toggleSplitView}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0.5rem 0.8rem', borderRadius: 10, border: '1px solid var(--border)', fontSize: '0.8rem', fontWeight: 700, background: isSplitView ? 'rgba(59,130,246,0.1)' : 'var(--bg-panel)', color: isSplitView ? '#3b82f6' : 'var(--text-muted)', cursor: 'pointer', transition: 'all 0.2s' }}
              aria-label={isSplitView ? t('chat.comparison_mode_disable_aria') : t('chat.comparison_mode_enable_aria')}
            >
              <Split size={16} aria-hidden="true" />
              {t('chat.comparison_mode')}
            </button>
            <div style={{ width: 1, height: 20, background: 'var(--border)' }} aria-hidden="true" />
            <button onClick={handleClearHistory} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }} aria-label={t('chat.clear_history_aria')}>
              <Trash2 size={18} aria-hidden="true" />
            </button>
          </div>
        </div>

        <div style={{ flexShrink: 0, padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', background: 'rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{t('chat.select_provider_model')}</span>
          {Object.entries(
            activeKeys.reduce((acc, k) => {
              (acc[k.provider] ??= []).push(k);
              return acc;
            }, {} as Record<string, typeof activeKeys>)
          ).map(([provider, providerKeys]) => (
            <div key={provider} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 90, fontSize: '0.75rem', fontWeight: 800, color: PROVIDER_COLORS[provider] || '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                <ProviderIcon provider={provider} size={14} /> {provider}
              </div>
              {providerKeys.map(k => {
                const chatProbe = chatProbes.get(k.id);
                return (
                  <div key={k.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0.5rem 0.75rem', borderRadius: 16, background: selectedKeys.includes(k.id) ? `${PROVIDER_COLORS[k.provider] || '#3b82f6'}20` : 'rgba(255,255,255,0.05)', border: `2px solid ${selectedKeys.includes(k.id) ? (PROVIDER_COLORS[k.provider] || '#3b82f6') + '50' : 'rgba(255,255,255,0.1)'}`, transition: 'all 0.2s' }}>
                    <button 
                      onClick={() => toggleKeySelection(k.id)} 
                      style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', background: 'none', border: 'none', color: selectedKeys.includes(k.id) ? (PROVIDER_COLORS[k.provider] || '#3b82f6') : 'var(--text-muted)', fontWeight: 700, fontSize: '0.85rem', padding: 0 }}
                      aria-pressed={selectedKeys.includes(k.id)}
                      aria-label={t('chat.select_provider_aria').replace('{0}', k.label)}
                    >
                      {k.label}
                    </button>
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        setChatProbeLoading(k.id);
                        try {
                          const result = await probeService.probeKey(k.id);
                          if (!isMountedRef.current) return;
                          setChatProbes(prev => { const m = new Map(prev); m.set(k.id, result); return m; });
                        } finally {
                          if (isMountedRef.current) setChatProbeLoading(null);
                        }
                      }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569', display: 'flex', alignItems: 'center', padding: 2, fontSize: '0.7rem' }}
                      title={t('chat.quick_test')}
                    >
                      {chatProbeLoading === k.id ? <Loader2 size={10} className="spinning" /> : chatProbe ? <div style={{ width: 6, height: 6, borderRadius: '50%', background: chatProbe.status === 'ready' ? '#10b981' : chatProbe.status === 'broken' ? '#ef4444' : '#f59e0b' }} /> : <Activity size={10} color="#475569" />}
                    </button>
                    {chatProbe && (
                      <span style={{ fontSize: '0.68rem', color: chatProbe.status === 'ready' ? '#10b981' : chatProbe.status === 'broken' ? '#ef4444' : '#f59e0b', maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 1 }}>
                        {chatProbe.status === 'ready' ? `${chatProbe.latency}ms` : chatProbe.error?.slice(0, 15)}
                      </span>
                    )}
                    {selectedKeys.includes(k.id) && (
                      <select
                        value={selectedModelPerKey[k.id] || k.availableModels?.[0] || DEFAULT_MODELS[k.provider] || ''}
                        onChange={(e) => {
                          setSelectedModelPerKey(prev => ({ ...prev, [k.id]: e.target.value }));
                          if (selectedKeys[0] === k.id) setSelectedModel(e.target.value);
                          switchModel?.(k.provider, e.target.value);
                        }}
                        aria-label={t('chat.model_for_aria').replace('{0}', k.label)}
                        style={{ background: 'rgba(0,0,0,0.4)', border: '2px solid rgba(255,255,255,0.15)', borderRadius: 10, color: 'white', fontSize: '0.8rem', padding: '0.35rem 0.6rem', cursor: 'pointer', outline: 'none', minWidth: 160 }}
                      >
                        {(k.availableModels || []).map(model => (
                          <option key={model} value={model}>{model}</option>
                        ))}
                      </select>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        <div ref={scrollContainerRef} onScroll={handleScroll} style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '1.5rem 2rem', scrollBehavior: 'smooth', display: 'flex', flexDirection: 'column', position: 'relative' }}>
          {history.length > 0 && (
            <SummaryPanel sessionId={activeSessionId || 'default'} messageCount={history.length} />
          )}
          {history.length === 0 && (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '2rem' }}>
              <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={posRelative}>
                <div style={{ position: 'absolute', inset: -20, background: 'radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%)', borderRadius: '50%' }} aria-hidden="true" />
                <BrainCircuit size={80} color="#3b82f6" style={{ filter: 'drop-shadow(0 0 20px rgba(59,130,246,0.3))' }} aria-hidden="true" />
              </motion.div>
              <div style={{ textAlign: 'center', maxWidth: 500 }}>
                <h2 style={{ fontSize: '1.75rem', fontWeight: 900, marginBottom: '1rem', letterSpacing: '-0.03em' }}>{t('chat.greeting_title')}</h2>
                <p style={{ fontSize: '1rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>{t('chat.greeting_desc_full')}</p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', width: '100%', maxWidth: 500, marginBottom: '1.5rem' }}>
                {[
                  { icon: <Zap size={16} />, label: t('chat.suggestion_fast_execution'), desc: t('chat.suggestion_fast_execution_desc') },
                  { icon: <BrainCircuit size={16} />, label: t('chat.suggestion_deep_reasoning'), desc: t('chat.suggestion_deep_reasoning_desc') },
                ].map((tip, i) => (
                  <div key={i} className="glass-panel" style={{ padding: '1.25rem', borderRadius: 16, cursor: 'pointer', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, fontWeight: 700, fontSize: '0.9rem' }}>{tip.icon} {tip.label}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{tip.desc}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', justifyContent: 'center', maxWidth: 600 }}>
                {(() => {
                  const providers = [...new Set(activeKeys.map(k => k.provider))];
                  const suggestions = providers.length > 0
                    ? [
                        t('chat.suggestion_ask_about').replace('{0}', providers[0]).replace('{1}', providers.length > 1 ? providers[1] : t('chat.itself')),
                        t('chat.suggestion_explain_quantum'),
                        t('chat.suggestion_write_poem'),
                        t('chat.suggestion_compare').replace('{0}', providers[0]).replace('{1}', providers.length > 1 ? providers[1] : providers[0])
                      ]
                    : [t('chat.quick_reply_quantum'), t('chat.quick_reply_fibonacci'), t('chat.quick_reply_trip'), t('chat.quick_reply_news')];
                  return suggestions;
                })().map((quickReply, idx) => (
                  <button key={idx} onClick={() => { setInput(quickReply); inputRef.current?.focus(); }} aria-label={t('chat.quick_reply_aria').replace('{0}', quickReply)}
                    style={{ padding: '0.75rem 1.25rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 100, fontSize: '0.85rem', color: 'var(--text-muted)', cursor: 'pointer', transition: 'all 0.2s' }}
                  >{quickReply}</button>
                ))}
              </div>
            </div>
          )}

          {history.length > visibleCount && (
            <div style={{ textAlign: 'center', padding: '0.5rem', marginBottom: '0.5rem' }}>
              <button onClick={() => setVisibleCount(c => Math.min(c + 50, history.length))}
                style={{ padding: '0.4rem 1rem', borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600 }}>
                {t('chat.load_earlier').replace('{count}', String(Math.min(50, history.length - visibleCount))).replace('{remaining}', String(history.length - visibleCount))}
              </button>
            </div>
          )}
          {history.slice(-visibleCount).map((entry, entryIdx) => (
            entry.role === 'system' ? (
              <div key={entry.id} style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem', flexShrink: 0 }}>
                <div style={{ padding: '0.35rem 1rem', borderRadius: 12, background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.15)', fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 500, fontStyle: 'italic' }}>
                  {entry.text}
                </div>
              </div>
            ) : (
            <div key={entry.id} style={{ marginBottom: '3rem', position: 'relative', flexShrink: 0 }}>
              {entry.parentId && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: '0.5rem', padding: '0.3rem 0.75rem', background: 'rgba(168,85,247,0.06)', border: '1px solid rgba(168,85,247,0.12)', borderRadius: 8, fontSize: '0.7rem', color: '#a855f7', fontWeight: 600 }}>
                  <CornerDownRight size={12} aria-hidden="true" />
                  {t('chat.forked_from')}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.75rem', maxWidth: '75%' }}>
                  {editingEntryId === entry.id ? (
                    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <textarea
                        value={editingText}
                        onChange={e => setEditingText(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveEditing(); } if (e.key === 'Escape') cancelEditing(); }}
                        style={{ width: '100%', padding: '0.75rem 1rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 12, color: 'var(--text-main)', fontSize: '1rem', outline: 'none', resize: 'none', fontFamily: 'inherit', lineHeight: 1.6 }}
                        autoFocus
                      />
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <button onClick={cancelEditing} style={{ padding: '0.4rem 0.8rem', borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>{t('common.cancel')}</button>
                        <button onClick={saveEditing} className="btn-primary" style={{ padding: '0.4rem 0.8rem', borderRadius: 8, fontSize: '0.8rem', fontWeight: 600 }}>{t('common.save')}</button>
                      </div>
                    </div>
                  ) : (
                    <div style={{
                      padding: '1rem 1.5rem',
                      background: 'var(--bg-panel)',
                      border: '1px solid var(--border)',
                      borderRadius: '24px 24px 4px 24px',
                      fontSize: '1rem', lineHeight: 1.6, color: 'var(--text-main)',
                      boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
                      position: 'relative',
                      cursor: 'pointer',
                    }}
                      onClick={() => startEditing(entry.id, entry.text)}
                      title={t('chat.click_to_edit')}
                    >
                      <MarkdownRenderer content={entry.text} />
                      <div style={{ position: 'absolute', top: 8, right: 8, opacity: 0, transition: 'opacity 0.2s', background: 'rgba(0,0,0,0.4)', padding: 3, borderRadius: 4 }}
                        className="edit-message-hover"
                      >
                        <Edit3 size={12} color="var(--text-muted)" />
                      </div>
                    </div>
                  )}
                  <style>{`.edit-message-hover { opacity: 0; } div:hover > .edit-message-hover { opacity: 1; }`}</style>
                  <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginTop: 2, opacity: 0.6 }}>{formatTime(entry.timestamp, t)}</span>
                  
                  {entry.recalledMemories && entry.recalledMemories.length > 0 && (
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      {entry.recalledMemories.map((m, idx) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.3rem 0.75rem', background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.15)', borderRadius: 100, fontSize: '0.7rem', color: '#a855f7', fontWeight: 600 }}>
                          <Bookmark size={10} aria-hidden="true" />
                          <span>{t('chat.knowledge_recall_label').replace('{0}', m.content.substring(0, 30))}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              
              {entry.responses.length > 0 && entryIdx > 0 && (
                <div style={{ position: 'absolute', left: -8, top: 0, bottom: 0, width: 2, background: 'rgba(255,255,255,0.06)', borderRadius: 1 }} aria-hidden="true" />
              )}

              <div style={{ display: 'grid', gridTemplateColumns: isSplitView ? '1fr 1fr' : '1fr', gap: '1.5rem', alignItems: 'start' }}>
                {entry.responses.map((res, j) => (
                  <ResponseCard key={`${entry.id}-${res.id}-${j}`} res={res} entryId={entry.id} onFork={handleForkSession} onRegenerate={handleRegenerate} />
                ))}
              </div>
            </div>
            )
          ))}
          <div ref={bottomRef} />
          {isScrolledUp && (
            <button onClick={() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); setIsScrolledUp(false); }}
              style={{ position: 'sticky', bottom: 8, alignSelf: 'center', padding: '0.4rem 1rem', borderRadius: 20, background: '#3b82f6', border: 'none', color: 'white', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 15px rgba(59,130,246,0.4)', zIndex: 10 }}>
              {t('chat.scroll_to_bottom')}
            </button>
          )}
          {history.length > 0 && <div style={{ flexShrink: 0 }}><ModuleInfo moduleKey="chat" /></div>}
        </div>

        <div style={{ flexShrink: 0, padding: '0 2rem 2rem', position: 'relative' }}>
          <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: 24, padding: '0.75rem 1rem', boxShadow: '0 20px 40px rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0 0.5rem' }}>
              <div style={{ display: 'flex', gap: 4 }}>
                {isSplitView ? (
                  <div style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6', fontSize: '0.7rem', fontWeight: 800, padding: '2px 8px', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Split size={10} aria-hidden="true" /> {t('chat.split_view_label')}
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: 2, background: 'rgba(0,0,0,0.2)', borderRadius: 8, padding: 2 }}>
                    {(['auto', 'parallel', 'single'] as ExecutionMode[]).map(m => (
                      <button key={m} onClick={() => setMode(m)}
                        style={{ padding: '3px 8px', borderRadius: 6, border: 'none', background: mode === m ? 'rgba(59,130,246,0.3)' : 'transparent', color: mode === m ? '#60a5fa' : 'var(--text-muted)', fontSize: '0.65rem', fontWeight: 800, cursor: 'pointer', textTransform: 'uppercase' }}
                        aria-label={`${t('chat.mode_' + m)} ${t('chat.mode_suffix')}`}
                      >{m}</button>
                    ))}
                  </div>
                )}
              </div>
              <div style={{ width: 1, height: 12, background: 'var(--border)' }} aria-hidden="true" />
              <div style={{ flex: 1, fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                {isSplitView ? t('chat.comparing_models').replace('{0}', String(selectedKeys.length)) : t('chat.executing_via').replace('{0}', selectedKey?.label || t('chat.mode_auto'))}
              </div>
              <button onClick={() => setShowSystemPrompt(!showSystemPrompt)}
                style={{ padding: '3px 8px', borderRadius: 6, border: '1px solid var(--border)', background: showSystemPrompt ? 'rgba(59,130,246,0.1)' : 'transparent', color: showSystemPrompt ? '#60a5fa' : 'var(--text-muted)', fontSize: '0.65rem', fontWeight: 700, cursor: 'pointer' }}
                aria-label={t('chat.options_aria')}
              >{t('common.options')}</button>
            </div>
            {showSystemPrompt && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '0.5rem' }}>
                <textarea
                  value={systemPrompt}
                  onChange={e => setSystemPrompt(e.target.value)}
                  placeholder={t('chat.system_prompt_placeholder')}
                  rows={2}
                  style={{ width: '100%', padding: '0.5rem', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-main)', fontSize: '0.8rem', outline: 'none', resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }}
                  aria-label={t('chat.system_prompt_aria')}
                />
                <div style={flexCenterGap4}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>{t('chat.temp_label')} {temperature.toFixed(1)}</span>
                    <input type="range" min="0" max="2" step="0.1" value={temperature} onChange={e => setTemperature(parseFloat(e.target.value))}
                      style={{ flex: 1, height: 4, accentColor: '#3b82f6', cursor: 'pointer' }}
                      aria-label={t('chat.temperature_aria')}
                    />
                  </div>
                  <div style={flexCenterGap2}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>{t('chat.max_tokens_label')}</span>
                    <input type="number" min="64" max="128000" step="64" value={maxTokens} onChange={e => setMaxTokens(parseInt(e.target.value) || 4096)}
                      style={{ width: 80, padding: '0.3rem', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-main)', fontSize: '0.75rem', outline: 'none' }}
                      aria-label={t('chat.max_tokens_aria')}
                    />
                  </div>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: '0.25rem' }}>
                <PersonaSelector />
                <VoiceButton onTranscript={(text) => setInput(prev => prev + text)} />
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={`${t('chat.input_placeholder')} ${t('chat.markdown_supported')}`}
                  rows={1}
                  style={{ flex: 1, padding: '0.5rem 0.5rem', background: 'transparent', border: 'none', color: 'var(--text-main)', fontSize: '1.05rem', outline: 'none', resize: 'none', lineHeight: 1.6, maxHeight: 200, fontFamily: 'inherit' }}
                  disabled={isSending}
                  aria-label={t('chat.input_aria')}
                />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', paddingBottom: 4 }}>
                {isSending ? (
                  <button onClick={cancelSending} style={{ width: 44, height: 44, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#ef4444', border: 'none', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 15px rgba(239,68,68,0.4)' }} aria-label={t('chat.stop_streaming_aria')}>
                    <Square size={18} color="white" aria-hidden="true" />
                  </button>
                ) : (
                  <button className="btn-primary" onClick={(e) => { if (e.shiftKey) { cancelSending(); return; } handleSend(); }} disabled={!input.trim()} style={{ width: 44, height: 44, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)', transition: 'all 0.2s', boxShadow: '0 4px 15px rgba(59,130,246,0.4)', border: 'none', cursor: !input.trim() ? 'default' : 'pointer', opacity: !input.trim() ? 0.5 : 1 }} aria-label={t('chat.send_aria')}>
                    <Send size={20} aria-hidden="true" />
                  </button>
                )}
              </div>
            </div>
          </div>
          <div style={{ textAlign: 'center', marginTop: '0.75rem', fontSize: '0.65rem', color: 'var(--text-muted)', opacity: 0.6 }}>
            {t('chat.footer')} · {t('chat.footer_shortcuts')}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatPanel;
