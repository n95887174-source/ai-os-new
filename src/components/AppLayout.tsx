import React, { useEffect, useState, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { History, Search, Menu } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { AppRoutes } from '../routes';
import { GlobalErrorBoundary } from './GlobalErrorBoundary';
import AlertLayer from './AlertLayer/AlertLayer';
import { CommandPalette, useCommandPalette } from './CommandPalette/CommandPalette';
import { Breadcrumbs } from './Common/Breadcrumbs';
import { OnboardingWizard } from './OnboardingWizard/OnboardingWizard';
import { KeyboardShortcutsModal } from './Common/KeyboardShortcutsModal';
import { eventBus, EVENTS } from '../kernel/events/event-bus';
import { settingsService, groupManager, featureFlagService } from '../kernel/instances';
import { setLanguage, type TranslationKey } from '../i18n/translations';
import { useTranslation } from '../i18n/useTranslation';
import { useChatStoreHydration } from '../stores/useChatStore';
import { NAV_SECTIONS, type UserLevel } from '../route-registry';

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
  const [runtimeStatus, setRuntimeStatus] = useState<'online' | 'degraded' | 'offline'>('online');
  const { isOpen: isPaletteOpen, open: openPalette, close: closePalette } = useCommandPalette();
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 768);
  const [featureFlags, setFeatureFlags] = useState(() => featureFlagService.getAll() ?? {});

  const [userLevel, setUserLevel] = useState<UserLevel>(() => {
    try { return (localStorage.getItem('mavis:userLevel') as UserLevel) || 'L0'; } catch { return 'L0'; }
  });
  const handleUserLevelChange = useCallback((level: UserLevel) => {
    setUserLevel(level);
    try { localStorage.setItem('mavis:userLevel', level); } catch { /* noop */ }
  }, []);

  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '?' && !e.ctrlKey && !e.metaKey && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
        setShortcutsOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

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
          userLevel={userLevel}
          onUserLevelChange={handleUserLevelChange}
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
            <button
              onClick={openPalette}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8,
                padding: '0.4rem 0.875rem',
                cursor: 'pointer',
                color: 'var(--text-muted)',
                minWidth: 220,
              }}
              aria-label={t('palette.placeholder')}
            >
              <Search size={16} />
              <span style={{ flex: 1, textAlign: 'left', fontSize: '0.875rem' }}>{t('palette.placeholder')}</span>
              <kbd style={{
                padding: '0.1rem 0.35rem',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 4,
                fontSize: '0.68rem',
                fontFamily: 'monospace',
              }}>⌘K</kbd>
            </button>
            <Breadcrumbs path={location.pathname} t={t as (key: TranslationKey) => string} />
            <div className="header-actions">
              <div className="session-timer">
                <History size={16} />
                <span>{t('nav.local_session')}</span>
              </div>
              <div className="user-profile">
                <div className="avatar" aria-hidden="true" />
                <span>{t('nav.operator')}</span>
              </div>
              <button
                onClick={() => setShortcutsOpen(true)}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '0.25rem 0.5rem', fontSize: '0.85rem', fontWeight: 700, borderRadius: 6 }}
                title="Keyboard shortcuts"
                aria-label="Keyboard shortcuts"
              >
                ?
              </button>
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
          <CommandPalette open={isPaletteOpen} onClose={closePalette} t={t as (key: TranslationKey) => string} />
          <OnboardingWizard t={t as (key: TranslationKey) => string} />
          <KeyboardShortcutsModal isOpen={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
        </main>
      </div>
    </GlobalErrorBoundary>
  );
};
