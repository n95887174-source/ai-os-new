console.log('main.tsx executing...');
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { runtime } from './kernel/runtime'

import { BrowserRouter } from 'react-router-dom'

// Render shell immediately, start runtime async
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element with id="root" not found. Ensure your HTML has <div id="root"></div>');
}
ReactDOM.createRoot(rootElement).render(
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
