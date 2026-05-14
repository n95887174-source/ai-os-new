import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import pkg from './package.json' with { type: 'json' }

// https://vite.dev/config/
export default defineConfig({
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(pkg.version),
  },
  plugins: [react()],
  server: {
    proxy: {
      '/proxy/gemini': {
        target: process.env.VITE_PROXY_GEMINI || 'https://generativelanguage.googleapis.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/proxy\/gemini/, ''),
        secure: false,
      },
      '/proxy/openrouter': {
        target: process.env.VITE_PROXY_OPENROUTER || 'https://openrouter.ai',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/proxy\/openrouter/, ''),
        secure: false,
      },
      '/proxy/nvidia': {
        target: process.env.VITE_PROXY_NVIDIA || 'https://integrate.api.nvidia.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/proxy\/nvidia/, '/v1'),
        secure: false,
      },
      '/proxy/groq': {
        target: process.env.VITE_PROXY_GROQ || 'https://api.groq.com/openai/v1',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/proxy\/groq/, ''),
        secure: false,
      },
    },
  },
})
