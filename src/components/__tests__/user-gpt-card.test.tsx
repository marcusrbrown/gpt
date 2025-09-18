import type {GPTConfiguration} from '../../types/gpt'
import {render, screen} from '@testing-library/react'
import React from 'react'
import {MemoryRouter} from 'react-router-dom'
import {beforeEach, describe, expect, it, vi} from 'vitest'
import {UserGPTCard, type UserGPTCardProps} from '../user-gpt-card'

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

// Mock HeroUI components
vi.mock('@heroui/react', () => ({
  Card: ({children, className, isHoverable, 'data-testid': testId, ...props}: any) => (
    <div className={className} data-testid={testId} data-hoverable={isHoverable} {...props}>
      {children}
    </div>
  ),
  CardHeader: ({children, className}: any) => <div className={className}>{children}</div>,
  CardBody: ({children}: any) => <div>{children}</div>,
  CardFooter: ({children, className}: any) => <div className={className}>{children}</div>,
  Divider: () => <hr />,

  Button: ({children, as: Component = 'button', to, startContent, ...props}: any) => {
    if (typeof Component !== 'string') {
      return (
        <Component to={to} {...props}>
          {startContent}
          {children}
        </Component>
      )
    }
    return (
      <button type="button" {...props}>
        {startContent}
        {children}
      </button>
    )
  },
  Skeleton: ({className}: any) => <div className={`skeleton ${className}`} />,
}))

// Mock Lucide React icons
vi.mock('lucide-react', () => ({
  Edit: () => <svg data-testid="edit-icon" />,
  Play: () => <svg data-testid="play-icon" />,
}))

const TestWrapper: React.FC<{children: React.ReactNode}> = ({children}) => <MemoryRouter>{children}</MemoryRouter>

describe('userGPTCard', () => {
  const mockGPT: GPTConfiguration = {
    id: 'test-gpt-1',
    name: 'Test GPT',
    description: 'A test GPT configuration',
    systemPrompt: 'You are a test assistant',
    capabilities: {
      codeInterpreter: false,
      webBrowsing: false,
      imageGeneration: false,
      fileSearch: {enabled: false},
    },
    tools: [],
    knowledge: {
      files: [],
      urls: [],
      vectorStores: [],
    },
    createdAt: new Date('2025-08-07T10:00:00.000Z'),
    updatedAt: new Date('2025-08-07T10:00:00.000Z'),
    version: 1,
  }

  const defaultProps: UserGPTCardProps = {
    gpt: mockGPT,
  }

  const renderCard = (props: Partial<UserGPTCardProps> = {}) => {
    return render(
      <TestWrapper>
        <UserGPTCard {...defaultProps} {...props} />
      </TestWrapper>,
    )
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('renders the GPT card with basic information', () => {
      renderCard()

      expect(screen.getByTestId('user-gpt-card')).toBeInTheDocument()
      expect(screen.getByTestId('gpt-name')).toHaveTextContent('Test GPT')
      expect(screen.getByText(/Updated: /)).toBeInTheDocument()
      expect(screen.getByText('A test GPT configuration')).toBeInTheDocument()
    })

    it('renders Edit and Test buttons', () => {
      renderCard()

      expect(screen.getByRole('link', {name: /edit/i})).toBeInTheDocument()
      expect(screen.getByRole('link', {name: /test/i})).toBeInTheDocument()
      expect(screen.getByTestId('edit-icon')).toBeInTheDocument()
      expect(screen.getByTestId('play-icon')).toBeInTheDocument()
    })

    it('displays default description when none provided', () => {
      const gptWithoutDescription = {...mockGPT, description: ''}
      renderCard({gpt: gptWithoutDescription})

      expect(screen.getByText('No description provided.')).toBeInTheDocument()
    })

    it('applies correct CSS classes for design system integration', () => {
      renderCard()

      const card = screen.getByTestId('user-gpt-card')
      expect(card).toHaveClass('compose-card')
      expect(card).toHaveClass('focus-ring')
    })
  })

  describe('loading State', () => {
    it('renders loading skeletons when isLoading is true', () => {
      renderCard({isLoading: true})

      const skeletons = screen.getAllByText((_, element) => element?.classList.contains('skeleton') || false)
      expect(skeletons.length).toBeGreaterThan(0)
    })

    it('disables hover state when loading', () => {
      renderCard({isLoading: true})

      const card = screen.getByTestId('user-gpt-card')
      expect(card).toHaveAttribute('data-hoverable', 'false')
    })

    it('applies loading state styles', () => {
      renderCard({isLoading: true})

      const card = screen.getByTestId('user-gpt-card')
      expect(card).toHaveClass('state-loading')
    })
  })

  describe('error State', () => {
    it('renders error message when error prop is provided', () => {
      renderCard({error: 'Failed to load GPT'})

      expect(screen.getByText('Error Loading GPT')).toBeInTheDocument()
      expect(screen.getByText('Failed to load GPT')).toBeInTheDocument()
      expect(screen.getByText('Unable to load GPT data. Please try again later.')).toBeInTheDocument()
    })

    it('disables hover state when error occurs', () => {
      renderCard({error: 'Test error'})

      const card = screen.getByTestId('user-gpt-card')
      expect(card).toHaveAttribute('data-hoverable', 'false')
    })

    it('applies error state styles', () => {
      renderCard({error: 'Test error'})

      const card = screen.getByTestId('user-gpt-card')
      expect(card).toHaveClass('state-error')
    })

    it('shows skeleton buttons in error state', () => {
      renderCard({error: 'Test error'})

      const skeletons = screen.getAllByText((_, element) => element?.classList.contains('skeleton') || false)
      expect(skeletons.length).toBeGreaterThan(0)
    })
  })

  describe('navigation', () => {
    it('creates correct edit link', () => {
      renderCard()

      const editLink = screen.getByRole('link', {name: /edit/i})
      expect(editLink).toHaveAttribute('href', '/gpt/edit/test-gpt-1')
    })

    it('creates correct test link', () => {
      renderCard()

      const testLink = screen.getByRole('link', {name: /test/i})
      expect(testLink).toHaveAttribute('href', '/gpt/test/test-gpt-1')
    })
  })

  describe('accessibility', () => {
    it('has proper ARIA structure', () => {
      renderCard()

      const card = screen.getByTestId('user-gpt-card')
      expect(card).toBeInTheDocument()
    })

    it('has accessible button labels', () => {
      renderCard()

      expect(screen.getByRole('link', {name: /edit/i})).toBeInTheDocument()
      expect(screen.getByRole('link', {name: /test/i})).toBeInTheDocument()
    })

    it('maintains semantic structure with dividers', () => {
      renderCard()

      const dividers = screen.getAllByRole('separator')
      expect(dividers).toHaveLength(2)
    })
  })

  describe('content Truncation', () => {
    it('applies line-clamp-3 to long descriptions', () => {
      const longDescription = 'A'.repeat(200)
      const gptWithLongDescription = {...mockGPT, description: longDescription}
      renderCard({gpt: gptWithLongDescription})

      const descriptionElement = screen.getByText(longDescription)
      expect(descriptionElement).toHaveClass('line-clamp-3')
    })
  })

  describe('date Formatting', () => {
    it('formats the updated date correctly', () => {
      renderCard()

      // Date should be formatted as locale string
      const dateText = screen.getByText(/Updated: /)
      expect(dateText).toBeInTheDocument()
      expect(dateText.textContent).toMatch(/Updated: \d{1,2}\/\d{1,2}\/\d{4}/)
    })
  })
})
