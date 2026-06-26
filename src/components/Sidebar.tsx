import React, { useState, useMemo } from 'react';
import { Search, X, PanelRightOpen, PanelRightClose, Star, History, ChevronDown } from 'lucide-react'
import { motion } from 'framer-motion';
import type { TranslationKey } from '../i18n/translations';
import { NAV_SECTIONS, type UserLevel } from '../route-registry'

const RECENT_KEY = 'mavis:palette:recent';
function getRecent(): string[] {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); } catch { return []; }
}

interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  mobileMenuOpen: boolean;
  onMobileMenuClose: () => void;
  activeTab: string;
  onNavigate: (path: string) => void;
  runtimeStatus: 'online' | 'degraded' | 'offline';
  isDesktop: boolean;
  featureFlags: Record<string, boolean>;
  userLevel: UserLevel;
  onUserLevelChange: (level: UserLevel) => void;
  t: (key: TranslationKey) => string;
  navLabelKey: Record<string, TranslationKey>;
}


const PINNED_KEY = 'mavis:sidebar:pinned';
function getPinned(): string[] {
  try { return JSON.parse(localStorage.getItem(PINNED_KEY) || '[]'); } catch { return []; }
}
function savePinned(pinned: string[]) {
  try { localStorage.setItem(PINNED_KEY, JSON.stringify(pinned)); } catch { /* noop */ }
}

