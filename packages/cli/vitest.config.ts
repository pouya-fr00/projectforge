import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    exclude: ['**/node_modules/**', '**/dist/**'],
    // Run test files sequentially — packaging-safety and installed-artifact
    // tests create/consume the same tarball path and must not race.
    fileParallelism: false,
    // Long-running integration hooks (tarball pack, pnpm install).
    hookTimeout: 120_000,
  },
});
