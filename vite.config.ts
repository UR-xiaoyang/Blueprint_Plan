import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  base: './',
  plugins: [react()],
  optimizeDeps: {
    include: ['framer-motion'],
  },
  server: {
    port: 5173,
    strictPort: false,
  },
})
