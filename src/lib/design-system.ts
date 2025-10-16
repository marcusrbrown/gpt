import {clsx, type ClassValue} from 'clsx'
import {twMerge} from 'tailwind-merge'

/**
 * Utility for combining class names with design system consistency
 * Uses tailwind-merge for proper Tailwind class deduplication
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Design system utility functions for consistent styling
 */
export const ds = {
  // Card variants
  card: {
    base: 'rounded-lg bg-surface-secondary border border-border-default shadow-sm',
    interactive: 'hover:shadow-md transition-all cursor-pointer',
    elevated: 'shadow-md hover:shadow-lg',
  },

  // Button size variants (complement HeroUI)
  button: {
    sizes: {
      xs: 'h-7 px-2 text-xs',
      sm: 'h-8 px-3 text-sm',
      md: 'h-10 px-4 text-base',
      lg: 'h-12 px-6 text-lg',
      xl: 'h-14 px-8 text-xl',
    },
  },

  // Typography utilities
  text: {
    heading: {
      h1: 'text-4xl font-bold text-content-primary leading-tight',
      h2: 'text-2xl font-semibold text-content-primary leading-tight',
      h3: 'text-xl font-semibold text-content-primary leading-tight',
      h4: 'text-lg font-medium text-content-primary leading-tight',
    },
    body: {
      large: 'text-lg text-content-secondary leading-relaxed',
      base: 'text-base text-content-secondary leading-relaxed',
      small: 'text-sm text-content-tertiary leading-relaxed',
    },
    caption: 'text-xs text-content-tertiary uppercase tracking-wide',
  },

  // Layout containers
  layout: {
    container: 'container mx-auto px-4 max-w-7xl',
    section: 'mb-12',
    pageHeader: 'mb-8',
    cardGrid: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6',
    page: 'py-8',
    pageWithHeader: 'pt-[var(--header-height)]',
  },

  // Form elements
  form: {
    fieldGroup: 'space-y-4',
    fieldRow: 'flex gap-4 items-center',
    label: 'text-sm font-medium text-content-primary mb-1',
    helperText: 'text-xs text-content-tertiary mt-1',
    errorText: 'text-xs text-danger mt-1',
  },

  // State classes
  state: {
    loading: 'opacity-50 pointer-events-none',
    disabled: 'opacity-40 cursor-not-allowed',
    empty: 'text-center py-12 text-content-tertiary',
    error: 'border-danger bg-danger-50 text-danger-700',
    success: 'border-success bg-success-50 text-success-700',
  },

  // Animation classes
  animation: {
    fadeIn: 'animate-in fade-in duration-300',
    slideIn: 'animate-in slide-in-from-bottom-4 duration-300',
    scaleIn: 'animate-in zoom-in-95 duration-200',
    transition: 'transition-all duration-200 ease-in-out',
  },

  // Focus styles for accessibility
  focus: {
    ring: 'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
    visible: 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
  },
} as const

/**
 * Responsive utilities for consistent breakpoints
 */
export const responsive = {
  // Container queries for common patterns
  sidebar: 'hidden lg:block lg:w-64',
  mobileMenu: 'block lg:hidden',
  desktopNav: 'hidden lg:flex lg:items-center lg:gap-4',

  // Grid patterns
  cardGrid: {
    responsive: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4',
    twoColumn: 'grid grid-cols-1 lg:grid-cols-2 gap-6',
    threeColumn: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6',
  },

  // Text scaling
  heading: {
    responsive: 'text-2xl sm:text-3xl lg:text-4xl font-bold',
    large: 'text-xl sm:text-2xl lg:text-3xl font-semibold',
    medium: 'text-lg sm:text-xl lg:text-2xl font-medium',
  },

  // Spacing patterns
  padding: {
    page: 'px-4 sm:px-6 lg:px-8',
    section: 'py-8 sm:py-12 lg:py-16',
    container: 'py-4 sm:py-6 lg:py-8',
  },
} as const

/**
 * Theme-aware utility functions
 */
export const theme = {
  // Surface elevation levels
  surface: (level: 0 | 1 | 2 | 3 = 0) => {
    const surfaces = ['bg-surface-primary', 'bg-surface-secondary', 'bg-surface-tertiary', 'bg-surface-elevated']
    return surfaces[level]
  },

  // Content color by hierarchy
  content: (level: 'primary' | 'secondary' | 'tertiary' | 'inverse' = 'primary') => {
    return `text-content-${level}`
  },

  // Border styles
  border: (style: 'default' | 'subtle' | 'strong' = 'default') => {
    return `border-border-${style}`
  },
} as const

/**
 * Component composition helpers
 */
export const compose = {
  // Standard page layout
  page: (className?: string) => cn(ds.layout.container, 'min-h-screen', ds.text.body.base, className),

  // Interactive card
  card: (className?: string) => cn(ds.card.base, ds.card.interactive, 'p-6', className),

  // Form field wrapper
  field: (className?: string) => cn('flex flex-col', className),

  // Button with loading and disabled states
  button: (isLoading?: boolean, isDisabledOrClassName?: boolean | string, className?: string) => {
    // Handle backward compatibility: button(isLoading, className)
    if (typeof isDisabledOrClassName === 'string') {
      return cn(ds.animation.transition, ds.focus.ring, isLoading && ds.state.loading, isDisabledOrClassName)
    }
    // New signature: button(isLoading, isDisabled, className)
    return cn(
      ds.animation.transition,
      ds.focus.ring,
      isLoading && ds.state.loading,
      isDisabledOrClassName && ds.state.disabled,
      className,
    )
  },
} as const

/**
 * Validation helpers for component props
 */
export const variants = {
  // Size variants
  size: ['xs', 'sm', 'md', 'lg', 'xl'] as const,

  // Color variants (extends HeroUI)
  color: ['primary', 'secondary', 'success', 'warning', 'danger', 'default'] as const,

  // Variant styles
  variant: ['solid', 'bordered', 'light', 'flat', 'faded', 'shadow', 'ghost'] as const,

  // Radius options
  radius: ['none', 'sm', 'md', 'lg', 'full'] as const,
} as const

export type Size = (typeof variants.size)[number]
export type Color = (typeof variants.color)[number]
export type Variant = (typeof variants.variant)[number]
export type Radius = (typeof variants.radius)[number]
