import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    server: {
      deps: {
        external: ['better-sqlite3'],
      },
    },
  },
  ssr: {
    external: ['better-sqlite3'],
  },
  optimizeDeps: {
    exclude: ['better-sqlite3'],
  },
});
