import js from '@eslint/js';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import unusedImports from 'eslint-plugin-unused-imports';
import tseslint from 'typescript-eslint';

export default [
  {
    ignores: ['dist/**', 'node_modules/**', 'public/**/*', 'vite.config.ts'],
  },

  js.configs.recommended,

  ...tseslint.configs.recommended,

  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      react,
      'react-hooks': reactHooks,
      'unused-imports': unusedImports,
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
    rules: {
      /* TypeScript */
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/ban-ts-comment': ['error', { 'ts-ignore': 'allow-with-description' }],
      '@typescript-eslint/consistent-type-imports': 'warn',

      /* React */
      'react/jsx-uses-vars': 'error',
      'react/jsx-no-undef': 'error',
      'react/react-in-jsx-scope': 'off',

      /* React Hooks */
      ...reactHooks.configs.recommended.rules,

      /* Unused Imports */
      'unused-imports/no-unused-imports': 'error',

      /* General JS */
      'no-console': ['error'],
      'no-debugger': 'error',
      'prefer-const': 'error',
      'no-var': 'error',
      eqeqeq: 'error',
      curly: ['error', 'all'],
      semi: ['error', 'always'],
    },
    languageOptions: {
      parserOptions: {
        project: './tsconfig.eslint.json',
      },
    },
  },
];
