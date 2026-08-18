import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      'node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/coverage/**',
      'research/phase-zero/tmp/**',
      'pnpm-lock.yaml',
      '**/starters/**/template/**',
      '**/modules/**/template/**',
    ],
  },
  tseslint.configs.recommended,
  {
    files: ['**/*.ts', '**/*.mjs', '**/*.cjs'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  }
);
