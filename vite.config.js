import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Plus de proxy nécessaire : les appels Anthropic sont directs depuis claude.js
    // avec le header anthropic-dangerous-direct-browser-access: true
  },
})
