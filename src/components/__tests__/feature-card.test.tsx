import {render, screen} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import {MemoryRouter} from 'react-router-dom'
import {beforeEach, describe, expect, it, vi} from 'vitest'
import {FeatureCard} from '../feature-card'

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
  theme: {
    surface: (level: number) => `surface-${level}`,
  },
}))

// Mock HeroUI components
vi.mock('@heroui/react', () => ({
  Card: ({children, className, isHoverable, isPressable, onPress, ...props}: any) => (
    <div className={className} data-hoverable={isHoverable} data-pressable={isPressable} onClick={onPress} {...props}>
      {children}
    </div>
  ),
  CardHeader: ({children, className}: any) => <div className={className}>{children}</div>,
  CardBody: ({children, className}: any) => <div className={className}>{children}</div>,
  CardFooter: ({children, className}: any) => <div className={className}>{children}</div>,
  Skeleton: ({className}: any) => <div className={`skeleton ${className}`} />,
}))

// Mock react-router-dom
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: vi.fn(() => mockNavigate),
  }
})

// Mock window.open
const mockWindowOpen = vi.fn()
Object.defineProperty(window, 'open', {
  value: mockWindowOpen,
})

// Mock icon component
const MockIcon = () => <svg data-testid="mock-icon" />

const TestWrapper: React.FC<{children: React.ReactNode}> = ({children}) => <MemoryRouter>{children}</MemoryRouter>

describe('FeatureCard', () => {
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

  describe('Rendering', () => {
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
      const {container} = renderCard()

      const card = container.firstChild
      expect(card).toHaveClass('compose-card')
      expect(card).toHaveClass('focus-ring')
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

  describe('Loading State', () => {
    it('renders loading skeletons when isLoading is true', () => {
      renderCard({isLoading: true})

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
  })

  describe('Error State', () => {
    it('renders error message when error prop is provided', () => {
      renderCard({error: 'Failed to load feature'})

      expect(screen.getByText('Error Loading Feature')).toBeInTheDocument()
      expect(screen.getByText('Failed to load feature')).toBeInTheDocument()
      expect(screen.getByText('Unable to load feature data. Please try again later.')).toBeInTheDocument()
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

    it('shows skeleton for call-to-action in error state', () => {
      renderCard({error: 'Test error'})

      const skeletons = screen.getAllByText((_, element) => element?.classList.contains('skeleton') || false)
      expect(skeletons.length).toBeGreaterThan(0)
    })
  })

  describe('Navigation', () => {
    it('calls navigate for internal links', async () => {
      const user = userEvent.setup()
      const {container} = renderCard({href: '/internal'})

      const card = container.firstChild as HTMLElement
      await user.click(card)

      expect(mockNavigate).toHaveBeenCalledWith('/internal')
      expect(mockWindowOpen).not.toHaveBeenCalled()
    })

    it('calls window.open for external links', async () => {
      const user = userEvent.setup()
      const {container} = renderCard({href: 'https://external.com'})

      const card = container.firstChild as HTMLElement
      await user.click(card)

      expect(mockWindowOpen).toHaveBeenCalledWith('https://external.com', '_blank', 'noopener,noreferrer')
      expect(mockNavigate).not.toHaveBeenCalled()
    })

    it('does not navigate when loading', async () => {
      const user = userEvent.setup()
      const {container} = renderCard({href: '/test', isLoading: true})

      const card = container.firstChild as HTMLElement
      await user.click(card)

      expect(mockNavigate).not.toHaveBeenCalled()
      expect(mockWindowOpen).not.toHaveBeenCalled()
    })

    it('does not navigate when error exists', async () => {
      const user = userEvent.setup()
      const {container} = renderCard({href: '/test', error: 'Test error'})

      const card = container.firstChild as HTMLElement
      await user.click(card)

      expect(mockNavigate).not.toHaveBeenCalled()
      expect(mockWindowOpen).not.toHaveBeenCalled()
    })
  })

  describe('Accessibility', () => {
    it('is keyboard accessible when enabled', () => {
      const {container} = renderCard()

      const card = container.firstChild
      expect(card).toHaveAttribute('data-pressable', 'true')
    })

    it('applies focus styles', () => {
      const {container} = renderCard()

      const card = container.firstChild
      expect(card).toHaveClass('focus-ring')
    })

    it('has proper semantic structure', () => {
      renderCard()

      // Title should be a heading
      const title = screen.getByText('Test Feature')
      expect(title.tagName.toLowerCase()).toBe('h3')
    })
  })

  describe('Content Truncation', () => {
    it('applies line-clamp-2 to description', () => {
      renderCard()

      const description = screen.getByText('A test feature description')
      expect(description).toHaveClass('line-clamp-2')
    })
  })

  describe('Micro-interactions', () => {
    it('applies group class for hover effects', () => {
      const {container} = renderCard()

      const card = container.firstChild
      expect(card).toHaveClass('group')
    })

    it('applies transition animations', () => {
      const {container} = renderCard()

      const card = container.firstChild
      expect(card).toHaveClass('transition-all')
    })
  })
})
