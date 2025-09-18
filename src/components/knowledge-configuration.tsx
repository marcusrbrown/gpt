import type {LocalFile} from '../types/gpt'
import {Button, Input} from '@heroui/react'
import {useRef} from 'react'
import {cn, ds, responsive} from '../lib/design-system'

interface FormErrors {
  knowledge: {
    urls: {
      [key: number]: string
    }
  }
}

interface KnowledgeConfigurationProps {
  files: LocalFile[]
  urls: string[]
  errors: FormErrors
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
  onRemoveFile: (index: number) => void
  onAddUrl: () => void
  onRemoveUrl: (index: number) => void
  onUrlChange: (index: number, value: string) => void
}

export function KnowledgeConfiguration({
  files,
  urls,
  errors,
  onFileUpload,
  onRemoveFile,
  onAddUrl,
  onRemoveUrl,
  onUrlChange,
}: KnowledgeConfigurationProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  return (
    <div className={cn(ds.form.fieldGroup)}>
      <div className="space-y-4">
        <h3 className={cn(responsive.heading.medium)}>Files</h3>
        <div className="border-dashed border-2 border-border-default rounded-md p-6 text-center">
          <input type="file" ref={fileInputRef} onChange={onFileUpload} multiple className="hidden" />
          <Button onPress={() => fileInputRef.current?.click()} color="primary" variant="light" className="mb-2">
            Upload Files
          </Button>
          <p className={cn(ds.text.body.small)}>Upload files to use as knowledge sources for your GPT</p>
        </div>

        {/* Display uploaded files */}
        {files.length > 0 && (
          <div className="mt-4">
            <h4 className={cn(ds.text.heading.h4, 'mb-2')}>Uploaded Files</h4>
            <div className="border border-border-default rounded-md overflow-hidden">
              <table className="min-w-full divide-y divide-border-default">
                <thead className="bg-surface-secondary">
                  <tr>
                    <th
                      className={cn('px-3 py-2 text-left font-medium text-content-tertiary uppercase', ds.text.caption)}
                    >
                      Name
                    </th>
                    <th
                      className={cn('px-3 py-2 text-left font-medium text-content-tertiary uppercase', ds.text.caption)}
                    >
                      Type
                    </th>
                    <th
                      className={cn('px-3 py-2 text-left font-medium text-content-tertiary uppercase', ds.text.caption)}
                    >
                      Size
                    </th>
                    <th
                      className={cn(
                        'px-3 py-2 text-right font-medium text-content-tertiary uppercase',
                        ds.text.caption,
                      )}
                    >
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-surface-primary divide-y divide-border-default">
                  {files.map((file, index) => (
                    <tr key={`${file.name}-${file.lastModified}-${index}`}>
                      <td className={cn('px-3 py-2 text-content-primary', ds.text.body.small)}>{file.name}</td>
                      <td className={cn('px-3 py-2 text-content-secondary', ds.text.body.small)}>
                        {file.type || 'Unknown'}
                      </td>
                      <td className={cn('px-3 py-2 text-content-secondary', ds.text.body.small)}>
                        {Math.round(file.size / 1024)} KB
                      </td>
                      <td className="px-3 py-2 text-right">
                        <Button onPress={() => onRemoveFile(index)} size="sm" color="danger" variant="light">
                          Remove
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <h3 className={cn(responsive.heading.medium)}>Web URLs</h3>
        <div className="space-y-3">
          {urls.map((url, index) => (
            <div key={`url-${index}`} className={cn(ds.form.fieldRow)}>
              <Input
                type="url"
                value={url}
                onChange={e => onUrlChange(index, e.target.value)}
                placeholder="https://example.com"
                className="flex-1"
                isInvalid={
                  typeof errors.knowledge.urls[index] === 'string' && errors.knowledge.urls[index].trim() !== ''
                }
                errorMessage={errors.knowledge.urls[index] ?? undefined}
              />
              <Button onPress={() => onRemoveUrl(index)} size="sm" color="danger" variant="light">
                Remove
              </Button>
            </div>
          ))}
        </div>
        <Button color="primary" variant="ghost" onPress={onAddUrl}>
          Add URL
        </Button>
      </div>
    </div>
  )
}
