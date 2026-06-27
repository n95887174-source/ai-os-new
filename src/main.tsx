import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import './theme-init'; // Must run before React mounts — sets dark class on <html>
import { runtime } from './kernel/runtime';
import { eventBus } from './kernel/events/event-bus';
import { BrowserRouter } from 'react-router-dom';

import ErrorBoundary from './components/Common/ErrorBoundary';

import { EVENTS } from './kernel/events/event-names';

// Global unhandled rejection handler — catches ONLY errors that somehow bypass
// both the runtime.start() try/catch and all service-level error handlers.
window.addEventListener('unhandledrejection', (event) => {
  // Only log if not already handled by a local try/catch (runtime.start wraps
  // its await, so any rejection there is already caught). This guard prevents
  // duplicate processing of the boot error.
  if (event.defaultPrevented) return;
  console.error('[UnhandledRejection]', event.reason);
  eventBus.emit(EVENTS.NOTIFICATION, {
    message: `Unhandled async error: ${event.reason instanceof Error ? event.reason.message : String(event.reason)}`,
    type: 'error'
  });
  event.preventDefault();
});

// Memory monitor - logs every 2 seconds (DEV only)
if (import.meta.env.DEV && typeof window !== 'undefined') {
  let memCount = 0;
  setInterval(() => {
    const mem = (performance as unknown as { memory?: { usedJSHeapSize: number; totalJSHeapSize: number } }).memory;
    if (mem) {
      console.log(`[Memory] heap: ${(mem.usedJSHeapSize / 1024 / 1024).toFixed(1)}MB / ${(mem.totalJSHeapSize / 1024 / 1024).toFixed(1)}MB`);
    }
    memCount++;
    if (memCount > 60) {
      console.log('[Memory] Still alive after 2 minutes');
      memCount = 0;
    }
  }, 2000);
}

// Boot the runtime first — React only mounts after all services are registered
try {
  await runtime.start();
} catch (e) {
  console.error('[BOOT] Runtime failed to start:', e);
}

const root = ReactDOM.createRoot(document.getElementById('root')!);

root.render(
  <React.StrictMode>
    <ErrorBoundary name="Root" variant="page">
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>,
);

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    (window as unknown as { __cleanupKeyStore?: () => void }).__cleanupKeyStore?.();
    runtime.shutdown();
  });
}

// Console helpers
interface WindowDebug {
  __getState: () => Promise<Record<string, unknown>>;
  __checkConsistency: () => Promise<unknown>;
  __probeAll: () => Promise<unknown>;
}
const w = window as unknown as WindowDebug;
w.__getState = async () => {
  const { kernel, keyStateProjection, keyService } = await import('./kernel/instances');
  const kState = kernel?.getState();
  const proj = keyStateProjection?.getSnapshot();
  const keys = keyService?.getKeys();
  return {
    keyServiceCount: Array.isArray(keys) ? keys.length : 0,
    projectionCount: Array.isArray(proj) ? proj.length : 0,
    providerCount: kState?.providers ? Object.keys(kState.providers).length : 0,
    dbsample: Array.isArray(keys) && keys.length > 0 ? keys.slice(0, 3).map(k => `${k.provider}/${k.label}`) : [],
  };
};

w.__checkConsistency = async () => {
  const { truthConsistencyMonitor, kernel, keyStateProjection } = await import('./kernel/instances');
  const kState = kernel?.getState();
  const proj = keyStateProjection?.getSnapshot();
  if (!kState || !proj) { console.warn('[Consistency] kernel or projection not ready'); return null; }
  const keyMap: Record<string, unknown> = {};
  for (const k of proj) { keyMap[k.id] = k; }
  const report = truthConsistencyMonitor?.check(kState.providers, keyMap);
  console.log('[Consistency] Report:', JSON.stringify(report, null, 2));
  return report;
};

w.__probeAll = async () => {
  const { probeService } = await import('./kernel/instances');
  if (probeService && typeof probeService.probeAll === 'function') {
    const result = await probeService.probeAll();
    console.log('[Probe] probeAll completed:', JSON.stringify(result));
    return result;
  }
  console.warn('[Probe] probeService not available');
  return null;
};
