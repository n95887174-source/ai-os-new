import React, { useState, useMemo } from 'react';
import { Search, X, PanelRightOpen, PanelRightClose } from 'lucide-react'
import { motion } from 'framer-motion';
import type { TranslationKey } from '../i18n/translations';
import { NAV_SECTIONS, type RouteMeta } from '../route-registry'

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
  t: (key: TranslationKey) => string;
  navLabelKey: Record<string, TranslationKey>;
}

const navItems: ({ id: string; type: 'header'; labelKey: TranslationKey } | (RouteMeta & { type: 'item' }))[] = NAV_SECTIONS.flatMap(section => [
  { id: section.id, type: 'header' as const, labelKey: section.labelKey },
  ...section.items.map(item => ({ ...item, type: 'item' as const })),
]);

export const Sidebar: React.FC<SidebarProps> = ({
  isCollapsed, onToggleCollapse, mobileMenuOpen, onMobileMenuClose,
  activeTab, onNavigate, runtimeStatus, isDesktop, featureFlags, t, navLabelKey,
}) => {
  const [sidebarSearchQuery, setSidebarSearchQuery] = useState('');

  const visibleNavItems = useMemo(() => {
    const q = sidebarSearchQuery.toLowerCase();
    const visibleItemIds = new Set(
      navItems
        .filter((item): item is RouteMeta & { type: 'item' } => item.type === 'item')
        .filter((item) => {
          if (item.featureFlag && !featureFlags[item.featureFlag]) return false;
          if (q && !t(navLabelKey[item.id] ?? 'nav.overview').toLowerCase().includes(q)) return false;
          return true;
        })
        .map((item) => item.id),
    );
    return navItems.filter((item) => {
      if (item.type === 'item') return visibleItemIds.has(item.id);
      const section = NAV_SECTIONS.find((s) => s.id === item.id);
      return section?.items.some((meta) => visibleItemIds.has(meta.id)) ?? false;
    });
  }, [featureFlags, sidebarSearchQuery, t, navLabelKey]);

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
        <nav className="sidebar-nav">
          {visibleNavItems.map((item) => (
            item.type === 'header' ? (
              !isCollapsed && (
                <div key={item.id} className="nav-section-header">{t(navLabelKey[item.id] ?? 'nav.overview')}</div>
              )
            ) : (
              <button
                key={item.id}
                onClick={() => { onNavigate(item.id); onMobileMenuClose(); }}
                className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
                aria-current={activeTab === item.id ? 'page' : undefined}
                style={{
                  '--active-color': item.color,
                  justifyContent: isCollapsed ? 'center' : 'flex-start'
                } as React.CSSProperties}
              >
                <span className="nav-icon">{item.icon}</span>
                {!isCollapsed && <span className="nav-label">{t(navLabelKey[item.id] ?? 'nav.overview')}</span>}
                {!isCollapsed && activeTab === item.id && (
                  <motion.div layoutId="active-pill" className="active-pill" />
                )}
              </button>
            )
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="system-status">
            <div className={`status-indicator ${runtimeStatus}`} />
            {!isCollapsed && <span role="status" aria-live="polite">{runtimeStatus === 'offline' ? 'No providers' : runtimeStatus === 'degraded' ? 'Degraded' : t('nav.runtime_online')}</span>}
          </div>
        </div>
      </aside>
    </>
  );
};
