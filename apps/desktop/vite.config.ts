import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  root: './renderer',
  base: './',
  resolve: {
    alias: {
      '@src': path.resolve(__dirname, '../../src'),
    },
  },
  build: {
    outDir: '../dist/renderer',
    emptyOutDir: true,
  },
  server: {
    port: 5174,
  },
});