import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Gemini: /proxy/gemini/... → https://generativelanguage.googleapis.com/...
      '/proxy/gemini': {
        target: 'https://generativelanguage.googleapis.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/proxy\/gemini/, ''),
        secure: false,
      },
      // OpenRouter: /proxy/openrouter/... → https://openrouter.ai/...
      '/proxy/openrouter': {
        target: 'https://openrouter.ai',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/proxy\/openrouter/, ''),
        secure: false,
      },
      // NVIDIA: /proxy/nvidia/... → https://integrate.api.nvidia.com/...
      '/proxy/nvidia': {
        target: 'https://integrate.api.nvidia.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/proxy\/nvidia/, '/v1'),
        secure: false,
      },
      // Groq: /proxy/groq/... → https://api.groq.com/openai/v1/...
      '/proxy/groq': {
        target: 'https://api.groq.com/openai/v1',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/proxy\/groq/, ''),
        secure: false,
      },
    },
  },
})
