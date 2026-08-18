import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Tests resolve workspace packages to their TypeScript source files
  // via the `development` condition in each package's `exports` field.
  // The built CLI continues to use the `default` condition, which points to dist/.
  resolve: {
    conditions: ['development'],
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['**/*.test.ts'],
    coverage: {
      reporter: ['text', 'json', 'html'],
    },
  },
});
