import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/**
 * Valores técnicos de atributos permitidos no site público.
 * Qualquer outro texto em JSX (filhos ou atributos como alt, aria-label, title)
 * precisa vir do conteúdo editável ou de src/site/a11yLabels.ts.
 */
const TECHNICAL_ATTRIBUTE_VALUES = [
  'button',
  'submit',
  '_blank',
  'noopener noreferrer',
  'lazy',
  'eager',
  'async',
  'high',
  'low',
  'auto',
  'true',
  'false',
  // Spec 002: blocos de foto sem endereço e mapa incorporado.
  'img',
  'no-referrer-when-downgrade',
];

export default defineConfig([
  globalIgnores([
    'dist',
    'dist-server',
    'dist-report',
    'coverage',
    'playwright-report',
    'test-results',
  ]),

  js.configs.recommended,
  tseslint.configs.recommended,

  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      react.configs.flat.recommended,
      react.configs.flat['jsx-runtime'],
      reactHooks.configs.flat.recommended,
      jsxA11y.flatConfigs.recommended,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    settings: {
      react: { version: 'detect' },
    },
    rules: {
      // Conteúdo é sempre renderizado como texto (CLAUDE.md §6.8).
      'react/no-danger': 'error',
    },
  },

  // Site público: nenhum texto fixo (CLAUDE.md §6.1).
  {
    files: ['src/site/**/*.tsx'],
    // Testes de componentes usam textos de exemplo; a regra vale para o código do site.
    ignores: ['src/site/**/*.test.tsx'],
    rules: {
      'react/jsx-no-literals': [
        'error',
        {
          noStrings: true,
          ignoreProps: false,
          noAttributeStrings: false,
          allowedStrings: TECHNICAL_ATTRIBUTE_VALUES,
        },
      ],
    },
  },

  // Configs, scripts e testes rodam no Node.
  {
    files: ['*.{js,ts}', 'scripts/**/*.ts', 'tests/**/*.{ts,tsx}'],
    languageOptions: {
      globals: { ...globals.node, ...globals.browser },
    },
  },

  // Sempre por último: desliga regras de estilo que conflitam com o Prettier.
  prettier,
]);
