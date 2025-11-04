import type {GPTConfiguration} from '../types/gpt'
import {useMemo} from 'react'
import {useParams} from 'react-router-dom'
import {GPTTestPane} from '../components/gpt-test-pane'
import {useStorage} from '../hooks/use-storage'
import {cn, ds} from '../lib/design-system'

export function GPTTestPage() {
  const {gptId} = useParams()
  const storage = useStorage()
  const gptConfig = useMemo<GPTConfiguration | undefined>(() => {
    // Only proceed when gptId is a defined, non-empty string
    if (typeof gptId === 'string' && gptId.trim() !== '') {
      return storage.getGPT(gptId)
    }
    return undefined
  }, [gptId, storage])

  if (!gptConfig) {
    return (
      <div className="flex flex-col h-screen p-4">
        <p className={cn(ds.text.body.large, 'text-content-tertiary')}>GPT not found. Please select a valid GPT.</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className={cn(ds.text.heading.h2, 'mb-6')}>{gptConfig.name} - Test</h1>
      <GPTTestPane gptConfig={gptConfig} />
    </div>
  )
}
