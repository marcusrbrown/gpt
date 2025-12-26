import {cn, ds} from '@/lib/design-system'
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Checkbox,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Progress,
} from '@heroui/react'
import {AlertTriangle, Calendar, CheckCircle2, Database, Download, FileArchive, HardDrive, Upload} from 'lucide-react'
import {useCallback, useRef, useState} from 'react'

interface BackupRestorePanelProps {
  onCreateBackup: (options: BackupOptions) => Promise<void>
  onRestoreBackup: (file: File, wipeExisting: boolean) => Promise<RestoreResult>
  lastBackupDate?: Date | null
  storageUsed?: number
  itemCounts?: {
    gpts: number
    conversations: number
    folders: number
  }
}

interface BackupOptions {
  includeConversations: boolean
  includeKnowledge: boolean
  includeSettings: boolean
}

interface RestoreResult {
  success: boolean
  imported: number
  errors: string[]
}

const DEFAULT_ITEM_COUNTS = {gpts: 0, conversations: 0, folders: 0}

export function BackupRestorePanel({
  onCreateBackup,
  onRestoreBackup,
  lastBackupDate,
  storageUsed = 0,
  itemCounts = DEFAULT_ITEM_COUNTS,
}: BackupRestorePanelProps) {
  const [isCreatingBackup, setIsCreatingBackup] = useState(false)
  const [backupProgress, setBackupProgress] = useState(0)
  const [includeConversations, setIncludeConversations] = useState(true)
  const [includeKnowledge, setIncludeKnowledge] = useState(true)
  const [includeSettings, setIncludeSettings] = useState(true)

  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [wipeExisting, setWipeExisting] = useState(false)
  const [isRestoring, setIsRestoring] = useState(false)
  const [restoreResult, setRestoreResult] = useState<RestoreResult | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleCreateBackup = useCallback(async () => {
    setIsCreatingBackup(true)
    setBackupProgress(0)

    const progressInterval = setInterval(() => {
      setBackupProgress(prev => Math.min(prev + 5, 90))
    }, 100)

    try {
      await onCreateBackup({
        includeConversations,
        includeKnowledge,
        includeSettings,
      })
      setBackupProgress(100)
    } catch (error_) {
      console.error('Backup failed:', error_)
    } finally {
      clearInterval(progressInterval)
      setTimeout(() => {
        setIsCreatingBackup(false)
        setBackupProgress(0)
      }, 1000)
    }
  }, [onCreateBackup, includeConversations, includeKnowledge, includeSettings])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      setIsRestoreModalOpen(true)
    }
  }, [])

  const handleRestore = useCallback(async () => {
    if (!selectedFile) return

    setIsRestoring(true)
    try {
      const result = await onRestoreBackup(selectedFile, wipeExisting)
      setRestoreResult(result)
    } catch (error_) {
      setRestoreResult({
        success: false,
        imported: 0,
        errors: [error_ instanceof Error ? error_.message : 'Restore failed'],
      })
    } finally {
      setIsRestoring(false)
    }
  }, [selectedFile, wipeExisting, onRestoreBackup])

  const handleCloseRestoreModal = useCallback(() => {
    setIsRestoreModalOpen(false)
    setSelectedFile(null)
    setWipeExisting(false)
    setRestoreResult(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [])

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${Number.parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(date)
  }

  return (
    <div className={cn(ds.layout.container, 'py-8 max-w-4xl')}>
      <div className="mb-8">
        <h1 className={ds.text.heading.h2}>Backup & Restore</h1>
        <p className={ds.text.body.base}>
          Create backups of your GPT configurations and restore from previous backups.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className={ds.card.base}>
          <CardHeader className="flex gap-3">
            <Database className="w-6 h-6 text-primary" />
            <div className="flex flex-col">
              <p className="text-md font-semibold">Storage Overview</p>
              <p className="text-small text-content-tertiary">Current data statistics</p>
            </div>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 bg-surface-secondary rounded-lg">
                <p className="text-2xl font-bold text-primary">{itemCounts.gpts}</p>
                <p className="text-xs text-content-tertiary">GPTs</p>
              </div>
              <div className="text-center p-3 bg-surface-secondary rounded-lg">
                <p className="text-2xl font-bold text-success">{itemCounts.conversations}</p>
                <p className="text-xs text-content-tertiary">Conversations</p>
              </div>
              <div className="text-center p-3 bg-surface-secondary rounded-lg">
                <p className="text-2xl font-bold text-warning">{itemCounts.folders}</p>
                <p className="text-xs text-content-tertiary">Folders</p>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-surface-secondary rounded-lg">
              <div className="flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-content-tertiary" />
                <span className="text-sm text-content-secondary">Storage Used</span>
              </div>
              <span className="text-sm font-medium">{formatBytes(storageUsed)}</span>
            </div>

            {lastBackupDate && (
              <div className="flex items-center justify-between p-3 bg-surface-secondary rounded-lg">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-content-tertiary" />
                  <span className="text-sm text-content-secondary">Last Backup</span>
                </div>
                <span className="text-sm font-medium">{formatDate(lastBackupDate)}</span>
              </div>
            )}
          </CardBody>
        </Card>

        <Card className={ds.card.base}>
          <CardHeader className="flex gap-3">
            <Download className="w-6 h-6 text-success" />
            <div className="flex flex-col">
              <p className="text-md font-semibold">Create Backup</p>
              <p className="text-small text-content-tertiary">Export all your data</p>
            </div>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="space-y-3">
              <Checkbox isSelected={includeConversations} onValueChange={setIncludeConversations} size="sm">
                <span className="text-sm">Include conversations</span>
              </Checkbox>
              <Checkbox isSelected={includeKnowledge} onValueChange={setIncludeKnowledge} size="sm">
                <span className="text-sm">Include knowledge files</span>
              </Checkbox>
              <Checkbox isSelected={includeSettings} onValueChange={setIncludeSettings} size="sm">
                <span className="text-sm">Include settings</span>
              </Checkbox>
            </div>

            {isCreatingBackup && (
              <Progress
                value={backupProgress}
                color="success"
                size="sm"
                className="mb-2"
                aria-label="Backup progress"
              />
            )}

            <Button
              color="success"
              className="w-full"
              onPress={() => {
                handleCreateBackup().catch(console.error)
              }}
              isLoading={isCreatingBackup}
              startContent={!isCreatingBackup && <FileArchive className="w-4 h-4" />}
            >
              {isCreatingBackup ? 'Creating Backup...' : 'Create Backup'}
            </Button>
          </CardBody>
        </Card>

        <Card className={cn(ds.card.base, 'md:col-span-2')}>
          <CardHeader className="flex gap-3">
            <Upload className="w-6 h-6 text-warning" />
            <div className="flex flex-col">
              <p className="text-md font-semibold">Restore from Backup</p>
              <p className="text-small text-content-tertiary">Import data from a backup file</p>
            </div>
          </CardHeader>
          <CardBody>
            <div className="flex items-center gap-4">
              <input ref={fileInputRef} type="file" accept=".zip" className="hidden" onChange={handleFileSelect} />
              <Button
                color="warning"
                variant="flat"
                onPress={() => fileInputRef.current?.click()}
                startContent={<Upload className="w-4 h-4" />}
              >
                Select Backup File
              </Button>
              <p className="text-sm text-content-tertiary">Select a .zip backup file to restore your data</p>
            </div>

            <div className="mt-4 p-4 bg-warning/10 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-warning mt-0.5 flex-shrink-0" />
                <p className="text-sm text-content-secondary">
                  Restoring a backup may overwrite existing data. Make sure to create a backup of your current data
                  before restoring.
                </p>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      <Modal isOpen={isRestoreModalOpen} onClose={handleCloseRestoreModal} size="md">
        <ModalContent>
          <ModalHeader className="flex flex-col gap-1">
            <h2 className="text-lg font-semibold">Restore Backup</h2>
            {selectedFile && <p className="text-sm text-content-tertiary font-normal">{selectedFile.name}</p>}
          </ModalHeader>

          <ModalBody className="gap-4">
            {restoreResult ? (
              <div className="text-center py-4">
                {restoreResult.success ? (
                  <>
                    <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-success" />
                    <h3 className="text-lg font-semibold mb-2">Restore Complete</h3>
                    <p className="text-content-secondary">Successfully imported {restoreResult.imported} items.</p>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-danger" />
                    <h3 className="text-lg font-semibold mb-2">Restore Failed</h3>
                    <div className="text-left bg-danger/10 rounded-lg p-3 mt-4">
                      <ul className="text-sm text-danger space-y-1">
                        {restoreResult.errors.map(err => (
                          <li key={err}>{err}</li>
                        ))}
                      </ul>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <>
                <div className="p-4 bg-surface-secondary rounded-lg">
                  <p className="text-sm text-content-secondary">
                    You are about to restore data from a backup file. This will import GPT configurations,
                    conversations, and settings.
                  </p>
                </div>

                <div className="p-4 bg-danger/10 rounded-lg">
                  <Checkbox isSelected={wipeExisting} onValueChange={setWipeExisting} color="danger" size="sm">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-danger">Delete all existing data before restore</span>
                      <span className="text-xs text-content-tertiary">
                        This will permanently remove all current data
                      </span>
                    </div>
                  </Checkbox>
                </div>

                {isRestoring && <Progress isIndeterminate color="warning" size="sm" aria-label="Restore progress" />}
              </>
            )}
          </ModalBody>

          <ModalFooter>
            {restoreResult ? (
              <Button color="primary" onPress={handleCloseRestoreModal}>
                Done
              </Button>
            ) : (
              <>
                <Button variant="flat" onPress={handleCloseRestoreModal} isDisabled={isRestoring}>
                  Cancel
                </Button>
                <Button
                  color="warning"
                  onPress={() => {
                    handleRestore().catch(console.error)
                  }}
                  isLoading={isRestoring}
                  isDisabled={isRestoring}
                >
                  {wipeExisting ? 'Wipe & Restore' : 'Restore'}
                </Button>
              </>
            )}
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  )
}
