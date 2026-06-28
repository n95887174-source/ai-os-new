import { storageAdapter } from '../../kernel/instances';
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';

import {
  Send, Square,
  Activity, ChevronRight, ChevronDown,
  BrainCircuit,
  Plus, MessageSquare, Trash2,
  Split, Settings,
  X, Search, FileDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useKeyList } from '../../stores/useKeyStore';
import { useChatStore, useActiveSessionHistory } from '../../stores/useChatStore';
import ProviderIcon from '../ProviderIcon/ProviderIcon';
import { VoiceButton } from './VoiceButton';
import { PersonaSelector } from './PersonaSelector';
import ModuleInfo from '../ModuleInfo/ModuleInfo';
import MessageSearchPanel from '../MessageSearchPanel';
import ChatExportPanel from '../ChatExportPanel';
import { useAutoClearError } from '../../hooks/useAutoClearError';
import { useConfirm } from '../../hooks/useConfirm';
import { useTranslation } from '../../i18n/useTranslation';
 
import { iconBtnMuted, toastBase } from '../../styles/common';
import { DEFAULT_MODELS, type ExecutionMode, groupSessions } from './chat-panel-utils';
import type { ChatEntry } from '../../stores/useChatStore';
import ChatHistoryEntry from './ChatHistoryEntry';

