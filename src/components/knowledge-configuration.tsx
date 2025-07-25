import {Button, Input} from '@heroui/react'
import {useRef} from 'react'
import {type LocalFile} from '../types/gpt'

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
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Files</h3>
        <div className="border-dashed border-2 border-gray-300 rounded-md p-6 text-center">
          <input type="file" ref={fileInputRef} onChange={onFileUpload} multiple className="hidden" />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="text-blue-600 hover:text-blue-800 focus:outline-none"
          >
            Upload Files
          </button>
          <p className="mt-2 text-sm text-gray-600">Upload files to use as knowledge sources for your GPT</p>
        </div>

        {/* Display uploaded files */}
        {files.length > 0 && (
          <div className="mt-4">
            <h4 className="text-md font-medium mb-2">Uploaded Files</h4>
            <div className="border rounded-md overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Size</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {files.map((file, index) => (
                    <tr key={`${file.name}-${file.lastModified}-${index}`}>
                      <td className="px-3 py-2 text-sm text-gray-900">{file.name}</td>
                      <td className="px-3 py-2 text-sm text-gray-500">{file.type || 'Unknown'}</td>
                      <td className="px-3 py-2 text-sm text-gray-500">{Math.round(file.size / 1024)} KB</td>
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => onRemoveFile(index)}
                          className="text-red-600 hover:text-red-900 text-sm"
                        >
                          Remove
                        </button>
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
        <h3 className="text-lg font-medium">Web URLs</h3>
        <div className="space-y-3">
          {urls.map((url, index) => (
            <div key={`url-${index}`} className="flex space-x-2">
              <Input
                type="url"
                value={url}
                onChange={e => onUrlChange(index, e.target.value)}
                placeholder="https://example.com"
                className="flex-1"
                isInvalid={!!errors.knowledge.urls[index]}
                errorMessage={errors.knowledge.urls[index]}
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
