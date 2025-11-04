import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {defineConfig, type Config} from '@bfra.me/eslint-config'

const tempIgnores: string[] = [
  // 'src/components/__tests__/**',
  // 'src/components/card.tsx',
  // 'src/components/docs/doc-layout.tsx',
  // 'src/components/docs/docs-sidebar.tsx',
  // 'src/components/docs/interactive-notebook.tsx',
  // 'src/components/feature-card.tsx',
  // 'src/components/gpt-editor.tsx',
  'agent-development.md/*.ts',
  'docs/**/*.md/*.tsx',
  'tests/visual/**.md/*.ts',
  // '**/forms/__tests__/form-field-wrapper.test.tsx',
]

export default defineConfig(
  {
    name: 'gpt',
    ignores: ['**/dist', '.triage', 'coverage', 'AGENTS.md', 'CLAUDE.md', '.ai/', ...tempIgnores],
    typescript: {
      tsconfigPath: './tsconfig.json',
    },
    react: true,
    vitest: true,
    rules: {
      '@typescript-eslint/strict-boolean-expressions': 'off',
      '@typescript-eslint/switch-exhaustiveness-check': 'off',
    },
  },

  {
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
    },
  } as Config,

  {
    files: ['src/**/*.tsx'],
    rules: {
      'react-refresh/only-export-components': [
        'warn',
        {
          allowConstantExport: true,
        },
      ],
    },
  },

  {
    files: ['src/**/*.test.{ts,tsx}', 'tests/**/*.ts', 'tests/**/*.tsx'],
    rules: {
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/unbound-method': 'off',

      'react-hooks/rules-of-hooks': 'off',

      'vitest/prefer-lowercase-title': 'off',
    },
  },

  // TypeScript languageOptions for config files
  {
    files: ['*.config.{js,cjs,mjs,ts,cts,mts}', '*.d.ts'],
    languageOptions: {
      parserOptions: {
        project: './tsconfig.node.json',
        projectService: false,
        tsconfigRootDir: path.dirname(fileURLToPath(import.meta.url)),
      },
    },
  },

  {
    files: ['src/components/navbar.tsx'],
    rules: {
      'no-unused-vars': 'off',
      'unused-imports/no-unused-imports': 'off',
    },
  },
)
