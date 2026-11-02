import {render, screen} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {Card, type CardProps} from '../card'

// Mock the design system utilities
vi.mock('@/lib/design-system', () => ({
  cn: (...args: any[]) => args.join(' '),
  compose: {
    card: (className?: string) => `compose-card ${className ?? ''}`,
  },
  ds: {
    text: {
      heading: {
        h4: 'text-heading-h4',
      },
      body: {
        base: 'text-body-base',
        small: 'text-body-small',
      },
    },
    animation: {
      transition: 'transition-all',
    },
    focus: {
      ring: 'focus-ring',
    },
    state: {
      loading: 'state-loading',
      error: 'state-error',
    },
  },
}))

// Divider and Skeleton are still on HeroUI v2; Card, Link and Avatar are the real v3 components.
vi.mock('@heroui/react', () => ({
  Divider: () => <hr />,
  Skeleton: ({className}: any) => <div className={`skeleton ${className}`} />,
}))

// Radix only renders the <img> once the image has loaded, which jsdom never does.
class LoadingImage extends EventTarget {
  complete = false
  naturalWidth = 0
  crossOrigin: string | null = null
  referrerPolicy = ''
  private currentSrc = ''
  get src() {
    return this.currentSrc
  }

  set src(value: string) {
    this.currentSrc = value
    queueMicrotask(() => {
      this.complete = true
      this.naturalWidth = 1
      this.dispatchEvent(new Event('load'))
    })
  }
}

