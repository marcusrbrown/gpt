import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react-swc'
import tsconfigPaths from 'vite-tsconfig-paths'
import {defineConfig} from 'vitest/config'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), tsconfigPaths({projectDiscovery: 'lazy'})],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React libraries
          react: ['react', 'react-dom'],
          // Router
          router: ['react-router-dom'],
          // UI library
          heroui: ['@heroui/react'],
          // OpenAI and AI libraries
          ai: ['openai'],
          // Editor
          monaco: ['@monaco-editor/react'],
          // Icons and utilities
          utils: ['lucide-react', 'clsx', 'uuid', 'zod'],
        },
      },
    },
    chunkSizeWarningLimit: 1000, // Increase threshold to 1MB for now
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov', 'json-summary'],
      include: ['src/**/*.ts', 'src/**/*.tsx'],
      exclude: [
        'src/**/*.d.ts',
        'src/**/*.test.ts',
        'src/**/*.test.tsx',
        'src/**/*.spec.ts',
        'src/**/*.spec.tsx',
        'src/test/**',
        'src/vite-env.d.ts',
        'src/main.tsx',
      ],
      // TODO: Enable coverage thresholds when the codebase is better covered
      // thresholds: {
      //   lines: 80,
      //   functions: 80,
      //   branches: 80,
      //   statements: 80,
      // },
    },
  },
})
