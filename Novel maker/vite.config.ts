/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import savesPlugin from './server/savesPlugin';

export default defineConfig({
  plugins: [react(), savesPlugin()],
  test: {
    setupFiles: ['src/test/setup.ts'],
  },
  server: {
    port: 5173,
    // Projects are written to ./saves — don't reload the page when they change.
    watch: { ignored: ['**/saves/**'] },
    open: true,
  },
});
