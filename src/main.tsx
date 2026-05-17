console.log('main.tsx executing...');
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import './core/runtime'
import { runtime } from './core/runtime'

import { BrowserRouter } from 'react-router-dom'

// Render shell immediately, start runtime async
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)

runtime.start().then(success => {
  if (!success) {
    console.warn('[Main] Runtime started in degraded/error state');
  }
});

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    runtime.shutdown();
  });
}
