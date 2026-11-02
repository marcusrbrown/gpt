/// <reference types="vitest/config" />
import type {Plugin} from 'vite'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react-swc'
import {defineConfig} from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'

import {parseConnectSrcExtra} from './src/lib/csp-connect-src.ts'

// CSP via <meta> tag. Note: frame-ancestors is NOT supported in meta tags—
// browsers ignore it and log a warning. For GitHub Pages (static hosting),
// HTTP headers aren't configurable, so we omit frame-ancestors here.
// If clickjacking protection is needed, consider X-Frame-Options via a CDN/proxy.

// connect-src stays pinned to the default providers; deployers add gateway origins at
// build time with VITE_CONNECT_SRC_EXTRA (parsed and validated in src/lib/csp-connect-src.ts).
const baseConnectSrc = "'self' https://api.openai.com https://api.anthropic.com http://localhost:11434"

function buildCspPolicy(extraConnectSrc: readonly string[]): string {
  return [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    `connect-src ${[baseConnectSrc, ...extraConnectSrc].join(' ')}`,
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "object-src 'none'",
    "form-action 'self'",
    "base-uri 'self'",
  ].join('; ')
}

function cspPlugin(): Plugin {
  let cspPolicy = buildCspPolicy([])
  return {
    name: 'html-csp',
    apply: 'build',
    configResolved(config) {
      // Throws on any invalid entry, which fails the build. Runs for `vite build` only.
      const extra: unknown = config.env.VITE_CONNECT_SRC_EXTRA
      cspPolicy = buildCspPolicy(parseConnectSrcExtra(typeof extra === 'string' ? extra : undefined))
    },
    transformIndexHtml(html) {
      return html.replace('<head>', `<head>\n    <meta http-equiv="Content-Security-Policy" content="${cspPolicy}" />`)
    },
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tsconfigPaths({projectDiscovery: 'lazy'}), tailwindcss(), cspPlugin()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id: string) => {
          if (id.includes('react') || id.includes('react-dom')) return 'react'
          if (id.includes('react-router-dom')) return 'router'
          if (id.includes('@heroui')) return 'heroui'
          if (id.includes('openai')) return 'ai'
          if (id.includes('@monaco-editor')) return 'monaco'
          if (id.includes('lucide-react') || id.includes('clsx') || id.includes('uuid') || id.includes('zod'))
            return 'utils'
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
