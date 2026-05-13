import React, { useState, useCallback, useRef } from 'react';
import type { ApiKey } from '../../types/metrics';
import ProviderManagerView from './ProviderManagerView';
import type { TabId } from './ProviderManagerView';
import { useKeyStore } from '../../stores/useKeyStore';
import { eventBus, EVENTS } from '../../core/events';

const TABS: TabId[] = ['installed', 'browse', 'routing', 'pools', 'intel'];

const ProviderManagerContainer: React.FC = () => {
  const { keys, checkingIds, removeKey, checkHealth, checkAllHealth, toggleKeyStatus, enableAllKeys, disableAllKeys, exportKeys, importKeys } = useKeyStore();
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<ApiKey | null>(null);
  const [initialProfileTab, setInitialProfileTab] = useState<'overview' | 'sandbox'>('overview');
  const [activeTab, setActiveTab] = useState<TabId>('installed');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const totalTokens = keys.reduce((s, k) => s + (k.stats?.totalTokens || 0), 0);
  const totalCost = keys.reduce((s, k) => s + (k.stats?.extended?.estimatedCost || 0), 0);
  const activeCount = keys.filter(k => k.status === 'active').length;
  const errorCount = keys.filter(k => k.status === 'error').length;
  const anyChecking = checkingIds.size > 0;

  const handleCheckHealth = useCallback((id: string) => { checkHealth(id); }, [checkHealth]);
  const handleCheckAllHealth = useCallback(() => { checkAllHealth(); }, [checkAllHealth]);

  const handleExport = useCallback(() => {
    const data = exportKeys();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `providers-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    eventBus.emit(EVENTS.NOTIFICATION, { message: 'Providers exported successfully', type: 'success' });
  }, [exportKeys]);

  const handleImport = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const raw = event.target?.result as string;
        if (!raw?.trim()) throw new Error('File is empty');
        let parsed: unknown;
        try { parsed = JSON.parse(raw); } catch {
          throw new Error('Invalid JSON format. Expected a valid JSON array of provider objects.');
        }
        if (!Array.isArray(parsed)) throw new Error('Invalid structure: expected a JSON array.');
        if (parsed.length === 0) throw new Error('File contains no providers.');
        const missingFields = parsed.filter((item: unknown) => {
          const p = item as Record<string, unknown>;
          return !p.provider || !p.label;
        });
        if (missingFields.length > 0) {
          throw new Error(`${missingFields.length} entr${missingFields.length === 1 ? 'y' : 'ies'} missing required fields (provider, label)`);
        }
        const count = await importKeys(raw);
        eventBus.emit(EVENTS.NOTIFICATION, { message: `Successfully imported ${count} provider(s)`, type: 'success' });
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Unknown error';
        console.warn('[ProviderManager] Failed to import providers:', e);
        eventBus.emit(EVENTS.NOTIFICATION, { message: `Import failed: ${msg}`, type: 'error' });
      }
    };
    reader.readAsText(file);
  }, [importKeys]);

  const handleTabKeyDown = useCallback((e: React.KeyboardEvent) => {
    const idx = TABS.indexOf(activeTab);
    let nextIdx: number;
    if (e.key === 'ArrowRight') nextIdx = (idx + 1) % TABS.length;
    else if (e.key === 'ArrowLeft') nextIdx = (idx - 1 + TABS.length) % TABS.length;
    else if (e.key === 'Home') nextIdx = 0;
    else if (e.key === 'End') nextIdx = TABS.length - 1;
    else return;
    e.preventDefault();
    setActiveTab(TABS[nextIdx]);
  }, [activeTab]);

  const handleSelectProfile = useCallback((key: ApiKey, tab: 'overview' | 'sandbox') => {
    setSelectedProfile(key);
    setInitialProfileTab(tab);
  }, []);

  const handleClearProfile = useCallback(() => {
    setSelectedProfile(null);
  }, []);

  return (
    <ProviderManagerView
      keys={keys}
      checkingIds={checkingIds}
      activeTab={activeTab}
      showAddModal={showAddModal}
      selectedProfile={selectedProfile}
      initialProfileTab={initialProfileTab}
      fileInputRef={fileInputRef}
      totalTokens={totalTokens}
      totalCost={totalCost}
      activeCount={activeCount}
      errorCount={errorCount}
      anyChecking={anyChecking}
      onSetActiveTab={setActiveTab}
      onSetShowAddModal={setShowAddModal}
      onSelectProfile={handleSelectProfile}
      onClearProfile={handleClearProfile}
      onCheckHealth={handleCheckHealth}
      onCheckAllHealth={handleCheckAllHealth}
      onExport={handleExport}
      onImport={handleImport}
      onTabKeyDown={handleTabKeyDown}
      onToggleStatus={toggleKeyStatus}
      onEnableAll={enableAllKeys}
      onDisableAll={disableAllKeys}
      onRemoveKey={removeKey}
    />
  );
};

export default ProviderManagerContainer;
