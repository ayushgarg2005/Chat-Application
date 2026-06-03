import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/user': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/connected': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/unread-senders': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/messages': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/chatbot': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