const ChatPanel: React.FC = () => {
  const { activeKeys } = useKeyList();
  const activeKeysRef = useRef(activeKeys);
  useEffect(() => { activeKeysRef.current = activeKeys; }, [activeKeys]);
  const sendMessage = useChatStore(s => s.sendMessage);
  const clearHistory = useChatStore(s => s.clearHistory);
  const cancelSending = useChatStore(s => s.cancelSending);
  const sessions = useChatStore(s => s.sessions);
  const activeSessionId = useChatStore(s => s.activeSessionId);
  const setActiveSessionId = useChatStore(s => s.setActiveSessionId);
  const createSession = useChatStore(s => s.createSession);
  const deleteSession = useChatStore(s => s.deleteSession);
  const forkSession = useChatStore(s => s.forkSession);
  const editEntry = useChatStore(s => s.editEntry);
  const hasMoreSessions = useChatStore(s => s.hasMoreSessions);
  const loadMoreSessions = useChatStore(s => s.loadMoreSessions);
  const getSessionConfig = useChatStore(s => s.getSessionConfig);
  const systemPrompt = useChatStore(s => s.systemPrompt);
  const setSystemPrompt = useChatStore(s => s.setSystemPrompt);
  const isSending = useChatStore(s => s.activeRequestIds.size > 0);
  const history = useActiveSessionHistory();
  const historyMap = useMemo(() => new Map(history.map(h => [h.id, h])), [history]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
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
  useEffect(() => {
    if (activeKeys.length > 0 && selectedKeys.length === 0) {
      setSelectedKeys([activeKeys[0].id]);
      const firstModel = activeKeys[0]?.availableModels?.[0] || DEFAULT_MODELS[activeKeys[0]?.provider || ''] || '';
      setSelectedModel(firstModel);
      setSelectedModelPerKey({ [activeKeys[0].id]: firstModel });
    }
  }, [activeKeys]); // eslint-disable-line react-hooks/exhaustive-deps

  const { t } = useTranslation();
  const { confirm: confirmDelete, ConfirmDialog: DeleteConfirmDialog } = useConfirm();
  const { confirm: confirmClear, ConfirmDialog: ClearConfirmDialog } = useConfirm();
  const [input, setInput] = useState('');
  const [showSidebar, setShowSidebar] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [displayMode, setDisplayMode] = useState<'standard' | 'technical'>('standard');
  const [isSplitView, setIsSplitView] = useState(() => storageAdapter.getItem('chat-split-view') === 'true');
  const [showSearch, setShowSearch] = useState(false);
  const [showExportOverlay, setShowExportOverlay] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [systemPromptDraft, setSystemPromptDraft] = useState(systemPrompt);

  // UX-07: track which groups have been auto-expanded for context
  const autoExpandedGroupRef = useRef(false);
  const [showSystemPromptInput, setShowSystemPromptInput] = useState(false);
  const [showModelConfig, setShowModelConfig] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const statusTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sidebarWidth = 280;
  const sidebarRef = useRef<HTMLDivElement>(null);
  const [showSearchWithinChat, setShowSearchWithinChat] = useState(false);
  const [searchWithinQuery, setSearchWithinQuery] = useState('');
  const [searchWithinResults, setSearchWithinResults] = useState<number[]>([]);
  const [searchWithinIndex, setSearchWithinIndex] = useState(0);

  const showStatus = useCallback((text: string, type: 'success' | 'error' | 'info' = 'info') => {
    setStatusMessage({ text, type });
    if (statusTimeoutRef.current) clearTimeout(statusTimeoutRef.current);
    statusTimeoutRef.current = setTimeout(() => setStatusMessage(null), 3000);
  }, []);

  useAutoClearError(statusMessage, setStatusMessage, statusTimeoutRef);

  useEffect(() => {
    storageAdapter.setItem('chat-split-view', String(isSplitView));
  }, [isSplitView]);

  // C2: Auto-scroll to bottom on new messages
  const historyLen = history?.length;
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [historyLen]);

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text) return;
    setInput('');
    sendMessage(text, selectedKeys, selectedModel, mode);
  }, [input, sendMessage, selectedKeys, selectedModel, mode]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  const handleCancel = useCallback(() => {
    cancelSending();
  }, [cancelSending]);

  const handleStartEdit = useCallback((id: string, text: string) => {
    setEditingEntryId(id);
    setEditingText(text);
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingEntryId(null);
    setEditingText('');
  }, []);

  const handleSaveEdit = useCallback(() => {
    if (editingEntryId && editingText.trim()) {
      editEntry(editingEntryId, editingText);
    }
    setEditingEntryId(null);
    setEditingText('');
  }, [editingEntryId, editingText, editEntry]);

  const handleFork = useCallback((entryId: string) => {
    const newId = forkSession(entryId);
    if (newId) {
      setActiveSessionId(newId);
      showStatus(t('chat.forked'));
    }
  }, [forkSession, setActiveSessionId, showStatus, t]);

  const handleRegenerate = useCallback((entryId: string) => {
    sendMessage('', selectedKeys, selectedModel, 'single', entryId);
  }, [sendMessage, selectedKeys, selectedModel]);

  const filteredSessions = useMemo(() => {
    if (!searchQuery.trim()) return sessions;
    const q = searchQuery.toLowerCase();
    return sessions.filter(s =>
      s.title.toLowerCase().includes(q) ||
      (historyMap.get(s.id)?.entries || []).some((e: ChatEntry) => e.text.toLowerCase().includes(q))
    );
  }, [sessions, searchQuery, historyMap]);

  const sessionGroups = useMemo(() => groupSessions(filteredSessions, t), [filteredSessions, t]);

  const activeSession = sessions.find(s => s.id === activeSessionId);
  const historyEntries = activeSessionId && historyMap.get(activeSessionId)?.entries;

  // retrieve config for active session
  const activeConfig = activeSessionId ? getSessionConfig(activeSessionId) : undefined;
  const activeModel = activeConfig?.model || selectedModel;
  const handleNewChat = useCallback(() => {
    const newId = createSession();
    setActiveSessionId(newId);
    setInput('');
    setEditingEntryId(null);
    setShowSidebar(true);
    autoExpandedGroupRef.current = true;
  }, [createSession, setActiveSessionId]);

  const handleDeleteSession = useCallback(async (id: string) => {
    const confirmed = await confirmDelete(t('chat.confirm_delete'));
    if (!confirmed) return;
    deleteSession(id);
    if (id === activeSessionId) {
      setActiveSessionId(history.length > 0 ? history[history.length - 1].id : '');
    }
  }, [confirmDelete, deleteSession, activeSessionId, history, setActiveSessionId, t]);

  const handleClearHistory = useCallback(async () => {
    const confirmed = await confirmClear(t('chat.confirm_clear'));
    if (!confirmed) return;
    clearHistory();
  }, [confirmClear, clearHistory, t]);

  const handleSessionClick = useCallback((id: string) => {
    setActiveSessionId(id);
    setShowSidebar(false);
  }, [setActiveSessionId]);

  const toggleGroup = useCallback((label: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  }, []);

  // Search within active chat
  useEffect(() => {
    if (!searchWithinQuery.trim() || !historyEntries) {
      setSearchWithinResults([]);
      return;
    }
    const q = searchWithinQuery.toLowerCase();
    const indices: number[] = [];
    historyEntries.forEach((entry, idx) => {
      if (entry.text.toLowerCase().includes(q)) indices.push(idx);
    });
    setSearchWithinResults(indices);
    setSearchWithinIndex(0);
  }, [searchWithinQuery, historyEntries]);

  return (
    <div style={{ display: 'flex', height: '100%', position: 'relative' }}>
      {/* Sidebar */}
      <AnimatePresence>
      {showSidebar && (
        <motion.div
          ref={sidebarRef}
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: sidebarWidth, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          style={{ overflow: 'hidden', flexShrink: 0, borderRight: '1px solid var(--border)', background: 'var(--bg-panel)' }}
        >
          <div style={{ width: sidebarWidth, display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ padding: '1rem', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('chat.sessions_label')}</span>
                <div style={{ display: 'flex', gap: '0.35rem' }}>
                  <button onClick={handleNewChat} style={{ padding: '0.4rem', borderRadius: 8, background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', color: '#3b82f6', cursor: 'pointer' }} title={t('chat.new_session')} aria-label={t('chat.new_session')}>
                    <Plus size={16} />
                  </button>
                </div>
              </div>
              <div style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} aria-hidden="true" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder={t('chat.search_placeholder')}
                  aria-label={t('chat.search_sessions')}
                  style={{ width: '100%', padding: '0.55rem 0.75rem 0.55rem 2rem', borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', color: 'var(--text-main)', fontSize: '0.8rem', outline: 'none' }}
                />
              </div>
            </div>
            <div style={{ flex: 1, overflow: 'auto', padding: '0.5rem' }}>
              {sessionGroups.map((group) => (
                <div key={group.label} style={{ marginBottom: '0.75rem' }}>
                  <div
                    onClick={() => toggleGroup(group.label)}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.35rem 0.5rem', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.03em' }}
                  >
                    <ChevronDown size={12} style={{ transform: collapsedGroups.has(group.label) ? 'rotate(-90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} aria-hidden="true" />
                    {group.label}
                    <span style={{ marginLeft: 'auto', color: 'var(--text-muted)', opacity: 0.5 }}>{group.sessions.length}</span>
                  </div>
                  {!collapsedGroups.has(group.label) && group.sessions.map(s => {
                    const isActive = s.id === activeSessionId;
                    return (
                      <div
                        key={s.id}
                        onClick={() => handleSessionClick(s.id)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '0.35rem',
                          padding: '0.45rem 0.5rem', borderRadius: 8, cursor: 'pointer',
                          fontSize: '0.78rem', color: isActive ? '#3b82f6' : 'var(--text-main)',
                          background: isActive ? 'rgba(59,130,246,0.08)' : 'transparent',
                          fontWeight: isActive ? 600 : 400,
                          border: isActive ? '1px solid rgba(59,130,246,0.15)' : '1px solid transparent',
                          transition: 'all 0.15s'
                        }}
                      >
                        <MessageSquare size={12} style={{ flexShrink: 0, opacity: 0.5 }} aria-hidden="true" />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{s.title}</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteSession(s.id); }}
                          style={{ padding: 2, background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', opacity: 0.4, flexShrink: 0 }}
                          title={t('chat.delete_session')}
                          aria-label={t('chat.delete_session_aria')}
                        >
                          <Trash2 size={12} aria-hidden="true" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              ))}
              {hasMoreSessions && (
                <button onClick={loadMoreSessions} style={{ width: '100%', padding: '0.5rem', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.75rem', marginTop: '0.5rem' }}>
                  {t('chat.load_more')}
                </button>
              )}
              {sessionGroups.length === 0 && (
                <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                  {searchQuery ? t('chat.no_search_results') : t('chat.no_sessions')}
                </div>
              )}
            </div>
            <div style={{ padding: '0.5rem', borderTop: '1px solid var(--border)', display: 'flex', gap: '0.35rem', justifyContent: 'center' }}>
              <button onClick={handleClearHistory} style={{ padding: '0.4rem 0.75rem', borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', color: '#ef4444', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 600 }}>
                {t('chat.clear_all')}
              </button>
            </div>
          </div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1.25rem', borderBottom: '1px solid var(--border)', background: 'var(--bg-panel)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button onClick={() => setShowSidebar(!showSidebar)} style={{ padding: 6, borderRadius: 8, background: 'none', border: 'none', color: showSidebar ? '#3b82f6' : 'var(--text-muted)', cursor: 'pointer' }} title={t('chat.toggle_sidebar')} aria-label={t('chat.toggle_sidebar')}>
              <MessageSquare size={18} aria-hidden="true" />
            </button>
            <div>
              <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{activeSession?.title || t('chat.no_session')}</span>
              {activeModel && <span style={{ marginLeft: '0.5rem', fontSize: '0.7rem', color: 'var(--text-muted)' }}>{activeModel}</span>}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
            <button onClick={() => setShowSearch(true)} style={iconBtnMuted} title={t('chat.search_messages')} aria-label={t('chat.search_messages')}>
              <Search size={16} />
            </button>
            <button onClick={() => { setShowSearchWithinChat(!showSearchWithinChat); setSearchWithinQuery(''); }} style={iconBtnMuted} title={t('chat.search_in_chat')} aria-label={t('chat.search_in_chat')}>
              <Search size={16} />
            </button>
            <ModuleInfo moduleKey="chat" />
            <button onClick={() => setShowExportOverlay(true)} style={iconBtnMuted} title={t('chat.export')} aria-label={t('chat.export_aria')}>
              <FileDown size={16} />
            </button>
            <button onClick={() => setDisplayMode(d => d === 'standard' ? 'technical' : 'standard')} style={{
              ...iconBtnMuted,
              color: displayMode === 'technical' ? '#a855f7' : 'var(--text-muted)',
              background: displayMode === 'technical' ? 'rgba(168,85,247,0.1)' : 'transparent'
            }} title={displayMode === 'technical' ? t('chat.standard_mode') : t('chat.technical_mode')} aria-label={displayMode === 'technical' ? t('chat.standard_mode') : t('chat.technical_mode')}>
              <Activity size={16} />
            </button>
            <button onClick={() => { setIsSplitView(!isSplitView); showStatus(isSplitView ? t('chat.split_view_disabled') : t('chat.split_view_enabled'), 'info'); }} style={{
              ...iconBtnMuted,
              color: isSplitView ? '#a855f7' : 'var(--text-muted)',
              background: isSplitView ? 'rgba(168,85,247,0.1)' : 'transparent'
            }} title={t('chat.split_view')} aria-label={t('chat.split_view')}>
              <Split size={16} />
            </button>
            <button onClick={() => setShowSystemPromptInput(!showSystemPromptInput)} style={{ ...iconBtnMuted, color: showSystemPromptInput ? '#3b82f6' : 'var(--text-muted)' }} title={t('chat.system_prompt')} aria-label={t('chat.system_prompt')}>
              <Settings size={16} />
            </button>
          </div>
        </div>

        {/* System prompt */}
        {showSystemPromptInput && (
          <div style={{ padding: '0.75rem 1.25rem', borderBottom: '1px solid var(--border)', background: 'rgba(59,130,246,0.03)' }}>
            <textarea
              value={systemPromptDraft}
              onChange={e => setSystemPromptDraft(e.target.value)}
              placeholder={t('chat.system_prompt_placeholder')}
              rows={3}
              style={{ width: '100%', padding: '0.75rem', borderRadius: 8, background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)', color: 'var(--text-main)', fontSize: '0.85rem', resize: 'vertical', outline: 'none', fontFamily: 'inherit' }}
            />
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
              <button onClick={() => { setSystemPrompt(systemPromptDraft); showStatus(t('chat.system_prompt_saved'), 'success'); }} className="btn-primary" style={{ padding: '0.4rem 1rem', fontSize: '0.75rem' }}>{t('common.save')}</button>
              <button onClick={() => { setSystemPrompt(''); setSystemPromptDraft(''); showStatus(t('chat.system_prompt_cleared'), 'info'); }} style={{ padding: '0.4rem 1rem', borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', color: '#ef4444', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}>{t('chat.clear_prompt')}</button>
            </div>
          </div>
        )}

        {/* Search in chat */}
        {showSearchWithinChat && (
          <div style={{ padding: '0.5rem 1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(168,85,247,0.03)' }}>
            <Search size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} aria-hidden="true" />
            <input
              type="text"
              value={searchWithinQuery}
              onChange={e => setSearchWithinQuery(e.target.value)}
              placeholder={t('chat.search_in_chat_placeholder')}
              style={{ flex: 1, padding: '0.35rem 0.5rem', borderRadius: 6, background: 'rgba(0,0,0,0.15)', border: '1px solid var(--border)', color: 'var(--text-main)', fontSize: '0.8rem', outline: 'none' }}
              autoFocus
            />
            {searchWithinResults.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                <button onClick={() => setSearchWithinIndex(i => Math.max(0, i - 1))} style={iconBtnMuted} aria-label={t('chat.previous_match')}>
                  <ChevronRight size={14} style={{ transform: 'rotate(180deg)' }} />
                </button>
                <span>{searchWithinIndex + 1}/{searchWithinResults.length}</span>
                <button onClick={() => setSearchWithinIndex(i => Math.min(searchWithinResults.length - 1, i + 1))} style={iconBtnMuted} aria-label={t('chat.next_match')}>
                  <ChevronRight size={14} />
                </button>
                <button onClick={() => { setSearchWithinQuery(''); setSearchWithinResults([]); }} style={iconBtnMuted} aria-label={t('common.close')}>
                  <X size={14} />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Messages */}
        <div style={{ flex: 1, overflow: 'auto', padding: '1.5rem 2rem' }}>
          {historyEntries && historyEntries.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div id="chat-messages-container">
                <div ref={messagesEndRef} />
                {historyEntries.map((entry, entryIdx) => {
                  const isEditing = editingEntryId === entry.id;
                  const isSearchMatch = searchWithinResults.includes(entryIdx);
                  const searchRef = isSearchMatch && searchWithinIndex === searchWithinResults.indexOf(entryIdx) ? 'chat-search-highlight' : undefined;
                  
                  return (
                    <div key={entry.id} id={searchRef} style={{ scrollMarginTop: '4rem' }}>
                      <ChatHistoryEntry
                        entry={entry}
                        entryIdx={entryIdx}
                        isEditing={isEditing}
                        editText={editingText}
                        isSplitView={isSplitView}
                        displayMode={displayMode}
                        onStartEdit={handleStartEdit}
                        onCancelEdit={handleCancelEdit}
                        onSaveEdit={handleSaveEdit}
                        onSetEditText={setEditingText}
                        onFork={handleFork}
                        onRegenerate={handleRegenerate}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '1rem', color: 'var(--text-muted)' }}>
              <BrainCircuit size={48} style={{ opacity: 0.3 }} aria-hidden="true" />
              <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{t('chat.empty_title')}</div>
              <div style={{ fontSize: '0.85rem', maxWidth: 400, textAlign: 'center' }}>{t('chat.empty_desc')}</div>
            </div>
          )}

          {/* Model config popovers */}
          {showModelConfig && historyEntries && historyEntries.length > 0 && (
            <div style={{ marginTop: '1rem', padding: '1rem', borderRadius: 12, background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)' }}>
              <div style={{ marginBottom: '0.75rem', fontWeight: 600, fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between' }}>
                <span>{t('chat.model_config')}</span>
                <button onClick={() => setShowModelConfig(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={16} /></button>
              </div>
              {historyEntries.map((entry, idx) => (
                <div key={entry.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: idx < historyEntries.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>
                    {entry.text.substring(0, 60)}{entry.text.length > 60 ? '...' : ''}
                  </span>
                  <div style={{ display: 'flex', gap: '0.35rem' }}>
                    {entry.responses.map((res, j) => (
                      <span key={j} style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: 4, background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)' }}>
                        {res.provider} / {res.model}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Input area */}
        <div style={{ borderTop: '1px solid var(--border)', padding: '1rem 1.25rem', background: 'var(--bg-panel)' }}>
          {/* Mode selector */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
            {(['single', 'parallel', 'auto'] as ExecutionMode[]).map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                style={{
                  padding: '0.3rem 0.75rem', borderRadius: 8, cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600,
                  background: mode === m ? 'rgba(59,130,246,0.1)' : 'rgba(255,255,255,0.03)',
                  border: mode === m ? '1px solid rgba(59,130,246,0.3)' : '1px solid var(--border)',
                  color: mode === m ? '#3b82f6' : 'var(--text-muted)',
                  transition: 'all 0.15s'
                }}
              >
                {m === 'single' ? t('chat.mode_single') : m === 'parallel' ? t('chat.mode_parallel') : t('chat.mode_auto')}
              </button>
            ))}
            <PersonaSelector />
          </div>

          {/* Key pills */}
          <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
            {activeKeys.map(k => {
              const isSelected = selectedKeys.includes(k.id);
              return (
                <button
                  key={k.id}
                  onClick={() => {
                    setSelectedKeys(prev => isSelected ? prev.filter(id => id !== k.id) : [...prev, k.id]);
                    if (!isSelected && !selectedModelPerKey[k.id]) {
                      setSelectedModelPerKey(prev => ({
                        ...prev,
                        [k.id]: k.availableModels?.[0] || DEFAULT_MODELS[k.provider] || ''
                      }));
                    }
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.35rem',
                    padding: '0.3rem 0.65rem', borderRadius: 100, cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600,
                    background: isSelected ? 'rgba(59,130,246,0.08)' : 'rgba(255,255,255,0.03)',
                    border: isSelected ? '1px solid rgba(59,130,246,0.2)' : '1px solid var(--border)',
                    color: isSelected ? '#3b82f6' : 'var(--text-muted)',
                    transition: 'all 0.15s'
                  }}
                >
                  <ProviderIcon provider={k.provider} size={12} />
                  {k.label}
                </button>
              );
            })}
          </div>

          {/* Model selector per key */}
          {selectedKeys.length > 0 && (
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
              {selectedKeys.map(kid => {
                const k = activeKeys.find(ak => ak.id === kid);
                if (!k) return null;
                const models = k.availableModels || [];
                const currentModel = selectedModelPerKey[k.id] || '';
                return (
                  <div key={kid} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    <span style={{ fontWeight: 600 }}>{k.label}:</span>
                    <select
                      value={currentModel}
                      onChange={e => {
                        const m = e.target.value;
                        setSelectedModelPerKey(prev => ({ ...prev, [k.id]: m }));
                        setSelectedModel(m);
                      }}
                      style={{
                        padding: '0.25rem 0.5rem', borderRadius: 6, background: 'rgba(0,0,0,0.2)',
                        border: '1px solid var(--border)', color: 'var(--text-main)', fontSize: '0.7rem', outline: 'none'
                      }}
                    >
                      {models.length > 0 ? models.map(m => (
                        <option key={m} value={m}>{m}</option>
                      )) : (
                        <option value="">{t('chat.no_models')}</option>
                      )}
                    </select>
                  </div>
                );
              })}
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end' }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  selectedKeys.length === 0
                    ? t('chat.no_keys_selected')
                    : isSending
                    ? t('chat.sending')
                    : t('chat.placeholder')
                }
                rows={2}
                disabled={isSending || selectedKeys.length === 0}
                style={{
                  width: '100%',
                  padding: '0.85rem 1rem',
                  borderRadius: 12,
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid var(--border)',
                  resize: 'none',
                  fontSize: '0.95rem',
                  lineHeight: 1.5,
                  color: 'var(--text-main)',
                  outline: 'none',
                  fontFamily: 'inherit',
                }}
              />
              <VoiceButton onResult={setInput} />
            </div>
            {isSending ? (
              <button onClick={handleCancel} className="btn-secondary" style={{ padding: '0.85rem 1.25rem', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Square size={16} aria-hidden="true" />
                {t('chat.stop')}
              </button>
            ) : (
              <button onClick={handleSend} className="btn-primary" style={{ padding: '0.85rem 1.25rem', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 6 }} disabled={!input.trim() || selectedKeys.length === 0}>
                <Send size={16} aria-hidden="true" />
                {t('chat.send')}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Right sidebar — search */}
      <AnimatePresence>
        {showSearch && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 320, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            style={{ overflow: 'hidden', flexShrink: 0, borderLeft: '1px solid var(--border)', background: 'var(--bg-panel)' }}
          >
            <div style={{ width: 320, display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div style={{ padding: '1rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>{t('chat.message_search')}</span>
                <button onClick={() => setShowSearch(false)} style={iconBtnMuted} aria-label={t('common.close')}>
                  <X size={16} />
                </button>
              </div>
              <div style={{ flex: 1, overflow: 'auto' }}>
                <MessageSearchPanel />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Status toast */}
      {statusMessage && (
        <div style={{
          ...toastBase,
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 1000,
          background: statusMessage.type === 'success' ? 'rgba(16,185,129,0.95)' : statusMessage.type === 'error' ? 'rgba(239,68,68,0.95)' : 'rgba(59,130,246,0.95)',
          color: '#fff', padding: '0.6rem 1.25rem', borderRadius: 100, fontSize: '0.85rem', fontWeight: 600,
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
        }}>
          {statusMessage.text}
        </div>
      )}
      
      {/* Memory search */}

      {/* Export Overlay */}
      {showExportOverlay && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(4px)'
          }}
          onClick={() => setShowExportOverlay(false)}
        >
          <div
            style={{ width: '90vw', height: '85vh', background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '0.5rem' }}>
              <button onClick={() => setShowExportOverlay(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 8 }} aria-label={t('common.close')}>
                <X size={20} />
              </button>
            </div>
            <div style={{ flex: 1, overflow: 'auto' }}>
              <ChatExportPanel />
            </div>
          </div>
        </div>
      )}
      <DeleteConfirmDialog />
      <ClearConfirmDialog />
    </div>
  );
};

export default ChatPanel;
