import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import './core/runtime'
import { runtime } from './core/runtime'

import { BrowserRouter } from 'react-router-dom'

console.log('Mounting React application...');
runtime.start().then(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </React.StrictMode>,
  )
});

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    runtime.shutdown();
  });
}
