import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Web Component build:
 * - Emits an ES module that registers <reactflow-canvas>.
 * - Intended to be copied/served by the Angular app and loaded via <script type="module">.
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
    outDir: 'dist-wc',
    // Keep a marker file in git (dist-wc/.gitkeep) so Angular asset copying doesn't fail
    // when React hasn't been built yet.
    emptyOutDir: false,
    sourcemap: true,
    cssCodeSplit: false,
    lib: {
      entry: 'src/web-component.tsx',
      formats: ['es'],
      fileName: () => 'reactflow-canvas.wc.js',
    },
    rollupOptions: {
      output: {
        assetFileNames: (assetInfo) => {
          // Ensure predictable filenames so host apps can reference them.
          if (assetInfo.name?.endsWith('.css')) return 'reactflow-canvas.wc.css'
          return assetInfo.name ?? 'asset-[hash][extname]'
        },
      },
    },
  },
})