export const Sidebar: React.FC<SidebarProps> = ({
  isCollapsed, onToggleCollapse, mobileMenuOpen, onMobileMenuClose,
  activeTab, onNavigate, runtimeStatus, isDesktop, featureFlags, userLevel, onUserLevelChange, t, navLabelKey,
}) => {
  const [sidebarSearchQuery, setSidebarSearchQuery] = useState('');
  const [pinned, setPinned] = useState<string[]>(getPinned);

  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(() => {
    try { return new Set<string>(JSON.parse(localStorage.getItem('mavis:collapsedSections') || '[]')); } catch { return new Set<string>(); }
  });
  const toggleSection = (sectionId: string) => {
    setCollapsedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) next.delete(sectionId); else next.add(sectionId);
      try { localStorage.setItem('mavis:collapsedSections', JSON.stringify([...next])); } catch { /* noop */ }
      return next;
    });
  };

  return (
    <>
      {!isDesktop && mobileMenuOpen && (
        <div onClick={onMobileMenuClose} style={{ position: 'fixed', inset: 0, zIndex: 99, background: 'rgba(0,0,0,0.5)' }} />
      )}
      <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`} style={!isDesktop ? { display: mobileMenuOpen ? 'flex' : 'none', position: 'fixed', zIndex: 100, height: '100vh' } : undefined}>
        <div className="sidebar-header">
          {!isDesktop && (
            <button onClick={onMobileMenuClose} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '0.25rem', marginRight: '0.5rem' }} aria-label="Close">
              <X size={20} />
            </button>
          )}
          <div className="logo-container">
            <div className="logo-orb">
              <div className="logo-core" />
            </div>
            {!isCollapsed && (
              <span className="logo-text">SUPER-AGENTS <span className="logo-suffix">OS</span></span>
            )}
          </div>
          {isDesktop && (
            <button onClick={onToggleCollapse} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '0.5rem', marginLeft: 'auto' }} aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
              {isCollapsed ? <PanelRightOpen size={18} /> : <PanelRightClose size={18} />}
            </button>
          )}
        </div>

        <div style={{ padding: '0.5rem 1rem' }}>
          <div className="provider-search-wrapper" style={{ marginBottom: '0.5rem' }}>
            <Search className="provider-search-icon" size={16} />
            <input
              type="text"
              placeholder={t('nav.search')}
              aria-label={t('nav.search')}
              value={sidebarSearchQuery}
              onChange={(e) => setSidebarSearchQuery(e.target.value)}
              className="provider-search-input"
              style={{ fontSize: '0.8rem' }}
            />
          </div>
        </div>

        {!isCollapsed && !sidebarSearchQuery && (
          <QuickAccess
            pinned={pinned}
            onTogglePin={(id) => {
              const next = pinned.includes(id) ? pinned.filter(p => p !== id) : [...pinned, id];
              setPinned(next);
              savePinned(next);
            }}
            activeTab={activeTab}
            onNavigate={(id) => { onNavigate(id); onMobileMenuClose(); }}
            navLabelKey={navLabelKey}
            t={t}
          />
        )}

        <nav className="sidebar-nav">
          {NAV_SECTIONS.map((section) => {
            const isCollapsed = collapsedSections.has(section.id);
            const levelRank = { L0: 0, L1: 1, L2: 2 };
            const minRank = levelRank[userLevel];
            const q = sidebarSearchQuery.toLowerCase();
            const hasSearch = q.length > 0 || isCollapsed;
            const visibleItems = section.items.filter(item => {
              if (levelRank[item.level || 'L2'] > minRank) return false;
              if (q && !t(navLabelKey[item.id] ?? '').toLowerCase().includes(q)) return false;
              return true;
            });
            if (visibleItems.length === 0 && !q) return null;
            const sectionVisible = visibleItems.length > 0;
            if (!sectionVisible && !q) return null;
            return (
              <React.Fragment key={section.id}>
                {!isCollapsed && (
                  <div
                    className="nav-section-header"
                    onClick={() => toggleSection(section.id)}
                    style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', userSelect: 'none' }}
                    title={isCollapsed ? 'Expand section' : 'Collapse section'}
                  >
                    <span>{t(navLabelKey[section.id] ?? 'nav.overview')}</span>
                    <ChevronDown
                      size={14}
                      style={{
                        color: '#475569',
                        transition: 'transform 0.2s',
                      }}
                    />
                  </div>
                )}
                {(hasSearch ? true : !isCollapsed) && visibleItems.map(item => {
                  const isDisabled = !!(item.featureFlag && !featureFlags[item.featureFlag]);
                  if (isDisabled && !q) return null;
                  return (
                    <button
                      key={item.id}
                      onClick={() => { if (!isDisabled) { onNavigate(item.id); onMobileMenuClose(); } }}
                      className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
                      aria-current={activeTab === item.id ? 'page' : undefined}
                      disabled={isDisabled}
                      style={{
                        '--active-color': item.color,
                        justifyContent: isCollapsed ? 'center' : 'flex-start',
                        opacity: isDisabled ? 0.3 : 1,
                        cursor: isDisabled ? 'default' : 'pointer',
                      } as React.CSSProperties}
                    >
                      <span className="nav-icon">{item.icon}</span>
                      {!isCollapsed && <span className="nav-label">{t(navLabelKey[item.id] ?? 'nav.overview')}</span>}
                      {!isCollapsed && activeTab === item.id && (
                        <motion.div layoutId="active-pill" className="active-pill" />
                      )}
                    </button>
                  );
                })}
              </React.Fragment>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          {!isCollapsed && (
            <div style={{ padding: '0.25rem 1rem', display: 'flex', gap: 2, borderBottom: '1px solid rgba(255,255,255,0.06)', marginBottom: 2 }}>
              {(['L0', 'L1', 'L2'] as UserLevel[]).map(lvl => (
                <button
                  key={lvl}
                  onClick={() => onUserLevelChange(lvl)}
                  style={{
                    flex: 1, padding: '0.25rem 0', borderRadius: 4, border: 'none',
                    background: userLevel === lvl ? 'rgba(168,85,247,0.2)' : 'transparent',
                    color: userLevel === lvl ? '#a855f7' : '#64748b',
                    fontSize: '0.6rem', fontWeight: 700, cursor: 'pointer',
                    textTransform: 'uppercase', letterSpacing: '0.05em',
                  }}
                  title={lvl === 'L0' ? 'Chat mode' : lvl === 'L1' ? 'Creator mode' : 'Admin mode'}
                >
                  {lvl === 'L0' ? '💬' : lvl === 'L1' ? '⚡' : '⚙️'} {lvl}
                </button>
              ))}
            </div>
          )}
          <div className="system-status">
            <div className={`status-indicator ${runtimeStatus}`} />
            {!isCollapsed && <span role="status" aria-live="polite">{runtimeStatus === 'offline' ? 'No providers' : runtimeStatus === 'degraded' ? 'Degraded' : t('nav.runtime_online')}</span>}
          </div>
        </div>
      </aside>
    </>
  );
};

// ─── Quick Access — pinned + recent items ────────────────────────────────────
interface QuickAccessProps {
  pinned: string[];
  onTogglePin: (id: string) => void;
  activeTab: string;
  onNavigate: (id: string) => void;
  navLabelKey: Record<string, TranslationKey>;
  t: (key: TranslationKey) => string;
}

const QuickAccess: React.FC<QuickAccessProps> = ({
  pinned, onTogglePin, activeTab, onNavigate, navLabelKey, t,
}) => {
  const recent = useMemo(() => {
    return getRecent().filter(id => id !== activeTab);
  }, [activeTab]);

  const visiblePinned = useMemo(() => {
    return pinned.filter(id => id !== activeTab);
  }, [pinned, activeTab]);

  if (visiblePinned.length === 0 && recent.length === 0) return null;

  return (
    <div style={{ padding: '0 0.75rem 0.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', marginBottom: '0.25rem' }}>
      {visiblePinned.length > 0 && (
        <div style={{ marginBottom: '0.25rem' }}>
          <div style={{ fontSize: '0.6rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0.25rem 0.5rem' }}>{t('nav.quick_access')}</div>
          {visiblePinned.slice(0, 5).map(id => (
            <div key={id} style={{ display: 'flex', alignItems: 'center' }}>
              <button
                onClick={() => onNavigate(id)}
                style={{
                  flex: 1, display: 'flex', alignItems: 'center', gap: 6, padding: '0.3rem 0.5rem',
                  background: 'none', border: 'none', color: activeTab === id ? '#60a5fa' : '#94a3b8',
                  fontSize: '0.75rem', cursor: 'pointer', borderRadius: 6, textAlign: 'left',
                  fontWeight: activeTab === id ? 700 : 400,
                }}
              >
                <Star size={10} color="#f59e0b" fill="#f59e0b" />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t(navLabelKey[id] ?? 'nav.overview')}</span>
              </button>
              <button
                onClick={() => onTogglePin(id)}
                style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', padding: 4 }}
                aria-label="Unpin"
              >
                <X size={10} />
              </button>
            </div>
          ))}
        </div>
      )}
      {recent.length > 0 && visiblePinned.length < 3 && (
        <div>
          <div style={{ fontSize: '0.6rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0.25rem 0.5rem' }}>{t('palette.recent')}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            {recent.slice(0, 4).map(id => (
              <button
                key={id}
                onClick={() => onNavigate(id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4, padding: '0.2rem 0.5rem',
                  background: activeTab === id ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)', borderRadius: 4,
                  color: activeTab === id ? '#60a5fa' : '#94a3b8', fontSize: '0.7rem', cursor: 'pointer',
                  fontWeight: activeTab === id ? 700 : 400,
                }}
              >
                <History size={10} />
                {t(navLabelKey[id] ?? 'nav.overview')}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
