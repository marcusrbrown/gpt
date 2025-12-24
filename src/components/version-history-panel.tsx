import type {GPTVersion} from '@/types/gpt-extensions'
import {useStorage} from '@/hooks/use-storage'
import {cn, ds} from '@/lib/design-system'
import {Button, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, Spinner} from '@heroui/react'
import {History, RotateCcw} from 'lucide-react'
import {useCallback, useEffect, useState} from 'react'

interface VersionHistoryPanelProps {
  gptId: string
  isOpen: boolean
  onClose: () => void
  onRestore: (version: GPTVersion) => void
}

export function VersionHistoryPanel({gptId, isOpen, onClose, onRestore}: VersionHistoryPanelProps) {
  const {getVersions} = useStorage()
  const [versions, setVersions] = useState<GPTVersion[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [restoringId, setRestoringId] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return

    const loadVersions = async () => {
      setIsLoading(true)
      try {
        const result = await getVersions(gptId)
        setVersions(result)
      } catch {
        setVersions([])
      } finally {
        setIsLoading(false)
      }
    }

    loadVersions().catch(() => {})
  }, [gptId, isOpen, getVersions])

  const handleRestore = useCallback(
    async (version: GPTVersion) => {
      setRestoringId(version.id)
      try {
        onRestore(version)
      } finally {
        setRestoringId(null)
      }
    },
    [onRestore],
  )

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg" scrollBehavior="inside">
      <ModalContent>
        <ModalHeader className="flex items-center gap-2">
          <History className="h-5 w-5" />
          <span>Version History</span>
        </ModalHeader>
        <ModalBody>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Spinner size="lg" />
            </div>
          ) : versions.length === 0 ? (
            <div className={cn(ds.state.empty)}>
              <p className={cn(ds.text.body.base)}>No version history available</p>
              <p className={cn(ds.text.body.small, 'mt-2')}>Versions are created when you save changes</p>
            </div>
          ) : (
            <div className="space-y-3">
              {versions.map(version => (
                <div
                  key={version.id}
                  className={cn(
                    'flex items-center justify-between p-4 rounded-lg',
                    'bg-surface-secondary border border-border-default',
                  )}
                >
                  <div>
                    <p className={cn(ds.text.heading.h4)}>Version {version.version}</p>
                    <p className={cn(ds.text.body.small)}>{formatDate(version.createdAt)}</p>
                    {version.changeDescription && (
                      <p className={cn(ds.text.body.small, 'mt-1')}>{version.changeDescription}</p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="bordered"
                    startContent={<RotateCcw className="h-4 w-4" />}
                    isLoading={restoringId === version.id}
                    onPress={() => {
                      handleRestore(version).catch(() => {})
                    }}
                    aria-label={`Restore version ${version.version}`}
                  >
                    Restore
                  </Button>
                </div>
              ))}
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <Button variant="light" onPress={onClose}>
            Close
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
