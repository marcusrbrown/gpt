import type {OllamaModelInfo} from '@/types/ollama'

import {cn, ds} from '@/lib/design-system'
import {getOllamaProvider} from '@/services/providers/ollama-provider'
import {formatModelSize, supportsThinking, supportsVision} from '@/types/ollama'
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Progress,
  useDisclosure,
} from '@heroui/react'
import {Brain, Cpu, Download, Eye, HardDrive, RefreshCw, Search, Trash2, Zap} from 'lucide-react'
import {useCallback, useEffect, useState} from 'react'

export function OllamaModelManager() {
  const [models, setModels] = useState<OllamaModelInfo[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [pullModelName, setPullModelName] = useState('')
  const [isPulling, setIsPulling] = useState(false)
  const [pullProgress, setPullProgress] = useState(0)
  const [pullStatus, setPullStatus] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  // Delete confirmation state
  const {isOpen, onOpen, onOpenChange, onClose} = useDisclosure()
  const [modelToDelete, setModelToDelete] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const provider = getOllamaProvider()

  const fetchModels = useCallback(async () => {
    setIsLoading(true)
    try {
      // Force a refresh from the provider
      await provider.listModels()
      // Get the raw cached models which contain the full details we need
      const cached = provider.getCachedModels()
      // Sort by modified date descending
      setModels([...cached].sort((a, b) => new Date(b.modified_at).getTime() - new Date(a.modified_at).getTime()))
    } catch (error_) {
      console.error('Failed to fetch models:', error_)
    } finally {
      setIsLoading(false)
    }
  }, [provider])

  useEffect(() => {
    fetchModels().catch(console.error)
  }, [fetchModels])

  const handlePullModel = async () => {
    if (!pullModelName.trim()) return

    setIsPulling(true)
    setPullProgress(0)
    setPullStatus('Starting download...')

    try {
      await provider.pullModel(pullModelName, progress => {
        setPullProgress(progress * 100)
        setPullStatus(`Downloading... ${Math.round(progress * 100)}%`)
      })
      setPullStatus('Completed!')
      setPullModelName('')
      await fetchModels()
      // Reset status after a moment
      setTimeout(() => {
        setIsPulling(false)
        setPullStatus('')
        setPullProgress(0)
      }, 2000)
    } catch (error_: unknown) {
      console.error('Failed to pull model:', error_)
      setPullStatus('Failed to download model')
      setTimeout(() => setIsPulling(false), 3000)
    }
  }

  const confirmDelete = (name: string) => {
    setModelToDelete(name)
    onOpen()
  }

  const handleDeleteModel = async () => {
    if (!modelToDelete) return

    setIsDeleting(true)
    try {
      await provider.deleteModel(modelToDelete)
      await fetchModels()
      onClose()
    } catch (error_: unknown) {
      console.error('Failed to delete model:', error_)
    } finally {
      setIsDeleting(false)
      setModelToDelete(null)
    }
  }

  const filteredModels = models.filter(m => m.name.toLowerCase().includes(searchQuery.toLowerCase()))

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className={cn(ds.text.heading.h2, 'flex items-center gap-2')}>
            <Cpu className="h-6 w-6 text-primary" />
            Local Models
          </h2>
          <p className={ds.text.body.small}>Manage your local Ollama LLM library</p>
        </div>
        <Button
          isIconOnly
          variant="flat"
          aria-label="Refresh models"
          onPress={() => {
            fetchModels().catch(console.error)
          }}
          isLoading={isLoading}
        >
          <RefreshCw className={cn('h-5 w-5', isLoading && 'animate-spin')} />
        </Button>
      </div>

      {/* Control Bar */}
      <div className={cn(ds.card.base, 'bg-content2/50 p-4 backdrop-blur-md border-border-default')}>
        <div className="grid gap-4 md:grid-cols-2">
          {/* Pull Form */}
          <form
            onSubmit={e => {
              e.preventDefault()
              handlePullModel().catch(console.error)
            }}
            className="flex gap-2"
          >
            <Input
              placeholder="Pull model (e.g. llama3, mistral)"
              value={pullModelName}
              onChange={e => setPullModelName(e.target.value)}
              startContent={<Download className="h-4 w-4 text-default-400" />}
              size="sm"
              isDisabled={isPulling}
              className="flex-1"
            />
            <Button type="submit" color="primary" size="sm" isLoading={isPulling} isDisabled={!pullModelName.trim()}>
              Pull
            </Button>
          </form>

          {/* Search */}
          <Input
            placeholder="Search installed models..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            startContent={<Search className="h-4 w-4 text-default-400" />}
            size="sm"
            isClearable
            onClear={() => setSearchQuery('')}
          />
        </div>

        {/* Progress Indicator */}
        {isPulling && (
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-xs text-default-500">
              <span>{pullStatus}</span>
              <span>{Math.round(pullProgress)}%</span>
            </div>
            <Progress
              size="sm"
              value={pullProgress}
              color={pullProgress === 100 ? 'success' : 'primary'}
              aria-label="Download progress"
              className="max-w-full"
            />
          </div>
        )}
      </div>

      {/* Model Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filteredModels.map(model => (
          <ModelCard key={model.digest} model={model} onDelete={() => confirmDelete(model.name)} />
        ))}

        {filteredModels.length === 0 && !isLoading && (
          <div className="col-span-full py-12 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-content2">
              <HardDrive className="h-8 w-8 text-default-400" />
            </div>
            <h3 className="text-lg font-medium text-foreground">No models found</h3>
            <p className="text-default-500">
              {searchQuery ? 'Try a different search term' : 'Pull a model to get started'}
            </p>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
        <ModalContent>
          {onClose => (
            <>
              <ModalHeader className="flex flex-col gap-1">Delete Model</ModalHeader>
              <ModalBody>
                <p>
                  Are you sure you want to delete{' '}
                  <span className="font-mono font-bold text-danger">{modelToDelete}</span>? This action cannot be
                  undone.
                </p>
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose}>
                  Cancel
                </Button>
                <Button
                  color="danger"
                  onPress={() => {
                    handleDeleteModel().catch(console.error)
                  }}
                  isLoading={isDeleting}
                >
                  Delete
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  )
}

function ModelCard({model, onDelete}: {model: OllamaModelInfo; onDelete: () => void}) {
  const isVision = supportsVision(model.name)
  const isReasoning = supportsThinking(model.name)
  const isEmbedding = model.name.includes('embed')

  // Calculate days since modification
  const modifiedDate = new Date(model.modified_at)
  const now = new Date()
  const daysAgo = Math.floor((now.getTime() - modifiedDate.getTime()) / (1000 * 3600 * 24))

  return (
    <Card
      className={cn(
        'group border border-transparent transition-all duration-200',
        'hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5',
        'bg-content1/50 backdrop-blur-sm',
      )}
    >
      <CardHeader className="flex items-start justify-between pb-0">
        <div className="min-w-0 flex-1 pr-2">
          <h3 className="truncate font-mono text-lg font-bold text-foreground" title={model.name}>
            {model.name.split(':')[0]}
          </h3>
          <div className="flex items-center gap-2 text-xs text-default-500">
            <span className="truncate rounded bg-content2 px-1.5 py-0.5 font-mono" title={model.name}>
              {model.name.split(':')[1] || 'latest'}
            </span>
            <span>•</span>
            <span>{formatModelSize(model.size)}</span>
          </div>
        </div>
        <Button
          isIconOnly
          size="sm"
          variant="light"
          color="danger"
          className="opacity-0 transition-opacity group-hover:opacity-100"
          onPress={onDelete}
          aria-label={`Delete ${model.name}`}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardBody className="gap-4">
        {/* Capabilities Badges */}
        <div className="flex flex-wrap gap-2">
          {isVision && (
            <div className="flex items-center gap-1 rounded-full bg-purple-500/10 px-2 py-0.5 text-xs font-medium text-purple-500">
              <Eye className="h-3 w-3" />
              Vision
            </div>
          )}
          {isReasoning && (
            <div className="flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-xs font-medium text-blue-500">
              <Brain className="h-3 w-3" />
              Reasoning
            </div>
          )}
          {isEmbedding && (
            <div className="flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-500">
              <Zap className="h-3 w-3" />
              Embedding
            </div>
          )}
          {!isVision && !isReasoning && !isEmbedding && (
            <div className="flex items-center gap-1 rounded-full bg-default-100 px-2 py-0.5 text-xs font-medium text-default-500">
              <Cpu className="h-3 w-3" />
              Standard
            </div>
          )}
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-y-2 text-xs text-default-500">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-wider opacity-70">Family</span>
            <span className="font-mono text-foreground">{model.details.family}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-wider opacity-70">Params</span>
            <span className="font-mono text-foreground">{model.details.parameter_size}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-wider opacity-70">Format</span>
            <span className="font-mono text-foreground">{model.details.format}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-wider opacity-70">Quant</span>
            <span className="font-mono text-foreground">{model.details.quantization_level}</span>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-divider pt-3 text-[10px] text-default-400">
          <span>{model.digest.slice(0, 12)}...</span>
          <span>{daysAgo === 0 ? 'Today' : `${daysAgo} day${daysAgo > 1 ? 's' : ''} ago`}</span>
        </div>
      </CardBody>
    </Card>
  )
}
