import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { runtime } from './kernel/runtime'
import { BrowserRouter } from 'react-router-dom'

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element with id="root" not found. Ensure your HTML has <div id="root"></div>');
}

function Root() {
  const [ready, setReady] = useState(runtime.isReady());

  useEffect(() => {
    if (!ready) {
      runtime.start().then(success => {
        if (!success) console.warn('[Main] Runtime started in degraded/error state');
        setReady(true);
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
    runtime.shutdown();
  });
}
