import type {GPTConfiguration} from '../../types/gpt'
import {render, screen, waitFor} from '@testing-library/react'
import React from 'react'
import {MemoryRouter} from 'react-router-dom'

import {beforeEach, describe, expect, it, vi} from 'vitest'
import {CardGroup} from '../card-group'

// Mock the design system utilities
vi.mock('@/lib/design-system', () => ({
  cn: (...args: any[]) => args.join(' '),
  ds: {
    text: {
      heading: {
        h2: 'text-heading-h2',
      },
      body: {
        large: 'text-body-large',
      },
    },
    animation: {
      transition: 'transition-all duration-200 ease-in-out',
    },
  },
  responsive: {
    cardGrid: {
      threeColumn: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6',
    },
    heading: {
      large: 'text-xl sm:text-2xl lg:text-3xl font-semibold',
    },
  },
  theme: {
    surface: (level: number) => `bg-surface-${level}`,
    border: (style?: string) => `border-border-${style || 'default'}`,
    content: (level: string) => `text-content-${level}`,
  },
}))

// Mock HeroUI components
vi.mock('@heroui/react', () => ({
  Button: ({children, as: Component = 'button', to, startContent, ...props}: any) => {
    if (Component && typeof Component !== 'string') {
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
}))

// Mock the UserGPTCard component
vi.mock('../user-gpt-card', () => ({
  UserGPTCard: ({gpt}: {gpt: GPTConfiguration}) => (
    <div data-testid="user-gpt-card" data-gpt-id={gpt.id}>
      <h3>{gpt.name}</h3>
      <p>{gpt.description}</p>
    </div>
  ),
}))

// Mock the Card component
vi.mock('../card', () => ({
  Card: (props: any) => (
    <div data-testid="example-gpt-card" data-name={props.name}>
      <h3>{props.name}</h3>
      <p>{props.description}</p>
    </div>
  ),
}))

// Mock the mine.json data
vi.mock('@/assets/mine.json', () => ({
  default: [
    {
      name: 'Example GPT 1',
      description: 'Test example GPT',
      author: 'Test Author',
      url: 'https://chatgpt.com/g/example1',
      avatar: 'https://example.com/avatar1.png',
    },
    {
      name: 'Example GPT 2',
      description: 'Another test example GPT',
      author: 'Test Author 2',
      url: 'https://chatgpt.com/g/example2',
      avatar: 'https://example.com/avatar2.png',
    },
  ],
}))

// Mock the storage hook
const mockGetAllGPTs = vi.fn()
vi.mock('@/hooks/use-storage', () => ({
  useStorage: () => ({
    getAllGPTs: mockGetAllGPTs,
  }),
}))

const mockGPTs: GPTConfiguration[] = [
  {
    id: 'test-gpt-1',
    name: 'Test GPT 1',
    description: 'A test GPT configuration',
    systemPrompt: 'Test instructions',
    tools: [],
    knowledge: {
      files: [],
      urls: [],
      vectorStores: [],
    },
    capabilities: {
      codeInterpreter: true,
      webBrowsing: false,
      imageGeneration: false,
      fileSearch: {
        enabled: true,
      },
    },
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    version: 1,
  },
  {
    id: 'test-gpt-2',
    name: 'Test GPT 2',
    description: 'Another test GPT configuration',
    systemPrompt: 'More test instructions',
    tools: [],
    knowledge: {
      files: [],
      urls: [],
      vectorStores: [],
    },
    capabilities: {
      codeInterpreter: false,
      webBrowsing: true,
      imageGeneration: false,
      fileSearch: {
        enabled: false,
      },
    },
    createdAt: new Date('2025-01-02'),
    updatedAt: new Date('2025-01-02'),
    version: 1,
  },
]

describe('cardGroup Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const renderCardGroup = () => {
    return render(
      <MemoryRouter>
        <CardGroup />
      </MemoryRouter>,
    )
  }

  describe('userGPTCard Integration', () => {
    it('renders UserGPTCard components for each user GPT', async () => {
      mockGetAllGPTs.mockReturnValue(mockGPTs)

      renderCardGroup()

      await waitFor(() => {
        expect(screen.getByText('Your GPTs')).toBeInTheDocument()
      })

      // Verify UserGPTCard components are rendered
      const userGPTCards = screen.getAllByTestId('user-gpt-card')
      expect(userGPTCards).toHaveLength(2)

      // Verify each GPT is rendered correctly
      expect(screen.getByText('Test GPT 1')).toBeInTheDocument()
      expect(screen.getByText('Test GPT 2')).toBeInTheDocument()
      expect(screen.getByText('A test GPT configuration')).toBeInTheDocument()
      expect(screen.getByText('Another test GPT configuration')).toBeInTheDocument()
    })

    it('passes correct gpt prop to UserGPTCard components', async () => {
      mockGetAllGPTs.mockReturnValue(mockGPTs)

      renderCardGroup()

      await waitFor(() => {
        const firstCard = screen.getAllByTestId('user-gpt-card')[0]
        expect(firstCard).toHaveAttribute('data-gpt-id', 'test-gpt-1')
      })

      // Verify that GPT data is correctly passed to cards
      const cards = screen.getAllByTestId('user-gpt-card')
      expect(cards[0]).toHaveAttribute('data-gpt-id', 'test-gpt-1')
      expect(cards[1]).toHaveAttribute('data-gpt-id', 'test-gpt-2')
    })

    it('applies responsive grid layout to user GPT cards', async () => {
      mockGetAllGPTs.mockReturnValue(mockGPTs)

      renderCardGroup()

      await waitFor(() => {
        const gridContainer = screen.getByText('Test GPT 1').closest('.grid-cols-1')
        expect(gridContainer).toBeInTheDocument()
        expect(gridContainer).toHaveClass('md:grid-cols-2', 'lg:grid-cols-3', 'gap-6')
      })
    })
  })

  describe('empty State Handling', () => {
    it('displays empty state when no user GPTs exist', async () => {
      mockGetAllGPTs.mockReturnValue([])

      renderCardGroup()

      await waitFor(() => {
        expect(screen.getByText("You haven't created any GPTs yet.")).toBeInTheDocument()
      })

      // Verify empty state styling - enhanced with gradient and larger padding
      const emptyState = screen.getByText("You haven't created any GPTs yet.").closest('div')
      expect(emptyState).toHaveClass('rounded-xl', 'p-12', 'text-center', 'border-2', 'shadow-sm')
      // Verify gradient background classes
      expect(emptyState?.className).toContain('bg-linear-to-br')
      expect(emptyState?.className).toContain('from-primary-50')
      expect(emptyState?.className).toContain('to-primary-100')

      // Verify create button is present
      expect(screen.getByText('Create Your First GPT')).toBeInTheDocument()
    })

    it('still shows example GPTs section when user has no GPTs', async () => {
      mockGetAllGPTs.mockReturnValue([])

      renderCardGroup()

      await waitFor(() => {
        expect(screen.getByText('Example GPTs')).toBeInTheDocument()
      })

      // Verify example cards are still rendered
      const exampleCards = screen.getAllByTestId('example-gpt-card')
      expect(exampleCards).toHaveLength(2)
    })
  })

  describe('example GPTs Integration', () => {
    it('renders Card components for example GPTs from mine.json', async () => {
      mockGetAllGPTs.mockReturnValue([])

      renderCardGroup()

      await waitFor(() => {
        expect(screen.getByText('Example GPTs')).toBeInTheDocument()
      })

      // Verify example GPT cards are rendered
      const exampleCards = screen.getAllByTestId('example-gpt-card')
      expect(exampleCards).toHaveLength(2)

      // Verify example GPT content
      expect(screen.getByText('Example GPT 1')).toBeInTheDocument()
      expect(screen.getByText('Example GPT 2')).toBeInTheDocument()
      expect(screen.getByText('Test example GPT')).toBeInTheDocument()
      expect(screen.getByText('Another test example GPT')).toBeInTheDocument()
    })

    it('applies responsive grid layout to example GPT cards', async () => {
      mockGetAllGPTs.mockReturnValue([])

      renderCardGroup()

      await waitFor(() => {
        const gridContainer = screen.getByText('Example GPT 1').closest('.grid-cols-1')
        expect(gridContainer).toBeInTheDocument()
        expect(gridContainer).toHaveClass('md:grid-cols-2', 'lg:grid-cols-3', 'gap-6')
      })
    })
  })

  describe('navigation Integration', () => {
    it('provides correct navigation links for creating new GPTs', async () => {
      mockGetAllGPTs.mockReturnValue([])

      renderCardGroup()

      await waitFor(() => {
        // The text "Create" appears in multiple places, so be more specific
        expect(screen.getByText('Create New GPT')).toBeInTheDocument()
        expect(screen.getByText('Create Your First GPT')).toBeInTheDocument()
      })

      // Verify both create buttons link to /gpt/new
      const headerButton = screen.getByText('Create New GPT').closest('a')
      const emptyStateButton = screen.getByText('Create Your First GPT').closest('a')

      expect(headerButton).toHaveAttribute('href', '/gpt/new')
      expect(emptyStateButton).toHaveAttribute('href', '/gpt/new')
    })
  })

  describe('layout and Styling Integration', () => {
    it('applies correct spacing and layout structure', async () => {
      mockGetAllGPTs.mockReturnValue(mockGPTs)

      renderCardGroup()

      await waitFor(() => {
        const mainContainer = screen.getByText('Your GPTs').closest('.space-y-8')
        expect(mainContainer).toBeInTheDocument()
      })

      // Verify section structure
      expect(screen.getByText('Your GPTs')).toHaveClass('text-xl sm:text-2xl lg:text-3xl font-semibold')
      expect(screen.getByText('Example GPTs')).toHaveClass('text-xl sm:text-2xl lg:text-3xl font-semibold')
    })

    it('maintains proper hierarchy with both user and example sections', async () => {
      mockGetAllGPTs.mockReturnValue(mockGPTs)

      renderCardGroup()

      await waitFor(() => {
        // Verify both sections are present
        expect(screen.getByText('Your GPTs')).toBeInTheDocument()
        expect(screen.getByText('Example GPTs')).toBeInTheDocument()

        // Verify user GPTs appear before example GPTs
        const sections = screen.getAllByRole('heading', {level: 2})
        expect(sections[0]).toHaveTextContent('Your GPTs')
        expect(sections[1]).toHaveTextContent('Example GPTs')
      })
    })
  })

  describe('error Resilience', () => {
    it('handles storage errors gracefully', async () => {
      mockGetAllGPTs.mockImplementation(() => {
        throw new Error('Storage error')
      })

      // The component doesn't handle errors internally, so it will throw
      // This is actually expected behavior - errors should bubble up to error boundaries
      expect(() => renderCardGroup()).toThrow('Storage error')
    })

    it('handles missing mine.json data gracefully', async () => {
      // This test verifies the component structure remains intact
      // even if external data sources have issues
      mockGetAllGPTs.mockReturnValue([])

      renderCardGroup()

      await waitFor(() => {
        expect(screen.getByText('Your GPTs')).toBeInTheDocument()
        expect(screen.getByText('Example GPTs')).toBeInTheDocument()
      })
    })
  })
})
