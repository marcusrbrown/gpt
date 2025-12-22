import {cn, ds, theme} from '@/lib/design-system'
import {Spinner} from '@heroui/react'
import {Upload} from 'lucide-react'
import {useRef, useState, type ChangeEvent} from 'react'
import {DEFAULT_ALLOWED_TYPES} from './constants'

interface FileUploadProps {
  onFileSelect: (file: File) => void
  allowedTypes?: string[]
  maxSizeMB?: number
  className?: string
  isLoading?: boolean
  disabled?: boolean
  ariaLabel?: string
  progress?: number // Progress percentage (0-100)
  loadingMessage?: string // Custom loading message
}

/**
 * File upload component with drag and drop functionality
 */
export function FileUpload({
  onFileSelect,
  allowedTypes = DEFAULT_ALLOWED_TYPES,
  maxSizeMB = 100,
  className = '',
  isLoading = false,
  disabled = false,
  ariaLabel = 'File upload area',
  progress,
  loadingMessage = 'Uploading...',
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [fileName, setFileName] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const maxSizeBytes = maxSizeMB * 1024 * 1024

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  function handleDragLeave(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  function validateFile(file: File): boolean {
    setErrorMessage('')

    // Check file size
    if (file.size > maxSizeBytes) {
      setErrorMessage(`File size exceeds the ${maxSizeMB}MB limit`)
      return false
    }

    // Check file type
    const fileType = file.type
    if (!allowedTypes.includes(fileType)) {
      setErrorMessage(
        `File type not supported. Allowed types: ${allowedTypes.map(type => type.split('/')[1]).join(', ')}`,
      )
      return false
    }

    return true
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    if (disabled || isLoading) return

    if (e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0]
      if (file) {
        handleFile(file)
      }
    }
  }

  function handleFileInputChange(e: ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0]
      if (file) {
        handleFile(file)
      }
    }
  }

  function handleFile(file: File) {
    if (validateFile(file)) {
      setFileName(file.name)
      onFileSelect(file)
    }
  }

  function handleClick() {
    if (disabled || isLoading) return

    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  return (
    <div className={cn('w-full', className)}>
      <div
        className={cn(
          'border-2 border-dashed rounded-lg p-6 text-center cursor-pointer',
          ds.animation.transition,
          ds.focus.visible,
          // Disabled or loading state
          (disabled || isLoading) &&
            cn('border-border-subtle', theme.surface(0), ds.state.disabled, 'cursor-not-allowed'),
          // Dragging state (when not disabled/loading) - enhanced with scale
          isDragging &&
            !disabled &&
            !isLoading &&
            cn('border-primary-500', theme.surface(1), 'shadow-md scale-[1.02] bg-primary-50 dark:bg-primary-950'),
          // Default state (when not dragging, disabled, or loading)
          !isDragging &&
            !disabled &&
            !isLoading &&
            cn(
              'border-border-default hover:border-border-strong',
              theme.surface(0),
              'hover:shadow-md hover:scale-[1.01]',
            ),
        )}
        onDragOver={disabled || isLoading ? undefined : handleDragOver}
        onDragLeave={disabled || isLoading ? undefined : handleDragLeave}
        onDrop={disabled || isLoading ? undefined : handleDrop}
        onClick={disabled || isLoading ? undefined : handleClick}
        role="button"
        tabIndex={disabled || isLoading ? -1 : 0}
        aria-label={isLoading ? `${loadingMessage}${progress ? ` ${Math.round(progress)}% complete` : ''}` : ariaLabel}
        aria-busy={isLoading}
        aria-disabled={disabled || isLoading}
        onKeyDown={e => {
          if ((e.key === 'Enter' || e.key === ' ') && !disabled && !isLoading) {
            e.preventDefault()
            handleClick()
          }
        }}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileInputChange}
          className="hidden"
          accept={allowedTypes.join(',')}
          disabled={disabled || isLoading}
          aria-label="Select file"
        />

        <div className="flex flex-col items-center justify-center gap-3">
          {isLoading ? (
            <div className={cn('flex flex-col items-center gap-3 w-full', ds.animation.fadeIn)}>
              <div className="flex items-center gap-2">
                <Spinner size="sm" color="primary" />
                <span className={cn(ds.text.body.small, 'text-content-secondary')}>{loadingMessage}</span>
              </div>

              {progress !== undefined && (
                <div className="w-full max-w-xs space-y-2">
                  <div className="flex justify-between items-center">
                    <span className={cn(ds.text.body.small, 'text-content-tertiary')}>Progress</span>
                    <span className={cn(ds.text.body.small, 'font-medium text-content-primary')}>
                      {Math.round(progress)}%
                    </span>
                  </div>
                  <div className="w-full bg-default-200 rounded-full h-2 overflow-hidden">
                    <div
                      className={cn(
                        'h-full bg-primary-500 rounded-full transition-all duration-300 ease-out',
                        ds.animation.transition,
                      )}
                      style={{width: `${Math.min(100, Math.max(0, progress))}%`}}
                      aria-label={`Upload progress: ${Math.round(progress)}%`}
                    />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              <Upload
                className={cn(
                  'w-8 h-8',
                  ds.animation.transition,
                  disabled ? 'text-content-tertiary' : 'text-content-secondary',
                  isDragging && 'text-primary-500 scale-110',
                )}
              />

              <div className={cn(ds.text.body.small, 'font-medium')}>
                {fileName ? (
                  <span className="text-primary-600">{fileName}</span>
                ) : (
                  <span className={cn(disabled ? 'text-content-tertiary' : 'text-content-primary')}>
                    <span className="text-primary-600">Click to upload</span> or drag and drop
                  </span>
                )}
              </div>

              <div className={cn('space-y-1', ds.text.body.small, 'text-content-tertiary')}>
                <p>Supported formats: {allowedTypes.map(type => type.split('/')[1]).join(', ')}</p>
                <p>Max size: {maxSizeMB}MB</p>
              </div>
            </>
          )}
        </div>
      </div>

      {errorMessage && (
        <div className={cn('mt-2', ds.form.errorText, 'flex items-start gap-2')}>
          <svg className="w-4 h-4 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  )
}
