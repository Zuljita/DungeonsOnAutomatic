import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  root: './renderer',
  base: './',
  resolve: {
    alias: {
      '@src': path.resolve(__dirname, '../../../src'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'renderer/index.html'),
      },
    },
  },
  server: {
    port: 5174,
  },
});