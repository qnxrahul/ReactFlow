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
  /**
   * Some dependencies still reference `process.env.NODE_ENV`.
   * In browsers, `process` is not defined; replacing this expression avoids a runtime ReferenceError.
   */
  define: {
    'process.env.NODE_ENV': '"production"',
  },
  build: {
    outDir: 'dist-mfe',
    // Keep a marker file in git (dist-mfe/.gitkeep) so Angular asset copying doesn't fail
    // when React hasn't been built yet.
    emptyOutDir: false,
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

