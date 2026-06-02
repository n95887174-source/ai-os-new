import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Database, Search, RefreshCw, Download, ChevronDown, ChevronRight, X, Copy, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { kernel } from '../kernel/instances';
import { eventBus, EVENTS } from '../core/events';
import { useTranslation } from '../i18n/useTranslation';
import { errorContainer, dismissBtnRed, textMutedXs, textSecondaryXs, textWhiteXs } from '../styles/common';
import type { SystemState } from '../kernel/types/metrics-types';

interface TreeNodeProps {
  keyName: string;
  value: unknown;
  depth: number;
  expanded: Set<string>;
  toggle: (path: string) => void;
  search: string;
  path: string;
}

function valueType(v: unknown): string {
  if (v === null) return 'null';
  if (Array.isArray(v)) return `array(${v.length})`;
  if (typeof v === 'object') return 'object';
  if (typeof v === 'string') return 'string';
  if (typeof v === 'number') return 'number';
  if (typeof v === 'boolean') return 'boolean';
  return typeof v;
}

function valueColor(v: unknown): string {
  const t = valueType(v);
  if (t === 'string') return '#86efac';
  if (t === 'number') return '#fcd34d';
  if (t === 'boolean') return '#f0abfc';
  if (t === 'null') return '#94a3b8';
  if (t.startsWith('array')) return '#7dd3fc';
  if (t.startsWith('object')) return '#c4b5fd';
  return '#e2e8f0';
}

const MAX_INLINE = 4;

