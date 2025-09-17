import {render, screen} from '@testing-library/react'
import React from 'react'
import {beforeEach, describe, expect, it, vi} from 'vitest'
import {Card, type CardProps} from '../card'

// Mock the design system utilities
vi.mock('@/lib/design-system', () => ({
  cn: (...args: any[]) => args.join(' '),
  compose: {
    card: (className?: string) => `compose-card ${className || ''}`,
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

// Mock HeroUI components
vi.mock('@heroui/react', () => ({
  Card: ({children, className, isHoverable, isPressable, as, ...props}: any) => {
    const Component = as || 'div'
    return (
      <Component className={className} data-hoverable={isHoverable} data-pressable={isPressable} {...props}>
        {children}
      </Component>
    )
  },
  CardHeader: ({children, className}: any) => <div className={className}>{children}</div>,
  CardBody: ({children}: any) => <div>{children}</div>,
  CardFooter: ({children}: any) => <div>{children}</div>,
  Divider: () => <hr />,
  Avatar: ({alt, src, size, isBordered, radius}: any) => (
    <img alt={alt} src={src} data-size={size} data-bordered={isBordered} data-radius={radius} data-testid="avatar" />
  ),
  Link: ({children, href, isExternal, showAnchorIcon, className}: any) => (
    <a href={href} data-external={isExternal} data-anchor-icon={showAnchorIcon} className={className}>
      {children}
    </a>
  ),
  Skeleton: ({className}: any) => <div className={`skeleton ${className}`} />,
}))

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
  })

  describe('rendering', () => {
    it('renders the card with basic information', () => {
      renderCard()

      expect(screen.getByText('Test GPT')).toBeInTheDocument()
      expect(screen.getByText('A test GPT description')).toBeInTheDocument()
      expect(screen.getByText('Test Author')).toBeInTheDocument()
      expect(screen.getByTestId('avatar')).toBeInTheDocument()
    })

    it('renders the avatar with correct props', () => {
      renderCard()

      const avatar = screen.getByTestId('avatar')
      expect(avatar).toHaveAttribute('src', 'https://example.com/avatar.jpg')
      expect(avatar).toHaveAttribute('alt', 'GPT Logo')
      expect(avatar).toHaveAttribute('data-size', 'md')
      expect(avatar).toHaveAttribute('data-bordered', 'true')
      expect(avatar).toHaveAttribute('data-radius', 'full')
    })

    it('renders author link correctly', () => {
      renderCard()

      const authorLink = screen.getByRole('link', {name: 'Test Author'})
      expect(authorLink).toHaveAttribute('href', 'https://example.com/author')
      expect(authorLink).toHaveAttribute('data-external', 'true')
    })

    it('renders GPT link correctly', () => {
      renderCard()

      const gptLink = screen.getByRole('link', {name: /open in chatgpt/i})
      expect(gptLink).toHaveAttribute('href', 'https://chatgpt.com/test')
      expect(gptLink).toHaveAttribute('data-external', 'true')
      expect(gptLink).toHaveAttribute('data-anchor-icon', 'true')
    })

    it('applies correct CSS classes for design system integration', () => {
      const {container} = renderCard()

      const card = container.firstChild
      expect(card).toHaveClass('compose-card')
      expect(card).toHaveClass('focus-ring')
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
      renderCard({isLoading: true})

      // Avatar should be replaced with skeleton
      expect(screen.queryByTestId('avatar')).not.toBeInTheDocument()
      const skeletons = screen.getAllByText((_, element) => element?.classList.contains('skeleton') || false)
      expect(skeletons.length).toBeGreaterThan(0)
    })

    it('disables hover and press states when loading', () => {
      const {container} = renderCard({isLoading: true})

      const card = container.firstChild
      expect(card).toHaveAttribute('data-hoverable', 'false')
      expect(card).toHaveAttribute('data-pressable', 'false')
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
      expect(screen.queryByTestId('avatar')).not.toBeInTheDocument()
    })

    it('disables hover and press states when error occurs', () => {
      const {container} = renderCard({error: 'Test error'})

      const card = container.firstChild
      expect(card).toHaveAttribute('data-hoverable', 'false')
      expect(card).toHaveAttribute('data-pressable', 'false')
    })

    it('applies error state styles', () => {
      const {container} = renderCard({error: 'Test error'})

      const card = container.firstChild
      expect(card).toHaveClass('state-error')
    })
  })

  describe('uRL Handling', () => {
    it('handles URL objects correctly', () => {
      const avatarUrl = new URL('https://example.com/avatar.jpg')
      const authorUrl = new URL('https://example.com/author')
      const gptUrl = new URL('https://chatgpt.com/test')

      renderCard({
        avatarUrl,
        authorUrl,
        gptUrl,
      })

      const avatar = screen.getByTestId('avatar')
      expect(avatar).toHaveAttribute('src', 'https://example.com/avatar.jpg')

      const authorLink = screen.getByRole('link', {name: 'Test Author'})
      expect(authorLink).toHaveAttribute('href', 'https://example.com/author')

      const gptLink = screen.getByRole('link', {name: /open in chatgpt/i})
      expect(gptLink).toHaveAttribute('href', 'https://chatgpt.com/test')
    })

    it('handles string URLs correctly', () => {
      renderCard()

      const avatar = screen.getByTestId('avatar')
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

    it('has proper image alt text', () => {
      renderCard()

      const avatar = screen.getByTestId('avatar')
      expect(avatar).toHaveAttribute('alt', 'GPT Logo')
    })

    it('applies focus styles', () => {
      const {container} = renderCard()

      const card = container.firstChild
      expect(card).toHaveClass('focus-ring')
    })
  })

  describe('interactive States', () => {
    it('is hoverable and pressable when not loading or errored', () => {
      const {container} = renderCard()

      const card = container.firstChild
      expect(card).toHaveAttribute('data-hoverable', 'true')
      expect(card).toHaveAttribute('data-pressable', 'true')
    })

    it('is not interactive when loading', () => {
      const {container} = renderCard({isLoading: true})

      const card = container.firstChild
      expect(card).toHaveAttribute('data-hoverable', 'false')
      expect(card).toHaveAttribute('data-pressable', 'false')
    })

    it('is not interactive when error exists', () => {
      const {container} = renderCard({error: 'Test error'})

      const card = container.firstChild
      expect(card).toHaveAttribute('data-hoverable', 'false')
      expect(card).toHaveAttribute('data-pressable', 'false')
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
