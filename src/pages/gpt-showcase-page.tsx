import type {GPTConfiguration} from '@/types/gpt'
import {useStorage} from '@/hooks/use-storage'
import {cn, ds} from '@/lib/design-system'
import {Button, Card, CardBody, Chip, Skeleton, Tooltip} from '@heroui/react'
import {
  BookOpen,
  Bot,
  ChevronLeft,
  Code,
  Edit2,
  FileText,
  Globe,
  Image as ImageIcon,
  Link as LinkIcon,
  MessageSquare,
  Search,
  Settings2,
  Sparkles,
  Zap,
} from 'lucide-react'
import {useCallback, useEffect, useState} from 'react'
import {useNavigate, useParams} from 'react-router-dom'

/**
 * GPT Showcase Page - Polished read-only view of a GPT configuration
 * Accessed when clicking a GPT from the home page
 * Provides overview, conversation starters, capabilities, and navigation to edit/test
 */
export function GPTShowcasePage() {
  const {gptId} = useParams<{gptId: string}>()
  const navigate = useNavigate()
  const {getGPT} = useStorage()
  const [gpt, setGpt] = useState<GPTConfiguration | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // All hooks must be called before any conditional returns
  const handleBack = useCallback(() => {
    const result = navigate('/')
    if (result instanceof Promise) {
      result.catch(console.error)
    }
  }, [navigate])

  const handleEdit = useCallback(() => {
    if (gptId) {
      const result = navigate(`/gpt/edit/${gptId}`)
      if (result instanceof Promise) {
        result.catch(console.error)
      }
    }
  }, [navigate, gptId])

  const handleStartConversation = useCallback(() => {
    if (gptId) {
      const result = navigate(`/gpt/test/${gptId}`)
      if (result instanceof Promise) {
        result.catch(console.error)
      }
    }
  }, [navigate, gptId])

  const handleStarterClick = useCallback(
    (starter: string) => {
      if (gptId) {
        const result = navigate(`/gpt/test/${gptId}?starter=${encodeURIComponent(starter)}`)
        if (result instanceof Promise) {
          result.catch(console.error)
        }
      }
    },
    [navigate, gptId],
  )

  useEffect(() => {
    if (!gptId) {
      setIsLoading(false)
      setError('No GPT ID provided')
      return
    }

    let isMounted = true

    const loadGPT = async () => {
      try {
        const config = await getGPT(gptId)
        if (!isMounted) return
        if (config) {
          setGpt(config)
        } else {
          setError('GPT not found')
        }
      } catch (loadError: unknown) {
        if (!isMounted) return
        setError(loadError instanceof Error ? loadError.message : 'Failed to load GPT')
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadGPT().catch(console.error)

    return () => {
      isMounted = false
    }
  }, [gptId, getGPT])

  if (isLoading) {
    return (
      <div className={cn(ds.layout.container, 'py-8 min-h-screen flex flex-col justify-center')}>
        <GPTShowcaseSkeleton />
      </div>
    )
  }

  if (error || !gpt) {
    return (
      <div className={cn(ds.layout.container, 'py-8 min-h-screen flex items-center justify-center')}>
        <Card role="alert" data-testid="error-card" className="max-w-md w-full mx-auto shadow-lg border-danger-100">
          <CardBody className="text-center py-12">
            <div className="w-16 h-16 bg-danger-50 text-danger-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Sparkles size={32} />
            </div>
            <h2 className="text-xl font-semibold text-content-primary mb-2">Unable to Load GPT</h2>
            <p data-testid="error-message" className="text-content-secondary mb-6">
              {error || 'GPT not found'}
            </p>
            <Button color="primary" variant="flat" onPress={handleBack} startContent={<ChevronLeft size={18} />}>
              Return to Library
            </Button>
          </CardBody>
        </Card>
      </div>
    )
  }

  const capabilities = getEnabledCapabilities(gpt)
  const hasKnowledge = gpt.knowledge.files.length > 0 || gpt.knowledge.urls.length > 0

  return (
    <div className="min-h-screen bg-surface-primary pb-20">
      {/* Top Navigation */}
      <div className="sticky top-0 z-20 w-full backdrop-blur-md bg-surface-primary/80 border-b border-border-subtle">
        <div className={cn(ds.layout.container, 'h-16 flex items-center justify-between')}>
          <Tooltip content="Back to Library">
            <Button
              data-testid="showcase-back-button"
              isIconOnly
              variant="light"
              onPress={handleBack}
              aria-label="Back"
            >
              <ChevronLeft className="text-content-secondary" size={24} />
            </Button>
          </Tooltip>
          <div className="flex gap-2">
            <Tooltip content="Edit Configuration">
              <Button
                data-testid="showcase-edit-icon-button"
                isIconOnly
                variant="light"
                onPress={handleEdit}
                aria-label="Edit"
              >
                <Settings2 className="text-content-secondary" size={20} />
              </Button>
            </Tooltip>
          </div>
        </div>
      </div>

      <div className={cn(ds.layout.container, 'max-w-5xl mx-auto pt-8 md:pt-16 px-4')}>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          {/* Left Column: Hero & Info */}
          <div className="lg:col-span-5 space-y-8">
            {/* Hero Section */}
            <div className="text-center lg:text-left space-y-6">
              <div className="relative inline-block">
                <div
                  data-testid="gpt-icon"
                  className="w-24 h-24 md:w-32 md:h-32 rounded-3xl bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900/50 dark:to-primary-800/30 flex items-center justify-center shadow-xl shadow-primary-500/10 mx-auto lg:mx-0 ring-1 ring-border-subtle"
                >
                  <Bot size={48} className="text-primary-600 dark:text-primary-400" strokeWidth={1.5} />
                </div>
                <div className="absolute -bottom-2 -right-2 bg-surface-primary rounded-full p-1 shadow-sm border border-border-subtle">
                  <div className="w-8 h-8 rounded-full bg-success-50 text-success-600 flex items-center justify-center">
                    <Sparkles size={14} />
                  </div>
                </div>
              </div>

              <div>
                <h1 data-testid="gpt-showcase-name" className={cn(ds.text.heading.h1, 'mb-3')}>
                  {gpt.name}
                </h1>
                <p
                  data-testid="gpt-showcase-description"
                  className={cn(ds.text.body.large, 'mb-6 max-w-md mx-auto lg:mx-0')}
                >
                  {gpt.description || 'A custom GPT assistant ready to help.'}
                </p>

                <div
                  data-testid="gpt-showcase-tags"
                  className="flex flex-wrap gap-2 justify-center lg:justify-start mb-8"
                >
                  {gpt.tags &&
                    gpt.tags.map(tag => (
                      <Chip
                        data-testid="gpt-tag"
                        key={tag}
                        size="sm"
                        variant="flat"
                        className="bg-surface-secondary text-content-secondary"
                      >
                        {tag}
                      </Chip>
                    ))}
                </div>

                <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
                  <Button
                    data-testid="showcase-start-chatting-button"
                    color="primary"
                    size="lg"
                    className="font-medium shadow-lg shadow-primary-500/20"
                    startContent={<MessageSquare size={20} />}
                    onPress={handleStartConversation}
                  >
                    Start Chatting
                  </Button>
                  <Button
                    data-testid="showcase-edit-button"
                    variant="bordered"
                    size="lg"
                    startContent={<Edit2 size={18} />}
                    onPress={handleEdit}
                    className="border-border-default hover:bg-surface-secondary"
                  >
                    Edit
                  </Button>
                </div>
              </div>
            </div>

            {/* Capabilities Summary */}
            <div data-testid="capabilities-section" className="pt-8 border-t border-border-subtle">
              <h3 className="text-sm font-semibold text-content-secondary uppercase tracking-wider mb-4">
                Capabilities
              </h3>
              <div className="flex flex-wrap gap-2">
                {capabilities.length > 0 ? (
                  capabilities.map(cap => (
                    <Tooltip key={cap.key} content={cap.label}>
                      <div
                        data-testid="capability-badge"
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-secondary/50 border border-border-subtle text-sm text-content-primary"
                      >
                        {cap.icon}
                        <span>{cap.label}</span>
                      </div>
                    </Tooltip>
                  ))
                ) : (
                  <span data-testid="no-capabilities-message" className="text-sm text-content-tertiary italic">
                    Basic chat capabilities only
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Starters & Details */}
          <div className="lg:col-span-7 space-y-8">
            {/* Conversation Starters */}
            <section data-testid="conversation-starters-section">
              <div className="flex items-center justify-between mb-4">
                <h2 className={cn(ds.text.heading.h3, 'flex items-center gap-2')}>
                  <Zap className="w-5 h-5 text-primary-500" />
                  Conversation Starters
                </h2>
              </div>

              {gpt.conversationStarters && gpt.conversationStarters.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {gpt.conversationStarters.map((starter, index) => (
                    <Card
                      key={`starter-${index}-${starter.slice(0, 20)}`}
                      data-testid="conversation-starter"
                      isPressable
                      className={cn(
                        'bg-surface-elevated hover:bg-surface-tertiary border border-border-subtle transition-all',
                        ds.animation.cardHover,
                      )}
                      onPress={() => handleStarterClick(starter)}
                    >
                      <CardBody className="py-4 px-5 flex flex-row items-start gap-3">
                        <div className="mt-0.5 min-w-[16px]">
                          <MessageSquare size={16} className="text-primary-500 opacity-70" />
                        </div>
                        <p className="text-content-primary text-sm font-medium leading-relaxed text-left">{starter}</p>
                      </CardBody>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="bg-surface-secondary/30 border-dashed border-border-default">
                  <CardBody data-testid="no-starters-message" className="py-8 text-center text-content-tertiary">
                    <p>No conversation starters configured.</p>
                  </CardBody>
                </Card>
              )}
            </section>

            {/* Knowledge & Context */}
            {hasKnowledge && (
              <section data-testid="knowledge-section">
                <h2 className={cn(ds.text.heading.h3, 'mb-4 flex items-center gap-2')}>
                  <BookOpen className="w-5 h-5 text-secondary-500" />
                  Knowledge Base
                </h2>
                <Card className="bg-surface-secondary/20 border border-border-subtle">
                  <CardBody>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {gpt.knowledge.files.length > 0 && (
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-surface-primary border border-border-subtle">
                          <div className="w-10 h-10 rounded-full bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center text-primary-600 dark:text-primary-400">
                            <FileText size={20} />
                          </div>
                          <div>
                            <div
                              data-testid="knowledge-files-count"
                              className="text-lg font-semibold text-content-primary"
                            >
                              {gpt.knowledge.files.length}
                            </div>
                            <div className="text-xs text-content-tertiary uppercase tracking-wide">Files</div>
                          </div>
                        </div>
                      )}
                      {gpt.knowledge.urls.length > 0 && (
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-surface-primary border border-border-subtle">
                          <div className="w-10 h-10 rounded-full bg-secondary-50 dark:bg-secondary-900/20 flex items-center justify-center text-secondary-600 dark:text-secondary-400">
                            <LinkIcon size={20} />
                          </div>
                          <div>
                            <div
                              data-testid="knowledge-urls-count"
                              className="text-lg font-semibold text-content-primary"
                            >
                              {gpt.knowledge.urls.length}
                            </div>
                            <div className="text-xs text-content-tertiary uppercase tracking-wide">URLs</div>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardBody>
                </Card>
              </section>
            )}

            {/* Technical Details */}
            {(gpt.modelProvider || gpt.modelName) && (
              <section data-testid="model-configuration" className="pt-4">
                <div className="flex flex-wrap gap-3 text-xs text-content-tertiary items-center justify-center lg:justify-start">
                  <span className="uppercase tracking-widest font-semibold">Model Configuration</span>
                  <div className="h-px bg-border-subtle flex-grow min-w-[20px]"></div>
                  {gpt.modelProvider && (
                    <Chip variant="flat" size="sm" className="bg-surface-secondary text-content-secondary">
                      {gpt.modelProvider}
                    </Chip>
                  )}
                  {gpt.modelName && (
                    <Chip variant="flat" size="sm" className="bg-surface-secondary text-content-secondary">
                      {gpt.modelName}
                    </Chip>
                  )}
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Skeleton loader for the showcase page
 */
function GPTShowcaseSkeleton() {
  return (
    <div data-testid="showcase-skeleton" className="max-w-5xl mx-auto w-full px-4 pt-16">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        <div className="lg:col-span-5 space-y-8">
          <div className="text-center lg:text-left space-y-6">
            <Skeleton className="w-32 h-32 rounded-3xl mx-auto lg:mx-0" />
            <div className="space-y-3">
              <Skeleton className="w-48 h-10 rounded-lg mx-auto lg:mx-0" />
              <Skeleton className="w-full h-20 rounded-lg" />
            </div>
            <div className="flex gap-2 justify-center lg:justify-start">
              <Skeleton className="w-16 h-6 rounded-full" />
              <Skeleton className="w-20 h-6 rounded-full" />
            </div>
            <div className="flex gap-3 justify-center lg:justify-start">
              <Skeleton className="w-32 h-12 rounded-xl" />
              <Skeleton className="w-24 h-12 rounded-xl" />
            </div>
          </div>
        </div>
        <div className="lg:col-span-7 space-y-6">
          <Skeleton className="w-48 h-8 rounded-lg" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Get list of enabled capabilities with labels and icons
 */
function getEnabledCapabilities(gpt: GPTConfiguration) {
  const capabilities: {key: string; label: string; icon: React.ReactNode}[] = []

  if (gpt.capabilities.codeInterpreter) {
    capabilities.push({
      key: 'code',
      label: 'Code Interpreter',
      icon: <Code className="w-4 h-4 text-primary-500" />,
    })
  }
  if (gpt.capabilities.webBrowsing) {
    capabilities.push({
      key: 'web',
      label: 'Web Browsing',
      icon: <Globe className="w-4 h-4 text-success-500" />,
    })
  }
  if (gpt.capabilities.imageGeneration) {
    capabilities.push({
      key: 'image',
      label: 'Image Generation',
      icon: <ImageIcon className="w-4 h-4 text-secondary-500" />,
    })
  }
  if (gpt.capabilities.fileSearch?.enabled) {
    capabilities.push({
      key: 'search',
      label: 'File Search',
      icon: <Search className="w-4 h-4 text-warning-500" />,
    })
  }

  return capabilities
}
