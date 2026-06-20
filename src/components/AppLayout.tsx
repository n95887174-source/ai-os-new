import React, { useEffect, useState, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { History, Search, Menu } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { AppRoutes } from '../routes';
import { GlobalErrorBoundary } from './GlobalErrorBoundary';
import AlertLayer from './AlertLayer/AlertLayer';
import { eventBus, EVENTS, type EventMap } from '../kernel/events/event-bus';
import { settingsService, groupManager, featureFlagService } from '../kernel/instances';
import { setLanguage } from '../i18n/translations';
import { useTranslation } from '../i18n/useTranslation';
import { useChatStoreHydration } from '../stores/useChatStore';
import { NAV_SECTIONS } from '../route-registry';
import type { TranslationKey } from '../i18n/translations';

const navLabelKey: Record<string, TranslationKey> = {};
for (const section of NAV_SECTIONS) {
  navLabelKey[section.id] = section.labelKey;
  for (const item of section.items) {
    navLabelKey[item.id] = item.labelKey;
  }
}

export const AppLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const activeTab = location.pathname.split('/')[1] || 'dashboard';
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [runtimeStatus, setRuntimeStatus] = useState<'online' | 'degraded' | 'offline'>('online');
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 768);
  const [featureFlags, setFeatureFlags] = useState(() => featureFlagService.getAll() ?? {});

  useEffect(() => {
    const check = () => {
      const keys = groupManager?.getAllKeys?.() || [];
      const active = keys.filter(k => k.status === 'active').length;
      if (active === 0) setRuntimeStatus('offline');
      else if (keys.some(k => k.status === 'active' && (k.stats?.extended?.reputationScore || 0) < 0.3)) setRuntimeStatus('degraded');
      else setRuntimeStatus('online');
    };
    check();
    const unsub = eventBus.on(EVENTS.KEY_STATE_CHANGED, check);
    return () => unsub();
  }, []);

  useEffect(() => {
    let rafId: number;
    const onResize = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => setIsDesktop(window.innerWidth >= 768));
    };
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); cancelAnimationFrame(rafId); };
  }, []);

  useEffect(() => {
    const unsub = featureFlagService.onChange(() => setFeatureFlags(featureFlagService.getAll()));
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = eventBus.on(EVENTS.NAVIGATE, (target: string) => {
      navigate(`/${target}`);
    });
    return () => { unsub(); };
  }, [navigate]);

  useEffect(() => {
    const s = settingsService.getSettings();
    document.documentElement.dataset.theme = s.theme;
    document.documentElement.dataset.highContrast = s.themeConfig?.highContrast ? 'true' : 'false';
    document.documentElement.lang = s.language;
    setLanguage(s.language === 'ru' ? 'ru' : 'en');

    const unsub = settingsService.subscribe((settings) => {
      document.documentElement.dataset.theme = settings.theme;
      document.documentElement.dataset.highContrast = settings.themeConfig?.highContrast ? 'true' : 'false';
      document.documentElement.lang = settings.language;
      setLanguage(settings.language === 'ru' ? 'ru' : 'en');
    });
    return () => { unsub(); };
  }, []);

  useChatStoreHydration();

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      eventBus.emit(EVENTS.NAVIGATE as keyof EventMap, `search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  };

  const handleNavigate = useCallback((path: string) => {
    navigate(`/${path}`);
  }, [navigate]);

  return (
    <GlobalErrorBoundary>
      <a href="#main-content" className="skip-nav" style={{ position: 'absolute', left: '-9999px', top: 0, zIndex: 9999, padding: '0.5rem 1rem', background: 'var(--bg-primary)', color: 'var(--text-primary)', textDecoration: 'none', fontSize: '0.875rem' }} onFocus={(e) => { (e.target as HTMLElement).style.left = '0'; }} onBlur={(e) => { (e.target as HTMLElement).style.left = '-9999px'; }}>{t('nav.skip_to_content')}</a>
      <div id="app-wrapper" className="app-container">
        <Sidebar
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(prev => !prev)}
          mobileMenuOpen={mobileMenuOpen}
          onMobileMenuClose={() => setMobileMenuOpen(false)}
          activeTab={activeTab}
          onNavigate={handleNavigate}
          runtimeStatus={runtimeStatus}
          isDesktop={isDesktop}
          featureFlags={featureFlags}
          t={t}
          navLabelKey={navLabelKey}
        />

        <main id="main-content" className="main-content">
          <header className="content-header">
            {!isDesktop && (
              <button onClick={() => setMobileMenuOpen(true)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '0.25rem', marginRight: '0.5rem' }} aria-label={t('nav.open_menu')}>
                <Menu size={20} />
              </button>
            )}
            <div className="search-bar">
              <Search size={18} color="var(--text-muted)" />
              <input type="text" placeholder={t('nav.search_placeholder')} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} onKeyDown={handleSearch} />
            </div>
            <div className="header-actions">
              <div className="session-timer">
                <History size={16} />
                <span>{t('nav.local_session')}</span>
              </div>
              <div className="user-profile">
                <div className="avatar" aria-hidden="true" />
                <span>{t('nav.operator')}</span>
              </div>
            </div>
          </header>

          <section className="content-viewport">
            <div style={{ position: 'absolute', top: '-10%', right: '-5%', width: '50vw', height: '50vw', background: 'radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 60%)', borderRadius: '50%', filter: 'blur(60px)', pointerEvents: 'none', zIndex: 0, display: isDesktop ? 'block' : 'none' }} />
            <div style={{ position: 'absolute', bottom: '-10%', left: '-5%', width: '40vw', height: '40vw', background: 'radial-gradient(circle, rgba(168,85,247,0.1) 0%, transparent 60%)', borderRadius: '50%', filter: 'blur(60px)', pointerEvents: 'none', zIndex: 0, display: isDesktop ? 'block' : 'none' }} />

            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 10 }}
              >
                <AppRoutes />
              </motion.div>
            </AnimatePresence>
          </section>
          <AlertLayer />
        </main>
      </div>
    </GlobalErrorBoundary>
  );
};
