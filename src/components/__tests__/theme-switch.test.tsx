import {render, screen} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {beforeEach, describe, expect, it, vi} from 'vitest'
import {ThemeSwitch} from '../theme-switch'

const setTheme = vi.fn()
let currentTheme: string | undefined = 'light'

vi.mock('next-themes', () => ({
  useTheme: () => ({theme: currentTheme, setTheme}),
}))

describe('ThemeSwitch', () => {
  beforeEach(() => {
    setTheme.mockClear()
    currentTheme = 'light'
  })

  it('is an icon-only button with an accessible name', () => {
    render(<ThemeSwitch />)

    const button = screen.getByRole('button')
    expect(button).toHaveAccessibleName('Switch to dark mode')
    expect(button).not.toHaveTextContent(/\S/)
  })

  it('offers dark mode while the light theme is active', () => {
    render(<ThemeSwitch />)

    expect(screen.getByRole('button', {name: 'Switch to dark mode'})).toBeInTheDocument()
    expect(screen.queryByRole('button', {name: 'Switch to light mode'})).not.toBeInTheDocument()
  })

  it('offers light mode while the dark theme is active', () => {
    currentTheme = 'dark'
    render(<ThemeSwitch />)

    expect(screen.getByRole('button', {name: 'Switch to light mode'})).toBeInTheDocument()
    expect(screen.queryByRole('button', {name: 'Switch to dark mode'})).not.toBeInTheDocument()
  })

  it('treats the system theme like light', () => {
    currentTheme = 'system'
    render(<ThemeSwitch />)

    expect(screen.getByRole('button', {name: 'Switch to dark mode'})).toBeInTheDocument()
  })

  it('switches to dark when pressed in the light theme', async () => {
    const user = userEvent.setup()
    render(<ThemeSwitch />)

    await user.click(screen.getByRole('button', {name: 'Switch to dark mode'}))

    expect(setTheme).toHaveBeenCalledExactlyOnceWith('dark')
  })

  it('switches to light when pressed in the dark theme', async () => {
    currentTheme = 'dark'
    const user = userEvent.setup()
    render(<ThemeSwitch />)

    await user.click(screen.getByRole('button', {name: 'Switch to light mode'}))

    expect(setTheme).toHaveBeenCalledExactlyOnceWith('light')
  })

  it.each(['{Enter}', ' '])('activates from the keyboard (%j)', async key => {
    const user = userEvent.setup()
    render(<ThemeSwitch />)

    await user.tab()
    expect(screen.getByRole('button')).toHaveFocus()
    await user.keyboard(key)

    expect(setTheme).toHaveBeenCalledExactlyOnceWith('dark')
  })
})
