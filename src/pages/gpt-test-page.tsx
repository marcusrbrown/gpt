import type {GPTConfiguration} from '../types/gpt'
import {useEffect, useState} from 'react'
import {useParams} from 'react-router-dom'
import {GPTTestPane} from '../components/gpt-test-pane'
import {useStorage} from '../hooks/use-storage'
import {cn, ds} from '../lib/design-system'

export function GPTTestPage() {
  const {gptId} = useParams()
  const storage = useStorage()
  const [gptConfig, setGptConfig] = useState<GPTConfiguration | undefined>(undefined)

  useEffect(() => {
    if (gptId) {
      const savedGpt = storage.getGPT(gptId)
      if (savedGpt) {
        setGptConfig(savedGpt)
      }
    }
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
