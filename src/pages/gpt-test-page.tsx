import {useEffect, useState} from 'react'
import {useParams} from 'react-router-dom'
import {GPTTestPane} from '../components/gpt-test-pane'
import {useStorage} from '../hooks/use-storage'
import {type GPTConfiguration} from '../types/gpt'

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
      <div className="flex items-center justify-center h-screen">
        <p className="text-lg text-gray-500">GPT not found. Please select a valid GPT.</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">{gptConfig.name} - Test</h1>
      <GPTTestPane gptConfig={gptConfig} />
    </div>
  )
}
