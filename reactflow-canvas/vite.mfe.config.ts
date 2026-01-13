import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Micro-frontend style build:
 * - Emits an ES module that attaches window.ReactflowCanvasMFE = { mount, unmount }.
 * - Host app (Angular) loads the module and calls mount/unmount.
 */
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist-mfe',
    emptyOutDir: true,
    sourcemap: true,
    cssCodeSplit: false,
    lib: {
      entry: 'src/micro-frontend.tsx',
      formats: ['es'],
      fileName: () => 'reactflow-canvas.mfe.js',
    },
    rollupOptions: {
      output: {
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith('.css')) return 'reactflow-canvas.mfe.css'
          return assetInfo.name ?? 'asset-[hash][extname]'
        },
      },
    },
  },
})

