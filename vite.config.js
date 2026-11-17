import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // The Excel and PDF writers are imported dynamically where they are used, so
  // Rollup gives each its own chunk and neither loads until a download starts.
  build: { target: 'es2020', chunkSizeWarningLimit: 1200 },
  test: { environment: 'node', include: ['src/**/*.test.js'] },
})
