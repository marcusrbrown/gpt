import type {Plugin} from 'vite'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react-swc'
import tsconfigPaths from 'vite-tsconfig-paths'
import {defineConfig} from 'vitest/config'

const cspPolicy = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "connect-src 'self' https://api.openai.com https://api.anthropic.com http://localhost:11434",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "base-uri 'self'",
].join('; ')

function cspPlugin(): Plugin {
  return {
    name: 'html-csp',
    apply: 'build',
    transformIndexHtml(html) {
      return html.replace('<head>', `<head>\n    <meta http-equiv="Content-Security-Policy" content="${cspPolicy}" />`)
    },
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), tsconfigPaths({projectDiscovery: 'lazy'}), cspPlugin()],
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
