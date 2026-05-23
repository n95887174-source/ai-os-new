import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { runtime } from './kernel/runtime'
import { persistSqliteDb } from './kernel/services/storage/sqlite-storage'
import { BrowserRouter } from 'react-router-dom'

// Persist SQLite on page close/refresh
window.addEventListener('beforeunload', () => { persistSqliteDb(); });
// Persist when tab hidden (mobile, switching tabs)
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') persistSqliteDb();
});

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element with id="root" not found. Ensure your HTML has <div id="root"></div>');
}

function Root() {
  const [ready, setReady] = useState(runtime.isReady());
  const [keyCount, setKeyCount] = useState(0);

  useEffect(() => {
    if (!ready) {
      runtime.start().then(success => {
        if (!success) console.warn('[Main] Runtime started in degraded/error state');
        setReady(true);
        if (window.location.hash === '#reset' && !sessionStorage.getItem('auto_keys')) {
          sessionStorage.setItem('auto_keys', '1');
          // Wait a tick for React to render and register event listeners
          setTimeout(async () => {
            const { keyService } = await import('./kernel/instances');
            console.log('[#reset] Keys before clear:', keyService.getKeys().length);
            for (const k of [...keyService.getKeys()]) await keyService.removeKey(k.id);
            const items: Array<[string, string, string]> = [
              // Add your own keys here, e.g.:
              // ['Groq', 'gsk_...', 'Groq-1'],
              // ['Gemini', 'AIza...', 'Gemini-1'],
            ];
            let added = 0;
            for (const [p, k, l] of items) {
              try {
                await keyService.addKey({provider:p, key:k, label:l, status:'active', maxBudget: null});
                added++;
              } catch (e) {
                console.error(`[#reset] Failed to add ${p}/${l}:`, e);
              }
            }
            console.log(`[#reset] Added ${added}/${items.length} keys`);
            setKeyCount(added);
            // Force persist
            await persistSqliteDb();
            const finalCount = keyService.getKeys().length;
            console.log('[#reset] Done — keys in service:', finalCount);
            // If keys were not added successfully, allow retry without clearing sessionStorage
            if (finalCount === 0) sessionStorage.removeItem('auto_keys');
          }, 0);
        }
      });
    }
  }, [ready]);

  if (!ready) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', background: '#0b0f1a', color: '#94a3b8',
        fontFamily: "'Inter', sans-serif", flexDirection: 'column', gap: '1rem'
      }}>
        <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f8fafc', letterSpacing: '0.05em' }}>SuperAgents OS</div>
        <div style={{ width: 160, height: 2, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ height: '100%', background: 'linear-gradient(90deg, #3b82f6, #6366f1)', borderRadius: 2, animation: 'pulse 1.5s ease-in-out infinite' }} />
        </div>
        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Initializing...</div>
      </div>
    );
  }

  return (
    <React.StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </React.StrictMode>
  );
}

ReactDOM.createRoot(rootElement).render(<Root />);

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    persistSqliteDb();
    runtime.shutdown();
  });
}