describe('card', () => {
  const defaultProps: CardProps = {
    title: 'Test GPT',
    description: 'A test GPT description',
    avatarUrl: 'https://example.com/avatar.jpg',
    author: 'Test Author',
    authorUrl: 'https://example.com/author',
    gptUrl: 'https://chatgpt.com/test',
  }

  const renderCard = (props: Partial<CardProps> = {}) => {
    return render(<Card {...defaultProps} {...props} />)
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('Image', LoadingImage)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe('rendering', () => {
    it('renders the card with basic information', async () => {
      renderCard()

      expect(screen.getByText('Test GPT')).toBeInTheDocument()
      expect(screen.getByText('A test GPT description')).toBeInTheDocument()
      expect(screen.getByText('Test Author')).toBeInTheDocument()
      expect(await screen.findByAltText('GPT Logo')).toBeInTheDocument()
    })

    it('renders the avatar with correct props', async () => {
      const {container} = renderCard()

      const image = await screen.findByAltText('GPT Logo')
      expect(image).toHaveAttribute('src', 'https://example.com/avatar.jpg')
      // v2's `isBordered radius="full"`
      const avatar = container.querySelector('.avatar')
      expect(avatar).toHaveClass('rounded-full', 'ring-2')
    })

    it('shows the title initial while the image is not available', () => {
      renderCard()

      expect(screen.getByText('T')).toHaveAttribute('data-slot', 'avatar-fallback')
    })

    it('renders author link correctly', () => {
      renderCard()

      const authorLink = screen.getByRole('link', {name: 'Test Author'})
      expect(authorLink).toHaveAttribute('href', 'https://example.com/author')
      expect(authorLink).toHaveAttribute('target', '_blank')
      expect(authorLink).toHaveAttribute('rel', 'noopener noreferrer')
      expect(authorLink.querySelector('[data-slot="link-icon"]')).toBeNull()
    })

    it('renders GPT link correctly', () => {
      renderCard()

      const gptLink = screen.getByRole('link', {name: /open in chatgpt/i})
      expect(gptLink).toHaveAttribute('href', 'https://chatgpt.com/test')
      expect(gptLink).toHaveAttribute('target', '_blank')
      expect(gptLink).toHaveAttribute('rel', 'noopener noreferrer')
      expect(gptLink.querySelector('[data-slot="link-icon"]')).toBeInTheDocument()
    })

    it('applies correct CSS classes for design system integration', () => {
      const {container} = renderCard()

      const card = container.firstChild
      expect(card).toHaveClass('compose-card')
      expect(card).toHaveClass('transition-all')
    })

    it('has semantic dividers', () => {
      renderCard()

      const dividers = screen.getAllByRole('separator')
      expect(dividers).toHaveLength(2)
    })
  })

  describe('loading State', () => {
    it('renders loading skeletons when isLoading is true', () => {
      renderCard({isLoading: true})

      const skeletons = screen.getAllByText((_, element) => element?.classList.contains('skeleton') || false)
      expect(skeletons.length).toBeGreaterThan(0)
    })

    it('shows skeleton avatar in loading state', () => {
      const {container} = renderCard({isLoading: true})

      // Avatar should be replaced with skeleton
      expect(container.querySelector('.avatar')).toBeNull()
      const skeletons = screen.getAllByText((_, element) => element?.classList.contains('skeleton') || false)
      expect(skeletons.length).toBeGreaterThan(0)
    })

    it('disables hover styles when loading', () => {
      const {container} = renderCard({isLoading: true})

      expect(container.firstChild).not.toHaveClass('hover:bg-content2')
      expect(container.firstChild).not.toHaveClass('hover:border-primary-300')
    })

    it('applies loading state styles', () => {
      const {container} = renderCard({isLoading: true})

      const card = container.firstChild
      expect(card).toHaveClass('state-loading')
    })

    it('shows skeleton for description and footer in loading state', () => {
      renderCard({isLoading: true})

      const skeletons = screen.getAllByText((_, element) => element?.classList.contains('skeleton') || false)
      // Should have skeletons for: avatar, title, subtitle, description lines, footer
      expect(skeletons.length).toBeGreaterThanOrEqual(5)
    })
  })

  describe('error State', () => {
    it('renders error message when error prop is provided', () => {
      renderCard({error: 'Failed to load'})

      expect(screen.getByText('Error Loading GPT')).toBeInTheDocument()
      expect(screen.getByText('Failed to load')).toBeInTheDocument()
    })

    it('does not render normal content in error state', () => {
      renderCard({error: 'Test error'})

      expect(screen.queryByText('Test GPT')).not.toBeInTheDocument()
      expect(screen.queryByText('A test GPT description')).not.toBeInTheDocument()
      expect(screen.queryByAltText('GPT Logo')).not.toBeInTheDocument()
    })

    it('disables hover styles when error occurs', () => {
      const {container} = renderCard({error: 'Test error'})

      expect(container.firstChild).not.toHaveClass('hover:bg-content2')
      expect(container.firstChild).not.toHaveClass('hover:border-primary-300')
    })

    it('applies error state styles', () => {
      const {container} = renderCard({error: 'Test error'})

      const card = container.firstChild
      expect(card).toHaveClass('state-error')
    })
  })

  describe('uRL Handling', () => {
    it('handles URL objects correctly', async () => {
      const avatarUrl = new URL('https://example.com/avatar.jpg')
      const authorUrl = new URL('https://example.com/author')
      const gptUrl = new URL('https://chatgpt.com/test')

      renderCard({
        avatarUrl,
        authorUrl,
        gptUrl,
      })

      const avatar = await screen.findByAltText('GPT Logo')
      expect(avatar).toHaveAttribute('src', 'https://example.com/avatar.jpg')

      const authorLink = screen.getByRole('link', {name: 'Test Author'})
      expect(authorLink).toHaveAttribute('href', 'https://example.com/author')

      const gptLink = screen.getByRole('link', {name: /open in chatgpt/i})
      expect(gptLink).toHaveAttribute('href', 'https://chatgpt.com/test')
    })

    it('handles string URLs correctly', async () => {
      renderCard()

      const avatar = await screen.findByAltText('GPT Logo')
      expect(avatar).toHaveAttribute('src', 'https://example.com/avatar.jpg')

      const authorLink = screen.getByRole('link', {name: 'Test Author'})
      expect(authorLink).toHaveAttribute('href', 'https://example.com/author')

      const gptLink = screen.getByRole('link', {name: /open in chatgpt/i})
      expect(gptLink).toHaveAttribute('href', 'https://chatgpt.com/test')
    })
  })

  describe('accessibility', () => {
    it('has proper semantic structure', () => {
      renderCard()

      // Title should be properly styled
      const title = screen.getByText('Test GPT')
      expect(title).toHaveClass('text-heading-h4')
    })

    it('has accessible links', () => {
      renderCard()

      const authorLink = screen.getByRole('link', {name: 'Test Author'})
      expect(authorLink).toBeInTheDocument()

      const gptLink = screen.getByRole('link', {name: /open in chatgpt/i})
      expect(gptLink).toBeInTheDocument()
    })

    it('has proper image alt text', async () => {
      renderCard()

      const avatar = await screen.findByAltText('GPT Logo')
      expect(avatar).toHaveAttribute('alt', 'GPT Logo')
    })

    it('does not make the card itself a button', () => {
      const {container} = renderCard()

      const card = container.firstChild
      expect(card).not.toHaveAttribute('role')
      expect(card).not.toHaveAttribute('tabindex')
    })

    it('keeps both links reachable by keyboard', async () => {
      const user = userEvent.setup()
      renderCard()

      await user.tab()
      expect(screen.getByRole('link', {name: 'Test Author'})).toHaveFocus()
      await user.tab()
      expect(screen.getByRole('link', {name: /open in chatgpt/i})).toHaveFocus()
    })
  })

  describe('interactive States', () => {
    it('is hoverable when not loading or errored', () => {
      const {container} = renderCard()

      const card = container.firstChild
      expect(card).toHaveClass('hover:bg-content2')
      expect(card).toHaveClass('hover:border-primary-300')
    })

    it('is not hoverable when loading', () => {
      const {container} = renderCard({isLoading: true})

      expect(container.firstChild).not.toHaveClass('hover:bg-content2')
    })

    it('is not hoverable when error exists', () => {
      const {container} = renderCard({error: 'Test error'})

      expect(container.firstChild).not.toHaveClass('hover:bg-content2')
    })

    it('has no links when loading or errored', () => {
      const {unmount} = renderCard({isLoading: true})
      expect(screen.queryAllByRole('link')).toHaveLength(0)
      unmount()

      renderCard({error: 'Test error'})
      expect(screen.queryAllByRole('link')).toHaveLength(0)
    })
  })

  describe('layout', () => {
    it('uses NextUICard as base component', () => {
      const {container} = renderCard()

      const card = container.firstChild
      expect(card?.nodeName.toLowerCase()).toBe('div')
    })

    it('applies max-width constraint', () => {
      const {container} = renderCard()

      const card = container.firstChild
      expect(card).toHaveClass('max-w-sm')
    })
  })
})
