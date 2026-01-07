import type createPlugin from 'tailwindcss/plugin'
import {heroui} from '@heroui/react'

// HeroUI plugin configuration for Tailwind CSS v4
// Custom color definitions using CSS variables should be defined in the global
// CSS file (@theme directive) rather than in the plugin configuration, as
// Tailwind v4 needs to parse colors at build time
export default heroui() as unknown as ReturnType<typeof createPlugin>
