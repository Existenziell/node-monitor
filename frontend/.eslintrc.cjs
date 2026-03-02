'use strict';

module.exports = {
  root: true,
  env: { browser: true, es2022: true },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: { jsx: true },
    project: false,
  },
  plugins: ['@typescript-eslint', 'react', 'react-hooks', 'react-refresh'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/strict',
    'plugin:react/recommended',
    'plugin:react/jsx-runtime',
    'plugin:react-hooks/recommended',
  ],
  settings: {
    react: { version: 'detect' },
  },
  overrides: [
    {
      files: ['src/**/*.{ts,tsx}'],
      rules: {
        'react/prop-types': 'off',
        'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
        'no-unused-vars': 'off',
        '@typescript-eslint/no-unused-vars': [
          'error',
          { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
        ],
        '@typescript-eslint/no-explicit-any': 'warn',
        '@typescript-eslint/no-non-null-assertion': 'warn',
        eqeqeq: ['error', 'always'],
        curly: ['error', 'all'],
        'no-console': ['warn', { allow: ['warn', 'error'] }],
        'no-debugger': 'error',
        'prefer-const': 'error',
        'no-var': 'error',
      },
    },
    {
      files: ['src/**/*.test.{ts,tsx}', 'src/test/**/*.{ts,tsx}'],
      rules: {
        'no-console': 'off',
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-non-null-assertion': 'off',
      },
    },
    {
      files: ['src/contexts/**/*.tsx'],
      rules: {
        'react-refresh/only-export-components': 'off',
      },
    },
  ],
  ignorePatterns: ['dist/', 'node_modules/', '*.config.js', '*.config.ts', 'public/'],
};
