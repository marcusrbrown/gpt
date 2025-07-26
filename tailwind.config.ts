import type {Config} from 'tailwindcss'
import {heroui} from '@heroui/react'

const brandColors = {
  50: '#eff6ff',
  100: '#dbeafe',
  200: '#bfdbfe',
  300: '#93c5fd',
  400: '#60a5fa',
  500: '#3b82f6', // Primary brand blue
  600: '#2563eb',
  700: '#1d4ed8',
  800: '#1e40af',
  900: '#1e3a8a',
  950: '#172554',
}

export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}', './node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      // GPT Design System - Custom Design Tokens
      colors: {
        // Primary brand colors that work with HeroUI
        brand: brandColors,
        // Semantic colors
        surface: {
          primary: 'hsl(var(--surface-primary))',
          secondary: 'hsl(var(--surface-secondary))',
          tertiary: 'hsl(var(--surface-tertiary))',
          elevated: 'hsl(var(--surface-elevated))',
        },
        content: {
          primary: 'hsl(var(--content-primary))',
          secondary: 'hsl(var(--content-secondary))',
          tertiary: 'hsl(var(--content-tertiary))',
          inverse: 'hsl(var(--content-inverse))',
        },
        border: {
          default: 'hsl(var(--border-default))',
          subtle: 'hsl(var(--border-subtle))',
          strong: 'hsl(var(--border-strong))',
        },
      },
      spacing: {
        // Consistent spacing scale
        '4.5': '1.125rem', // 18px
        '5.5': '1.375rem', // 22px
        '6.5': '1.625rem', // 26px
        '7.5': '1.875rem', // 30px
        '8.5': '2.125rem', // 34px
        '9.5': '2.375rem', // 38px
        '15': '3.75rem', // 60px
        '18': '4.5rem', // 72px
        '22': '5.5rem', // 88px
        '26': '6.5rem', // 104px
      },
      borderRadius: {
        // Consistent border radius scale
        xs: '0.125rem', // 2px
        sm: '0.25rem', // 4px
        DEFAULT: '0.5rem', // 8px
        md: '0.75rem', // 12px
        lg: '1rem', // 16px
        xl: '1.5rem', // 24px
        '2xl': '2rem', // 32px
      },
      fontFamily: {
        // Typography system
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['Fira Code', 'SF Mono', 'Monaco', 'Consolas', 'Liberation Mono', 'monospace'],
      },
      fontSize: {
        // Type scale
        xs: ['0.75rem', {lineHeight: '1rem'}], // 12px
        sm: ['0.875rem', {lineHeight: '1.25rem'}], // 14px
        base: ['1rem', {lineHeight: '1.5rem'}], // 16px
        lg: ['1.125rem', {lineHeight: '1.75rem'}], // 18px
        xl: ['1.25rem', {lineHeight: '1.75rem'}], // 20px
        '2xl': ['1.5rem', {lineHeight: '2rem'}], // 24px
        '3xl': ['1.875rem', {lineHeight: '2.25rem'}], // 30px
        '4xl': ['2.25rem', {lineHeight: '2.5rem'}], // 36px
        '5xl': ['3rem', {lineHeight: '1'}], // 48px
        '6xl': ['3.75rem', {lineHeight: '1'}], // 60px
      },
      boxShadow: {
        // Elevation system
        xs: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        sm: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        DEFAULT: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        md: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
        lg: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
        xl: '0 25px 50px -12px rgb(0 0 0 / 0.25)',
        '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
        inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
      },
      zIndex: {
        // Z-index scale
        dropdown: '1000',
        sticky: '1020',
        fixed: '1030',
        modal: '1040',
        popover: '1050',
        tooltip: '1060',
        toast: '1070',
      },
    },
  },
  darkMode: 'class',
  plugins: [
    heroui({
      themes: {
        light: {
          colors: {
            primary: {
              ...brandColors,
              DEFAULT: brandColors[500],
              foreground: '#ffffff',
            },
          },
        },
        dark: {
          colors: {
            primary: {
              ...brandColors,
              DEFAULT: brandColors[400],
              foreground: '#ffffff',
            },
          },
        },
      },
    }),
  ],
} as Config
