import {siteConfig} from '@/config/site'
import {render, screen} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {describe, expect, it} from 'vitest'
import {Footer} from '../footer'

describe('footer', () => {
  it('links to the author with external-link attributes and a readable name', () => {
    render(<Footer />)

    const link = screen.getByRole('link', {name: /made with.*marcus r\. brown/i})
    expect(link).toHaveAttribute('href', siteConfig.links.github)
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('shows the former title text as a tooltip on keyboard focus', async () => {
    const user = userEvent.setup()
    render(<Footer />)

    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()

    await user.tab()

    const tooltip = await screen.findByRole('tooltip')
    expect(tooltip).toHaveTextContent('@marcusrbrown on GitHub')
    expect(screen.getByRole('link')).toHaveAccessibleDescription('@marcusrbrown on GitHub')
  })

  it('closes the tooltip on Escape', async () => {
    const user = userEvent.setup()
    render(<Footer />)

    await user.tab()
    await screen.findByRole('tooltip')
    await user.keyboard('{Escape}')

    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  })
})
