import js from '@eslint/js'
import { defineConfig, globalIgnores } from 'eslint/config'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default defineConfig([
  globalIgnores(['dist', 'coverage']),
  {
    files: ['**/*.ts'],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    languageOptions: { globals: globals.node },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      // Strict typing (constitution, Principle II).
      'no-restricted-syntax': [
        'error',
        { selector: 'TSAsExpression', message: 'Do not use "as". Narrow or validate the value instead.' },
        { selector: 'TSTypeAssertion', message: 'Do not use type assertions. Narrow or validate the value instead.' },
        { selector: 'TSNonNullExpression', message: 'Do not use "!". Handle the empty case instead.' },
        { selector: 'TSAnyKeyword', message: 'Do not use "any". Write the real type.' },
        { selector: 'TSUnknownKeyword', message: 'Do not use "unknown". Write the real type.' },
        { selector: 'TSNeverKeyword', message: 'Do not use "never". Write the real type.' },
      ],
    },
  },
])
