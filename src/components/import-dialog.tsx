import type {ConflictResolution, ImportPreview, ImportResult} from '@/types/export-import'
import {cn} from '@/lib/design-system'
import {Button, Chip, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, Progress} from '@heroui/react'
import {AlertCircle, CheckCircle2, FileJson, Package, Upload, XCircle} from 'lucide-react'
import {useCallback, useRef, useState} from 'react'
import {ConflictResolutionPanel} from './conflict-resolution-panel'

interface ImportDialogProps {
  isOpen: boolean
  onClose: () => void
  onValidate: (file: File) => Promise<ImportPreview | null>
  onImport: (file: File, resolutions: Map<string, ConflictResolution>) => Promise<ImportResult>
}

type ImportStep = 'select' | 'preview' | 'importing' | 'complete'

export function ImportDialog({isOpen, onClose, onValidate, onImport}: ImportDialogProps) {
  const [step, setStep] = useState<ImportStep>('select')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<ImportPreview | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [progress, setProgress] = useState(0)
  const [resolutions, setResolutions] = useState<Map<string, ConflictResolution>>(() => new Map())
  const fileInputRef = useRef<HTMLInputElement>(null)

  const resetState = useCallback(() => {
    setStep('select')
    setSelectedFile(null)
    setPreview(null)
    setResult(null)
    setError(null)
    setProgress(0)
    setResolutions(new Map())
  }, [])

  const handleClose = useCallback(() => {
    resetState()
    onClose()
  }, [resetState, onClose])

  const handleFileSelect = useCallback(
    async (file: File) => {
      setSelectedFile(file)
      setError(null)

      const isZip = file.name.endsWith('.zip') || file.type === 'application/zip'
      const isJson = file.name.endsWith('.json') || file.type === 'application/json'

      if (!isZip && !isJson) {
        setError('Please select a JSON or ZIP file')
        return
      }

      try {
        const validationResult = await onValidate(file)
        if (validationResult) {
          setPreview(validationResult)
          setStep('preview')

          const initialResolutions = new Map<string, ConflictResolution>()
          validationResult.items
            .filter(item => item.hasConflict)
            .forEach(item => initialResolutions.set(item.id, 'skip'))
          setResolutions(initialResolutions)
        } else {
          setError('Invalid file format or corrupted data')
        }
      } catch (error_) {
        setError(error_ instanceof Error ? error_.message : 'Failed to validate file')
      }
    },
    [onValidate],
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)

      const file = e.dataTransfer.files[0]
      if (file) {
        handleFileSelect(file).catch(console.error)
      }
    },
    [handleFileSelect],
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleImport = useCallback(async () => {
    if (!selectedFile) return

    setStep('importing')
    setProgress(0)

    try {
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90))
      }, 200)

      const importResult = await onImport(selectedFile, resolutions)

      clearInterval(progressInterval)
      setProgress(100)
      setResult(importResult)
      setStep('complete')
    } catch (error_) {
      setError(error_ instanceof Error ? error_.message : 'Import failed')
      setStep('preview')
    }
  }, [selectedFile, resolutions, onImport])

  const handleResolutionChange = useCallback((itemId: string, resolution: ConflictResolution) => {
    setResolutions(prev => new Map(prev).set(itemId, resolution))
  }, [])

  const conflictingItems = preview?.items.filter(item => item.hasConflict) ?? []
  const hasConflicts = conflictingItems.length > 0

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="lg" scrollBehavior="inside">
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">Import GPT</h2>
          </div>
          <p className="text-sm text-content-tertiary font-normal">Import GPT configurations from JSON or ZIP files</p>
        </ModalHeader>

        <ModalBody className="gap-6">
          {step === 'select' && (
            <>
              <div
                className={cn(
                  'border-2 border-dashed rounded-lg p-8 text-center transition-colors',
                  isDragging ? 'border-primary bg-primary/5' : 'border-border-default hover:border-primary/50',
                  'cursor-pointer',
                )}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={e => e.key === 'Enter' && fileInputRef.current?.click()}
                role="button"
                tabIndex={0}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,.zip"
                  className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0]
                    if (file) handleFileSelect(file).catch(console.error)
                  }}
                />
                <Upload className="w-12 h-12 mx-auto mb-4 text-content-tertiary" />
                <p className="text-content-primary font-medium mb-2">Drop a file here or click to browse</p>
                <p className="text-sm text-content-tertiary">Supports JSON and ZIP files</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-surface-secondary rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <FileJson className="w-4 h-4 text-primary" />
                    <span className="font-medium text-sm">JSON</span>
                  </div>
                  <p className="text-xs text-content-tertiary">Single GPT or conversation export</p>
                </div>
                <div className="bg-surface-secondary rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Package className="w-4 h-4 text-success" />
                    <span className="font-medium text-sm">ZIP</span>
                  </div>
                  <p className="text-xs text-content-tertiary">Bulk export or full backup</p>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 bg-danger/10 rounded-lg text-danger">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <p className="text-sm">{error}</p>
                </div>
              )}
            </>
          )}

          {step === 'preview' && preview && (
            <>
              <div className="bg-surface-secondary rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-content-tertiary">File</span>
                  <span className="text-sm text-content-primary font-medium">{selectedFile?.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-content-tertiary">Type</span>
                  <Chip size="sm" color="primary" variant="flat">
                    {preview.type.toUpperCase()}
                  </Chip>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-content-tertiary">Items</span>
                  <span className="text-sm text-content-primary">{preview.items.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-content-tertiary">Size</span>
                  <span className="text-sm text-content-primary">{(preview.totalSize / 1024).toFixed(1)} KB</span>
                </div>
              </div>

              {hasConflicts && (
                <ConflictResolutionPanel
                  conflicts={conflictingItems}
                  resolutions={resolutions}
                  onResolutionChange={handleResolutionChange}
                />
              )}

              <div className="space-y-2">
                <h3 className="text-sm font-medium text-content-secondary">Items to Import</h3>
                <div className="bg-surface-secondary rounded-lg p-3 max-h-40 overflow-y-auto">
                  <ul className="space-y-2">
                    {preview.items.map(item => (
                      <li key={item.id} className="flex items-center justify-between text-sm">
                        <span className="text-content-primary truncate">{item.name}</span>
                        <div className="flex items-center gap-2">
                          <Chip size="sm" variant="flat">
                            {item.type}
                          </Chip>
                          {item.hasConflict && (
                            <Chip size="sm" color="warning" variant="flat">
                              Conflict
                            </Chip>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 bg-danger/10 rounded-lg text-danger">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <p className="text-sm">{error}</p>
                </div>
              )}
            </>
          )}

          {step === 'importing' && (
            <div className="py-8 text-center">
              <Progress value={progress} color="primary" className="mb-4" aria-label="Import progress" />
              <p className="text-content-primary font-medium">Importing...</p>
              <p className="text-sm text-content-tertiary">{Math.round(progress)}% complete</p>
            </div>
          )}

          {step === 'complete' && result && (
            <div className="py-4 space-y-4">
              <div className="text-center">
                {result.success ? (
                  <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-success" />
                ) : (
                  <XCircle className="w-12 h-12 mx-auto mb-4 text-danger" />
                )}
                <h3 className="text-lg font-semibold mb-2">
                  {result.success ? 'Import Complete' : 'Import Completed with Errors'}
                </h3>
              </div>

              <div className="bg-surface-secondary rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-content-tertiary">Imported</span>
                  <span className="text-success font-medium">{result.imported}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-content-tertiary">Skipped</span>
                  <span className="text-content-primary">{result.skipped}</span>
                </div>
                {result.errors.length > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-content-tertiary">Errors</span>
                    <span className="text-danger font-medium">{result.errors.length}</span>
                  </div>
                )}
              </div>

              {result.errors.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-danger">Errors</h4>
                  <div className="bg-danger/10 rounded-lg p-3 max-h-32 overflow-y-auto">
                    <ul className="space-y-1 text-sm text-danger">
                      {result.errors.map(err => (
                        <li key={`${err.item}-${err.error}`}>
                          {err.item}: {err.error}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}
        </ModalBody>

        <ModalFooter>
          {step === 'select' && (
            <Button variant="flat" onPress={handleClose}>
              Cancel
            </Button>
          )}

          {step === 'preview' && (
            <>
              <Button variant="flat" onPress={resetState}>
                Back
              </Button>
              <Button
                color="primary"
                onPress={() => {
                  handleImport().catch(console.error)
                }}
              >
                Import {preview?.items.length} Item{preview?.items.length === 1 ? '' : 's'}
              </Button>
            </>
          )}

          {step === 'importing' && (
            <Button variant="flat" isDisabled>
              Importing...
            </Button>
          )}

          {step === 'complete' && (
            <Button color="primary" onPress={handleClose}>
              Done
            </Button>
          )}
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
