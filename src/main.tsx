import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import './core/runtime'
import { bootstrapper } from './core/Bootstrap'

console.log('Mounting React application...');
bootstrapper.init();
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
