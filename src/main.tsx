import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import './core/runtime'
import { bootstrapper } from './core/Bootstrap'

import { BrowserRouter } from 'react-router-dom'

console.log('Mounting React application...');
bootstrapper.init().then(() => {
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
    bootstrapper.shutdown();
  });
}
