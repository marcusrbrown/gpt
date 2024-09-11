import react from '@eslint-react/eslint-plugin';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import js from '@eslint/js';
import type {Linter} from 'eslint';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,

  {
    ignores: ['**/dist', 'eslint.config.ts', 'eslint.config.d.ts'],
  },

  {
    languageOptions: {
      globals: {
        ...globals.browser,
      },

      parserOptions: {
        projectService: true,
        tsconfigRootDir: __dirname,
      },
    },
  },

  {
    files: ['src/**/*.{ts,tsx}'],
    ...react.configs['recommended-type-checked'],
  },

  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: reactHooks.configs.recommended.rules,
  },

  // TODO: Workaround for:
  //
  // Oops! Something went wrong! :(
  //
  // ESLint: 9.10.0
  //
  // ConfigError: Config (unnamed): Key "plugins": Key "react-refresh": Expected an object.
  //     at rethrowConfigError (/Users/mrbrown/src/github.com/marcusrbrown/gpt/node_modules/.pnpm/@eslint+config-array@0.18.0/node_modules/@eslint/config-array/dist/cjs/index.cjs:303:8)
  //     at /Users/mrbrown/src/github.com/marcusrbrown/gpt/node_modules/.pnpm/@eslint+config-array@0.18.0/node_modules/@eslint/config-array/dist/cjs/index.cjs:1098:5
  //     at Array.reduce (<anonymous>)
  //     at FlatConfigArray.getConfigWithStatus (/Users/mrbrown/src/github.com/marcusrbrown/gpt/node_modules/.pnpm/@eslint+config-array@0.18.0/node_modules/@eslint/config-array/dist/cjs/index.cjs:1091:43)
  //     at FlatConfigArray.getConfig (/Users/mrbrown/src/github.com/marcusrbrown/gpt/node_modules/.pnpm/@eslint+config-array@0.18.0/node_modules/@eslint/config-array/dist/cjs/index.cjs:1120:15)
  //     at /Users/mrbrown/src/github.com/marcusrbrown/gpt/node_modules/.pnpm/eslint@9.10.0_jiti@1.21.6/node_modules/eslint/lib/eslint/eslint-helpers.js:354:54
  //     at /Users/mrbrown/src/github.com/marcusrbrown/gpt/node_modules/.pnpm/eslint@9.10.0_jiti@1.21.6/node_modules/eslint/lib/eslint/eslint-helpers.js:296:32
  //     at Object.isAppliedFilter (/Users/mrbrown/src/github.com/marcusrbrown/gpt/node_modules/.pnpm/@nodelib+fs.walk@1.2.8/node_modules/@nodelib/fs.walk/out/readers/common.js:12:31)
  //     at AsyncReader._handleEntry (/Users/mrbrown/src/github.com/marcusrbrown/gpt/node_modules/.pnpm/@nodelib+fs.walk@1.2.8/node_modules/@nodelib/fs.walk/out/readers/async.js:86:20)
  //     at /Users/mrbrown/src/github.com/marcusrbrown/gpt/node_modules/.pnpm/@nodelib+fs.walk@1.2.8/node_modules/@nodelib/fs.walk/out/readers/async.js:65:22
  //
  // {
  //   files: ['src/**/*.tsx'],
  //   plugins: {
  //     'react-refresh': reactRefresh,
  //   },
  //   rules: {
  //     'react-refresh/only-export-components': [
  //       'warn',
  //       {
  //         allowConstantExport: true,
  //       },
  //     ],
  //   },
  // },

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
) as Linter.Config[];
