import {render, screen} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import {MemoryRouter, useLocation} from 'react-router-dom'
import {beforeEach, describe, expect, it, vi} from 'vitest'
import {FeatureCard} from '../feature-card'

// Mock the design system utilities
vi.mock('@/lib/design-system', () => ({
  cn: (...args: any[]) => args.filter(Boolean).join(' '),
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
      cardHover: 'card-hover',
    },
    focus: {
      ring: 'focus-ring',
    },
    state: {
      loading: 'state-loading',
      error: 'state-error',
    },
  },
  theme: {
    surface: (level: number) => `surface-${level}`,
  },
}))

// Skeleton is still on HeroUI v2; Card is the real v3 component.
vi.mock('@heroui/react', () => ({
  Skeleton: ({className}: any) => <div className={`skeleton ${className}`} />,
}))

// Mock icon component
const MockIcon = () => <svg data-testid="mock-icon" />

function LocationProbe() {
  return <div data-testid="location">{useLocation().pathname}</div>
}

const TestWrapper: React.FC<{children: React.ReactNode}> = ({children}) => (
  <MemoryRouter initialEntries={['/start']}>
    {children}
    <LocationProbe />
  </MemoryRouter>
)

describe('featureCard', () => {
  const defaultProps = {
    title: 'Test Feature',
    description: 'A test feature description',
    icon: MockIcon,
    href: '/test',
    domain: 'test.com',
  }

  const renderCard = (props: any = {}) => {
    return render(
      <TestWrapper>
        <FeatureCard {...defaultProps} {...props} />
      </TestWrapper>,
    )
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('renders the feature card with basic information', () => {
      renderCard()

      expect(screen.getByText('Test Feature')).toBeInTheDocument()
      expect(screen.getByText('A test feature description')).toBeInTheDocument()
      expect(screen.getByText('test.com')).toBeInTheDocument()
      expect(screen.getByTestId('mock-icon')).toBeInTheDocument()
    })

    it('renders without domain when not provided', () => {
      renderCard({domain: undefined})

      expect(screen.getByText('Test Feature')).toBeInTheDocument()
      expect(screen.queryByText('test.com')).not.toBeInTheDocument()
    })

    it('applies correct CSS classes for design system integration', () => {
      renderCard()

      const card = screen.getByTestId('feature-card')
      expect(card).toHaveClass('compose-card')
      expect(card).toHaveClass('group')
    })

    it('shows appropriate call-to-action text for internal links', () => {
      renderCard({href: '/internal'})

      expect(screen.getByText(/learn more/i)).toBeInTheDocument()
    })

    it('shows appropriate call-to-action text for external links', () => {
      renderCard({href: 'https://external.com'})

      expect(screen.getByText(/open in chatgpt/i)).toBeInTheDocument()
    })
  })

  describe('loading State', () => {
    it('renders loading skeletons when isLoading is true', () => {
      renderCard({isLoading: true})

      const skeletons = screen.getAllByText((_, element) => element?.classList.contains('skeleton') || false)
      expect(skeletons.length).toBeGreaterThan(0)
    })

    it('disables hover and link states when loading', () => {
      renderCard({isLoading: true})

      expect(screen.getByTestId('feature-card')).not.toHaveClass('hover:bg-content2')
      expect(screen.queryByRole('link')).not.toBeInTheDocument()
    })

    it('applies loading state styles', () => {
      renderCard({isLoading: true})

      expect(screen.getByTestId('feature-card')).toHaveClass('state-loading')
    })
  })

  describe('error State', () => {
    it('renders error message when error prop is provided', () => {
      renderCard({error: 'Failed to load feature'})

      expect(screen.getByText('Error Loading Feature')).toBeInTheDocument()
      expect(screen.getByText('Failed to load feature')).toBeInTheDocument()
      expect(screen.getByText('Unable to load feature data. Please try again later.')).toBeInTheDocument()
    })

    it('disables hover and link states when error occurs', () => {
      renderCard({error: 'Test error'})

      expect(screen.getByTestId('feature-card')).not.toHaveClass('hover:bg-content2')
      expect(screen.queryByRole('link')).not.toBeInTheDocument()
    })

    it('applies error state styles', () => {
      renderCard({error: 'Test error'})

      expect(screen.getByTestId('feature-card')).toHaveClass('state-error')
    })

    it('shows skeleton for call-to-action in error state', () => {
      renderCard({error: 'Test error'})

      const skeletons = screen.getAllByText((_, element) => element?.classList.contains('skeleton') || false)
      expect(skeletons.length).toBeGreaterThan(0)
    })
  })

  describe('navigation', () => {
    it('renders internal targets as a router link and navigates on click', async () => {
      const user = userEvent.setup()
      renderCard({href: '/internal'})

      const link = screen.getByRole('link', {name: 'Test Feature'})
      expect(link).toHaveAttribute('href', '/internal')
      expect(link).not.toHaveAttribute('target')

      await user.click(link)

      expect(screen.getByTestId('location')).toHaveTextContent('/internal')
    })

    it('renders external targets as a new-tab anchor', async () => {
      const user = userEvent.setup()
      renderCard({href: 'https://external.com'})

      const link = screen.getByRole('link', {name: 'Test Feature'})
      expect(link).toHaveAttribute('href', 'https://external.com')
      expect(link).toHaveAttribute('target', '_blank')
      expect(link).toHaveAttribute('rel', 'noopener noreferrer')

      await user.click(link)

      // The anchor opens a new tab; the router stays put
      expect(screen.getByTestId('location')).toHaveTextContent('/start')
    })

    it('does not navigate when loading', async () => {
      const user = userEvent.setup()
      renderCard({href: '/test', isLoading: true})

      await user.click(screen.getByTestId('feature-card'))

      expect(screen.getByTestId('location')).toHaveTextContent('/start')
    })

    it('does not navigate when error exists', async () => {
      const user = userEvent.setup()
      renderCard({href: '/test', error: 'Test error'})

      await user.click(screen.getByTestId('feature-card'))

      expect(screen.getByTestId('location')).toHaveTextContent('/start')
    })
  })

  describe('accessibility', () => {
    it('exposes exactly one interactive element, named after the card', () => {
      renderCard()

      expect(screen.getAllByRole('link')).toHaveLength(1)
      expect(screen.getByRole('link', {name: 'Test Feature'})).toBeInTheDocument()
      expect(screen.queryByRole('button')).not.toBeInTheDocument()
    })

    it('is keyboard accessible when enabled', async () => {
      const user = userEvent.setup()
      renderCard({href: '/internal'})

      await user.tab()
      expect(screen.getByRole('link', {name: 'Test Feature'})).toHaveFocus()

      await user.keyboard('{Enter}')
      expect(screen.getByTestId('location')).toHaveTextContent('/internal')
    })

    it('shows the focus ring on the card when the link has keyboard focus', () => {
      renderCard()

      expect(screen.getByTestId('feature-card')).toHaveClass('has-[a:focus-visible]:ring-2')
    })

    it('has proper semantic structure', () => {
      renderCard()

      // Title is a heading, and the heading holds the link
      expect(screen.getByRole('heading', {name: 'Test Feature', level: 3})).toBeInTheDocument()
    })
  })

  describe('content Truncation', () => {
    it('applies line-clamp-2 to description', () => {
      renderCard()

      const description = screen.getByText('A test feature description')
      expect(description).toHaveClass('line-clamp-2')
    })
  })

  describe('micro-interactions', () => {
    it('applies group class for hover effects', () => {
      renderCard()

      expect(screen.getByTestId('feature-card')).toHaveClass('group')
    })

    it('applies transition animations via compose.card()', () => {
      renderCard()

      expect(screen.getByTestId('feature-card')).toHaveClass('compose-card')
    })
  })
})
