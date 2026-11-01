import {render, screen} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {describe, expect, it, vi} from 'vitest'
import {ChatInput} from '../chat-input'

describe('ChatInput', () => {
  it('replaces send with a keyboard-accessible stop action while streaming', async () => {
    const handleStop = vi.fn()
    const {rerender} = render(<ChatInput onSendMessage={vi.fn()} onStop={handleStop} isStreaming={false} />)
    expect(screen.getByRole('button', {name: 'Send message to GPT assistant'})).toBeInTheDocument()
    rerender(<ChatInput onSendMessage={vi.fn()} onStop={handleStop} isStreaming />)
    const stop = screen.getByRole('button', {name: 'Stop generating'})
    stop.focus()
    await userEvent.keyboard('{Enter}')
    expect(handleStop).toHaveBeenCalledOnce()
    expect(screen.queryByRole('button', {name: 'Send message to GPT assistant'})).not.toBeInTheDocument()
  })
})
