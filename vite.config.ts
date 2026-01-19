import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true
  },
  server: {
    port: 3000,
    open: true
  },
  // Don't use publicDir since assets (Maps/, Character/, etc.) are at root
  // Vite serves all files from root by default
  publicDir: false
});
