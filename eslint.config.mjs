// eslint.config.mjs

// Import necessary modules
import { FlatCompat } from '@eslint/eslintrc'
import eslintJs from '@eslint/js'
import parserTypeScript from '@typescript-eslint/parser'
import parserAstro from 'astro-eslint-parser'
import eslintConfigPrettier from 'eslint-config-prettier'
import globals from 'globals'
import path from 'path'
import { fileURLToPath } from 'url'

// Get the current directory name
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Create a FlatCompat instance
const compat = new FlatCompat({
  baseDirectory: __dirname,
  // Optional: resolvePlugins and resolveExtends can be helpful if you have complex setups
  // resolvePlugins: true,
  // resolveExtends: true,
})

// Export the configuration
export default [
  // --- 0. Global Ignores ---
  {
    ignores: [
      'node_modules/',
      'dist/',
      'docs/',
      'build/',
      '.astro/',
      'coverage/',
      '*.min.js',
    ],
  },

  // --- 1. ESLint Recommended Rules (for general JS/TS files) ---
  eslintJs.configs.recommended,

  // --- 2. TypeScript Specific Rules ---
  ...compat.extends('plugin:@typescript-eslint/recommended'),
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: parserTypeScript,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        // project: './tsconfig.json', // Uncomment if you use type-aware linting
      },
    },
    rules: {
      // Add custom TypeScript rules here.
      // Example: '@typescript-eslint/no-explicit-any': 'off',
    },
  },

  // --- 3. Astro Specific Rules ---
  ...compat.extends('plugin:astro/recommended'),
  {
    files: ['*.astro'],
    languageOptions: {
      parser: parserAstro,
      parserOptions: {
        parser: parserTypeScript,
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    rules: {
      // Custom Astro-specific rules
    },
  },

  // --- 4. JSX A11y Rules ---
  ...compat.extends('plugin:jsx-a11y/recommended'),
  {
    files: ['**/*.jsx', '**/*.tsx', '*.astro'],
    rules: {
      // Any custom overrides for jsx-a11y rules can go here.
    },
  },

  // --- 5. Prettier Integration (MUST be the last configuration) ---
  eslintConfigPrettier,

  // --- General Language Options (for all files) ---
  {
    files: ['**/*.js', '**/*.jsx', '**/*.ts', '**/*.tsx', '**/*.astro'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        console: 'readonly',
      },
    },
  },
]
