import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  base: './',
  server: {
    port: 8079
  },
  plugins: [react()],
  optimizeDeps: {
    include: ['framer-motion'],
  },
})
