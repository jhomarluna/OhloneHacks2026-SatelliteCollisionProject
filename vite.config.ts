import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: '/OhloneHacks2026-SatelliteCollisionProject/',
  plugins: [react()],
  server: {
    proxy: {
      '/celestrak': {
        target: 'https://celestrak.org',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/celestrak/, ''),
      },
    },
  },
})
