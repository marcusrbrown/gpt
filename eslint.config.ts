import react from '@eslint-react/eslint-plugin';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {defineConfig, type Config} from '@bfra.me/eslint-config'
import {ESLint} from 'eslint';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(
  {
    name: 'gpt',
    ignores: ['**/dist', '.triage', 'eslint.config.ts', 'postcss.config.js', 'coverage', '.github/copilot-instructions.md', '.github/prompts', 'llms.txt'],
    typescript: {
      tsconfigPath: './tsconfig.json',
    },
    vitest: true,
  },

  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: react.configs['recommended-type-checked'].plugins as Record<string, unknown>,
    rules: {
      ...react.configs['recommended-type-checked'].rules,
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
    },
    settings: react.configs['recommended-type-checked'].settings,
  } as Config,

  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: reactHooks.configs.recommended.rules,
  },

  {
    files: ['src/**/*.tsx'],
    plugins: {
      'react-refresh': reactRefresh,
    },
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
    files: ['src/**/*.test.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/unbound-method': 'off',
    },
  },

  // TypeScript languageOptions for config files
  {
    files: ['*.config.{js,cjs,mjs,ts,cts,mts}', '*.d.ts'],
    languageOptions: {
      parserOptions: {
        project: './tsconfig.node.json',
        projectService: false,
        tsconfigRootDir: __dirname,
      },
    },
  },
);