const TreeNode: React.FC<TreeNodeProps> = ({ keyName, value, depth, expanded, toggle, search, path }) => {
  const type = valueType(value);
  const isComplex = type.startsWith('object') || type.startsWith('array');
  const isExpanded = expanded.has(path);
  const matchesSearch = search.trim() !== '' &&
    (keyName.toLowerCase().includes(search.toLowerCase()) ||
     (type === 'string' && String(value).toLowerCase().includes(search.toLowerCase())) ||
     (type === 'number' && String(value).includes(search)));

  const indent = { paddingLeft: `${depth * 14}px` };
  const arrayLength = isComplex && Array.isArray(value) ? value.length : 0;
  const objectKeys = isComplex && !Array.isArray(value) && value && typeof value === 'object' ? Object.keys(value as object) : [];

  return (
    <div style={{ fontSize: '0.78rem', fontFamily: 'ui-monospace, "SF Mono", Consolas, monospace' }}>
      <div
        onClick={() => isComplex && toggle(path)}
        style={{
          ...indent,
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: '2px 6px',
          cursor: isComplex ? 'pointer' : 'default',
          background: matchesSearch ? 'rgba(245,158,11,0.1)' : 'transparent',
          borderLeft: `2px solid ${matchesSearch ? '#f59e0b' : 'transparent'}`,
        }}
      >
        {isComplex ? (
          isExpanded ? <ChevronDown size={11} color="#64748b" /> : <ChevronRight size={11} color="#64748b" />
        ) : (
          <span style={{ width: 11 }} />
        )}
        <span style={{ color: '#cbd5e1' }}>{keyName}</span>
        <span style={{ color: '#475569' }}>:</span>
        {!isComplex && (
          <span style={{ color: valueColor(value), marginLeft: 4, wordBreak: 'break-all' }}>
            {type === 'string' ? `"${value}"` : type === 'null' ? 'null' : String(value)}
          </span>
        )}
        {isComplex && (
          <span style={{ color: valueColor(value), marginLeft: 4, fontStyle: 'italic', fontSize: '0.7rem' }}>
            {type}
          </span>
        )}
      </div>
      {isComplex && isExpanded && (
        <div>
          {Array.isArray(value) ? (
            value.slice(0, MAX_INLINE).map((item, i) => (
              <TreeNode
                key={i}
                keyName={`[${i}]`}
                value={item}
                depth={depth + 1}
                expanded={expanded}
                toggle={toggle}
                search={search}
                path={`${path}.${i}`}
              />
            ))
          ) : (
            objectKeys.slice(0, MAX_INLINE).map(k => (
              <TreeNode
                key={k}
                keyName={k}
                value={(value as Record<string, unknown>)[k]}
                depth={depth + 1}
                expanded={expanded}
                toggle={toggle}
                search={search}
                path={`${path}.${k}`}
              />
            ))
          )}
          {((Array.isArray(value) && arrayLength > MAX_INLINE) || (!Array.isArray(value) && objectKeys.length > MAX_INLINE)) && (
            <div style={{ ...indent, padding: '2px 6px', color: '#475569', fontSize: '0.7rem' }}>
              ... {Array.isArray(value) ? arrayLength - MAX_INLINE : objectKeys.length - MAX_INLINE} more
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const StateInspectorPanel: React.FC = () => {
  const { t } = useTranslation();
  const [state, setState] = useState<SystemState | null>(null);
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(['root.providers', 'root.weights']));
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const isMountedRef = useRef(true);

  const refresh = useCallback(() => {
    try {
      const snap = kernel.getStateSnapshot();
      if (isMountedRef.current) setState(snap);
    } catch (err) {
      if (isMountedRef.current) setError(String(err));
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    refresh();
    const interval = setInterval(refresh, 2000);
    const unsub = eventBus.on(EVENTS.KERNEL_UPDATED, refresh);
    return () => {
      isMountedRef.current = false;
      clearInterval(interval);
      unsub();
    };
  }, [refresh]);

  const toggle = useCallback((path: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    if (!state) return;
    const all = new Set<string>();
    function walk(prefix: string, v: unknown) {
      if (v && typeof v === 'object') {
        all.add(prefix);
        if (Array.isArray(v)) {
          v.slice(0, MAX_INLINE).forEach((item, i) => walk(`${prefix}.${i}`, item));
        } else {
          Object.keys(v as object).slice(0, MAX_INLINE).forEach(k => walk(`${prefix}.${k}`, (v as Record<string, unknown>)[k]));
        }
      }
    }
    walk('root', state);
    setExpanded(all);
  }, [state]);

  const collapseAll = useCallback(() => {
    setExpanded(new Set(['root']));
  }, []);

  const handleCopy = useCallback(() => {
    if (!state) return;
    try {
      navigator.clipboard.writeText(JSON.stringify(state, null, 2));
      setCopied(true);
      setTimeout(() => { if (isMountedRef.current) setCopied(false); }, 1500);
    } catch (err) {
      setError(String(err));
    }
  }, [state]);

  const handleDownload = useCallback(() => {
    if (!state) return;
    try {
      const json = JSON.stringify(state, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `system-state-${new Date().toISOString().slice(0, 19)}.json`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 100);
    } catch (err) {
      setError(String(err));
    }
  }, [state]);

  const stats = useMemo(() => {
    if (!state) return null;
    return {
      providerCount: Object.keys(state.providers).length,
      decisionCount: state.decisions.length,
      violationCount: state.violations.length,
      historyCount: state.history.length,
      activeSLA: state.activeSLA,
    };
  }, [state]);

  if (!state) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8' }}>
        <RefreshCw size={20} className="animate-spin" />
      </div>
    );
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '1rem', overflow: 'hidden' }}>
      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 0.25rem', display: 'flex', alignItems: 'center', gap: 12, color: '#f8fafc' }}>
            <Database size={26} color="#3b82f6" /> {t('state_inspector.title')}
          </h2>
          <p style={{ color: '#94a3b8', margin: 0, fontSize: '0.85rem' }}>{t('state_inspector.subtitle')}</p>
        </div>
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          <button onClick={expandAll} style={btnSecondary}><ChevronDown size={12} /> {t('state_inspector.expand_all')}</button>
          <button onClick={collapseAll} style={btnSecondary}><ChevronRight size={12} /> {t('state_inspector.collapse_all')}</button>
          <button onClick={handleCopy} style={btnSecondary}>{copied ? <Check size={12} color="#10b981" /> : <Copy size={12} />} {copied ? t('state_inspector.copied') : t('state_inspector.copy')}</button>
          <button onClick={handleDownload} style={btnSecondary}><Download size={12} /> {t('state_inspector.download')}</button>
        </div>
      </div>

      {error && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={errorContainer}>
          {error}
          <button onClick={() => setError(null)} style={dismissBtnRed}><X size={18} /></button>
        </motion.div>
      )}

      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.4rem' }}>
          <StatBox label={t('state_inspector.providers')} value={stats.providerCount} color="#3b82f6" />
          <StatBox label={t('state_inspector.decisions')} value={stats.decisionCount} color="#10b981" />
          <StatBox label={t('state_inspector.violations')} value={stats.violationCount} color="#ef4444" />
          <StatBox label={t('state_inspector.history')} value={stats.historyCount} color="#a855f7" />
          <StatBox label={t('state_inspector.sla')} value={stats.activeSLA} color="#f59e0b" />
        </div>
      )}

      <div style={{ position: 'relative', flex: '0 0 auto' }}>
        <Search size={14} style={{ position: 'absolute', left: 8, top: 8, color: '#94a3b8' }} />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={t('state_inspector.search_placeholder')}
          style={{ width: '100%', padding: '0.4rem 0.5rem 0.4rem 28px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)', color: '#e2e8f0', fontSize: '0.8rem' }}
        />
      </div>

      <div style={{ flex: 1, overflow: 'auto', borderRadius: 8, border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.2)', padding: '0.5rem' }}>
        <AnimatePresence>
          {Object.entries(state as unknown as Record<string, unknown>).map(([k, v]) => (
            <TreeNode
              key={k}
              keyName={k}
              value={v}
              depth={0}
              expanded={expanded}
              toggle={toggle}
              search={search}
              path={`root.${k}`}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

const StatBox: React.FC<{ label: string; value: string | number; color: string }> = ({ label, value, color }) => (
  <div style={{ padding: '0.4rem 0.6rem', borderRadius: 8, border: `1px solid ${color}20`, background: `linear-gradient(145deg, ${color}05, rgba(0,0,0,0.2))` }}>
    <div style={{ ...textMutedXs, fontSize: '0.65rem', marginBottom: 2 }}>{label}</div>
    <div style={{ ...textWhiteXs, fontSize: '0.95rem', fontWeight: 700, color }}>{value}</div>
  </div>
);

const btnSecondary: React.CSSProperties = {
  padding: '0.35rem 0.7rem',
  borderRadius: 6,
  border: '1px solid rgba(255,255,255,0.1)',
  background: 'transparent',
  color: '#94a3b8',
  cursor: 'pointer',
  fontSize: '0.75rem',
  display: 'flex',
  alignItems: 'center',
  gap: 4,
};

export default StateInspectorPanel;
