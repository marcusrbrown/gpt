import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react-swc'
import {defineConfig} from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), tsconfigPaths()],
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
})
