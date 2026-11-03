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
    // Never drift to 5174 when 5173 is busy: two servers would write the same saves folder.
    strictPort: true,
    // Projects are written to ./saves — don't reload the page when they change.
    watch: { ignored: ['**/saves/**'] },
    open: true,
  },
});
