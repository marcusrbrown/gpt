import {render, screen} from '@testing-library/react'
import {describe, expect, it} from 'vitest'
import {MessageBubble} from '../message-bubble'

function show(props: Partial<Parameters<typeof MessageBubble>[0]> = {}) {
  return render(<MessageBubble role="assistant" content="Reply" timestamp={new Date()} {...props} />)
}

describe('MessageBubble', () => {
  it('shows no status tag by default', () => {
    show()
    expect(screen.queryByText('Stopped')).not.toBeInTheDocument()
    expect(screen.queryByText('Cut off')).not.toBeInTheDocument()
  })

  it('shows a Stopped tag for a stopped reply', () => {
    show({stopped: true})
    expect(screen.getByText('Stopped')).toBeInTheDocument()
    expect(screen.queryByText('Cut off')).not.toBeInTheDocument()
  })

  it('shows a Cut off tag for a truncated reply and keeps its text', () => {
    show({truncated: true})
    expect(screen.getByText('Reply')).toBeInTheDocument()
    expect(screen.getByText('Cut off')).toBeInTheDocument()
    expect(screen.queryByText('Stopped')).not.toBeInTheDocument()
  })
})
