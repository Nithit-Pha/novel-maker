// Vite plugin: serves the local saves folder API at /api/saves for both
// `npm run dev` (what the launcher runs) and `npm run preview`.

import path from 'node:path';
import type { Plugin } from 'vite';
import { createSavesHandler } from './savesApi';

export default function savesPlugin(dirName = 'saves'): Plugin {
  let handler: ReturnType<typeof createSavesHandler>;
  return {
    name: 'novel-flow-saves',
    configResolved(config) {
      handler = createSavesHandler(path.resolve(config.root, dirName));
    },
    configureServer(server) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      server.middlewares.use('/api/saves', handler as any);
    },
    configurePreviewServer(server) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      server.middlewares.use('/api/saves', handler as any);
    },
  };
}
