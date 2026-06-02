import React, { useState, useRef, useCallback } from 'react';
import { FileDown, FileJson, FileText, Code, Copy, Check, FileType, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslation } from '../i18n/useTranslation';
import { exportAndDownload, exportChatToMarkdown, exportChatToJSON, exportChatToHtml } from '../utils/chat-export';
import { errorContainer, dismissBtnRed, textMutedXs, textSecondaryXs, textWhiteXs } from '../styles/common';
import { X } from 'lucide-react';
import { storageAdapter } from '../kernel/instances';

interface ChatPreview {
  id: string;
  title: string;
  model?: string;
  provider?: string;
  createdAt?: number;
  updatedAt?: number;
  messages: Array<{ role: 'user' | 'assistant' | 'system' | 'tool'; content: string }>;
}

const ChatExportPanel: React.FC = () => {
  const { t } = useTranslation();
  const [chat, setChat] = useState<ChatPreview | null>(null);
  const [pasteMode, setPasteMode] = useState(true);
  const [pasted, setPasted] = useState('');
  const [format, setFormat] = useState<'md' | 'json' | 'html'>('md');
  const [includeMeta, setIncludeMeta] = useState(true);
  const [includeStats, setIncludeStats] = useState(true);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isMountedRef = useRef(true);

  const loadFromSession = useCallback(() => {
    try {
      const sessionsRaw = storageAdapter.getItem('chat_sessions_v1');
      if (!sessionsRaw) { setError(t('chat_export.no_sessions')); return; }
      const list: unknown = JSON.parse(sessionsRaw);
      if (!Array.isArray(list) || list.length === 0) { setError(t('chat_export.no_sessions')); return; }
      const last = list[list.length - 1] as { id: string; title?: string; messages?: unknown[]; model?: string; provider?: string; createdAt?: number; updatedAt?: number };
      if (!last?.messages || !Array.isArray(last.messages)) { setError(t('chat_export.invalid_session')); return; }
      setChat({
        id: last.id,
        title: last.title ?? 'Chat',
        model: last.model,
        provider: last.provider,
        createdAt: last.createdAt,
        updatedAt: last.updatedAt,
        messages: last.messages.map((m: unknown) => {
          const msg = m as { role?: string; content?: string };
          return {
            role: (msg.role === 'user' || msg.role === 'assistant' || msg.role === 'system' || msg.role === 'tool') ? msg.role : 'user',
            content: typeof msg.content === 'string' ? msg.content : '',
          };
        }),
      });
      setPasteMode(false);
    } catch (err) {
      setError(String(err));
    }
  }, [t]);

  const loadFromFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const raw = String(reader.result ?? '');
        const data: unknown = JSON.parse(raw);
        if (typeof data !== 'object' || data === null) throw new Error('not object');
        const obj = data as { id?: string; title?: string; messages?: unknown[]; model?: string; provider?: string };
        if (!Array.isArray(obj.messages)) throw new Error('no messages');
        setChat({
          id: obj.id ?? `imp_${Date.now()}`,
          title: obj.title ?? file.name.replace(/\.json$/i, ''),
          model: obj.model,
          provider: obj.provider,
          messages: obj.messages.map((m: unknown) => {
            const msg = m as { role?: string; content?: string };
            return {
              role: (msg.role === 'user' || msg.role === 'assistant' || msg.role === 'system' || msg.role === 'tool') ? msg.role : 'user',
              content: typeof msg.content === 'string' ? msg.content : '',
            };
          }),
        });
        setPasteMode(false);
      } catch (err) {
        if (isMountedRef.current) setError(`${t('chat_export.parse_error')}: ${err instanceof Error ? err.message : String(err)}`);
      }
    };
    reader.readAsText(file);
  }, [t]);

  const loadFromPaste = useCallback(() => {
    if (!pasted.trim()) { setError(t('chat_export.empty_paste')); return; }
    try {
      const data: unknown = JSON.parse(pasted);
      if (typeof data !== 'object' || data === null) throw new Error('not object');
      const obj = data as { id?: string; title?: string; messages?: unknown[] };
      if (!Array.isArray(obj.messages)) throw new Error('no messages');
      setChat({
        id: obj.id ?? `pas_${Date.now()}`,
        title: obj.title ?? 'Pasted Chat',
        messages: obj.messages.map((m: unknown) => {
          const msg = m as { role?: string; content?: string };
          return {
            role: (msg.role === 'user' || msg.role === 'assistant' || msg.role === 'system' || msg.role === 'tool') ? msg.role : 'user',
            content: typeof msg.content === 'string' ? msg.content : '',
          };
        }),
      });
    } catch (err) {
      if (isMountedRef.current) setError(`${t('chat_export.parse_error')}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, [pasted, t]);

  React.useEffect(() => { isMountedRef.current = true; return () => { isMountedRef.current = false; }; }, []);

  const handleDownload = useCallback(() => {
    if (!chat) return;
    setBusy(true);
    try {
      exportAndDownload(
        {
          id: chat.id,
          title: chat.title,
          model: chat.model,
          provider: chat.provider,
          createdAt: chat.createdAt,
          updatedAt: chat.updatedAt,
          messages: chat.messages,
        },
        format,
      );
    } finally {
      setTimeout(() => { if (isMountedRef.current) setBusy(false); }, 300);
    }
  }, [chat, format]);

  const handleCopyPreview = useCallback(() => {
    if (!chat) return;
    const opts = { includeTimestamps: includeMeta, includeModel: includeMeta, includeProvider: includeMeta, includeStats: includeStats };
    const text = format === 'md'
      ? exportChatToMarkdown(chat, opts)
      : format === 'json'
        ? exportChatToJSON(chat)
        : exportChatToHtml(chat, opts);
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }).catch(() => {
      setError(t('chat_export.copy_failed'));
    });
  }, [chat, format, includeMeta, includeStats, t]);

  const preview = React.useMemo(() => {
    if (!chat) return '';
    const opts = { includeTimestamps: includeMeta, includeModel: includeMeta, includeProvider: includeMeta, includeStats: includeStats };
    if (format === 'md') return exportChatToMarkdown(chat, opts);
    if (format === 'json') return exportChatToJSON(chat);
    return exportChatToHtml(chat, opts);
  }, [chat, format, includeMeta, includeStats]);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '1.25rem', padding: '1rem', overflow: 'auto' }}>
      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '1rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 0.25rem', display: 'flex', alignItems: 'center', gap: 12, color: '#f8fafc' }}>
          <FileDown size={26} color="#10b981" /> {t('chat_export.title')}
        </h2>
        <p style={{ color: '#94a3b8', margin: 0, fontSize: '0.85rem' }}>{t('chat_export.subtitle')}</p>
      </div>

      {error && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={errorContainer}>
          {error}
          <button onClick={() => setError(null)} style={dismissBtnRed}><X size={18} /></button>
        </motion.div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div style={{ padding: '1rem', borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.2)' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f1f5f9', margin: '0 0 0.75rem' }}>{t('chat_export.source')}</h3>
          <div style={{ display: 'flex', gap: 6, marginBottom: '0.75rem' }}>
            <button onClick={() => setPasteMode(true)} style={{ padding: '0.4rem 0.8rem', borderRadius: 6, border: 'none', background: pasteMode ? '#3b82f6' : 'rgba(59,130,246,0.15)', color: '#fff', cursor: 'pointer', fontSize: '0.8rem' }}>{t('chat_export.paste')}</button>
            <button onClick={() => { setPasteMode(false); fileInputRef.current?.click(); }} style={{ padding: '0.4rem 0.8rem', borderRadius: 6, border: 'none', background: !pasteMode ? '#3b82f6' : 'rgba(59,130,246,0.15)', color: '#fff', cursor: 'pointer', fontSize: '0.8rem' }}>{t('chat_export.from_file')}</button>
            <button onClick={loadFromSession} style={{ padding: '0.4rem 0.8rem', borderRadius: 6, border: 'none', background: 'rgba(168,85,247,0.15)', color: '#c4b5fd', cursor: 'pointer', fontSize: '0.8rem' }}>{t('chat_export.from_session')}</button>
          </div>
          <input ref={fileInputRef} type="file" accept=".json,application/json" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) loadFromFile(f); }} />
          {pasteMode && (
            <textarea
              value={pasted}
              onChange={e => setPasted(e.target.value)}
              placeholder='{"messages": [{"role":"user","content":"hi"}]}'
              style={{ width: '100%', height: 140, padding: '0.5rem', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)', color: '#e2e8f0', fontFamily: 'monospace', fontSize: '0.75rem', resize: 'vertical' }}
            />
          )}
          {pasteMode && (
            <button onClick={loadFromPaste} style={{ marginTop: '0.5rem', padding: '0.4rem 0.8rem', borderRadius: 6, border: 'none', background: '#10b981', color: '#fff', cursor: 'pointer', fontSize: '0.8rem' }}>{t('chat_export.load')}</button>
          )}
        </div>

        <div style={{ padding: '1rem', borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.2)' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f1f5f9', margin: '0 0 0.75rem' }}>{t('chat_export.format')}</h3>
          <div style={{ display: 'flex', gap: 6, marginBottom: '0.75rem' }}>
            {(['md', 'json', 'html'] as const).map(f => (
              <button key={f} onClick={() => setFormat(f)} style={{ padding: '0.4rem 0.8rem', borderRadius: 6, border: 'none', background: format === f ? '#10b981' : 'rgba(16,185,129,0.15)', color: '#fff', cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                {f === 'md' ? <FileText size={14} /> : f === 'json' ? <FileJson size={14} /> : <Code size={14} />}
                {f.toUpperCase()}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: '0.8rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#cbd5e1', cursor: 'pointer' }}>
              <input type="checkbox" checked={includeMeta} onChange={e => setIncludeMeta(e.target.checked)} />
              {t('chat_export.include_meta')}
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#cbd5e1', cursor: 'pointer' }}>
              <input type="checkbox" checked={includeStats} onChange={e => setIncludeStats(e.target.checked)} />
              {t('chat_export.include_stats')}
            </label>
          </div>
        </div>
      </div>

      {chat && (
        <>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', padding: '0.75rem 1rem', borderRadius: 10, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
            <FileType size={16} color="#10b981" />
            <div style={{ flex: 1 }}>
              <div style={textWhiteXs}>{chat.title}</div>
              <div style={textMutedXs}>{chat.messages.length} {t('chat_export.messages')} · {chat.model ? `model: ${chat.model}` : 'no model'}</div>
            </div>
            <button onClick={handleCopyPreview} style={{ padding: '0.4rem 0.8rem', borderRadius: 6, border: 'none', background: 'rgba(255,255,255,0.1)', color: copied ? '#10b981' : '#e2e8f0', cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 4 }}>
              {copied ? <Check size={14} /> : <Copy size={14} />} {t('chat_export.copy')}
            </button>
            <button onClick={handleDownload} disabled={busy} style={{ padding: '0.4rem 0.8rem', borderRadius: 6, border: 'none', background: '#10b981', color: '#fff', cursor: busy ? 'wait' : 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
              {busy ? <Loader2 size={14} /> : <FileDown size={14} />} {t('chat_export.download')}
            </button>
          </div>

          <div style={{ flex: 1, minHeight: 200, maxHeight: '50vh', overflow: 'auto', borderRadius: 10, border: '1px solid rgba(255,255,255,0.05)', background: '#0a0e1a' }}>
            <pre style={{ padding: '1rem', margin: 0, color: '#cbd5e1', fontFamily: 'monospace', fontSize: '0.75rem', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {preview.slice(0, 8000)}{preview.length > 8000 ? '\n...' : ''}
            </pre>
          </div>
        </>
      )}

      {!chat && !pasteMode && (
        <div style={{ padding: '1rem', borderRadius: 8, background: 'rgba(0,0,0,0.15)', color: '#94a3b8', fontSize: '0.8rem' }}>
          <p style={{ margin: '0 0 0.5rem' }}>{t('chat_export.how_to')}</p>
          <ul style={{ margin: 0, paddingLeft: '1.25rem', ...textSecondaryXs }}>
            <li>{t('chat_export.how_1')}</li>
            <li>{t('chat_export.how_2')}</li>
            <li>{t('chat_export.how_3')}</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default ChatExportPanel;
