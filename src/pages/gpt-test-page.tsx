import type {GPTConfiguration} from '@/types/gpt'
import {GPTTestPane} from '@/components/gpt-test-pane'
import {useStorage} from '@/hooks/use-storage'
import {cn, ds} from '@/lib/design-system'
import {useEffect, useState} from 'react'
import {useParams} from 'react-router-dom'

export function GPTTestPage() {
  const {gptId} = useParams()
  const storage = useStorage()
  const [gptConfig, setGptConfig] = useState<GPTConfiguration | undefined>(undefined)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadGpt = async () => {
      if (typeof gptId === 'string' && gptId.trim() !== '') {
        const config = await storage.getGPT(gptId)
        setGptConfig(config)
      }
      setIsLoading(false)
    }
    loadGpt().catch(console.error)
  }, [gptId, storage])

  if (isLoading) {
    return (
      <div className="flex flex-col h-screen p-4">
        <p className={cn(ds.text.body.large, 'text-content-tertiary')}>Loading...</p>
      </div>
    )
  }

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
