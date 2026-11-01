import type {GPTVersion} from '@/types/gpt-extensions'
import {useStorage} from '@/hooks/use-storage'
import {cn, ds} from '@/lib/design-system'
import '@/styles/heroui-v3.css'
import {Spinner} from '@heroui/react'
import {Button, Modal, Spinner as SpinnerV3} from '@heroui-v3/react'
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
    <Modal.Backdrop
      isOpen={isOpen}
      onOpenChange={open => {
        if (!open) onClose()
      }}
      variant="opaque"
    >
      <Modal.Container size="lg" placement="center" scroll="inside">
        <Modal.Dialog>
          <Modal.CloseTrigger />
          <Modal.Header className="flex-row items-center gap-2 pr-8">
            <History className="h-5 w-5" />
            <Modal.Heading className="text-lg font-semibold">Version History</Modal.Heading>
          </Modal.Header>
          <Modal.Body className="text-base text-foreground">
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
                      variant="outline"
                      isPending={restoringId === version.id}
                      onPress={() => {
                        handleRestore(version).catch(() => {})
                      }}
                      aria-label={`Restore version ${version.version}`}
                    >
                      {({isPending}) => (
                        <>
                          {isPending ? <SpinnerV3 size="sm" color="current" /> : <RotateCcw className="h-4 w-4" />}
                          Restore
                        </>
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="tertiary" onPress={onClose}>
              Close
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  )
}
