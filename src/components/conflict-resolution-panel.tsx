import type {ConflictResolution, ImportPreviewItem} from '@/types/export-import'
import {cn} from '@/lib/design-system'
import {Chip, Radio, RadioGroup} from '@heroui/react'
import {AlertTriangle, Copy, RefreshCw, SkipForward} from 'lucide-react'

interface ConflictResolutionPanelProps {
  conflicts: ImportPreviewItem[]
  resolutions: Map<string, ConflictResolution>
  onResolutionChange: (itemId: string, resolution: ConflictResolution) => void
}

export function ConflictResolutionPanel({conflicts, resolutions, onResolutionChange}: ConflictResolutionPanelProps) {
  if (conflicts.length === 0) return null

  const handleApplyToAll = (resolution: ConflictResolution) => {
    conflicts.forEach(conflict => {
      onResolutionChange(conflict.id, resolution)
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-warning" />
        <h3 className="text-sm font-medium text-content-secondary">
          {conflicts.length} Conflict{conflicts.length === 1 ? '' : 's'} Detected
        </h3>
      </div>

      <div className="bg-warning/10 rounded-lg p-3">
        <p className="text-sm text-content-secondary">
          The following items already exist in your library. Choose how to handle each conflict.
        </p>
      </div>

      <div className="flex items-center gap-2 text-xs">
        <span className="text-content-tertiary">Apply to all:</span>
        <button
          type="button"
          onClick={() => handleApplyToAll('skip')}
          className={cn(
            'px-2 py-1 rounded text-xs transition-colors',
            'hover:bg-surface-tertiary text-content-secondary',
          )}
        >
          Skip All
        </button>
        <button
          type="button"
          onClick={() => handleApplyToAll('overwrite')}
          className={cn(
            'px-2 py-1 rounded text-xs transition-colors',
            'hover:bg-surface-tertiary text-content-secondary',
          )}
        >
          Overwrite All
        </button>
        <button
          type="button"
          onClick={() => handleApplyToAll('rename')}
          className={cn(
            'px-2 py-1 rounded text-xs transition-colors',
            'hover:bg-surface-tertiary text-content-secondary',
          )}
        >
          Rename All
        </button>
      </div>

      <div className="space-y-3 max-h-60 overflow-y-auto">
        {conflicts.map(conflict => (
          <div key={conflict.id} className="bg-surface-secondary rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm text-content-primary truncate max-w-[200px]">{conflict.name}</span>
                <Chip size="sm" variant="flat">
                  {conflict.type}
                </Chip>
              </div>
            </div>

            <RadioGroup
              orientation="horizontal"
              size="sm"
              value={resolutions.get(conflict.id) ?? 'skip'}
              onValueChange={value => onResolutionChange(conflict.id, value as ConflictResolution)}
              classNames={{
                wrapper: 'gap-4',
              }}
            >
              <Radio value="skip">
                <div className="flex items-center gap-1">
                  <SkipForward className="w-3 h-3" />
                  <span className="text-xs">Skip</span>
                </div>
              </Radio>
              <Radio value="overwrite">
                <div className="flex items-center gap-1">
                  <RefreshCw className="w-3 h-3" />
                  <span className="text-xs">Overwrite</span>
                </div>
              </Radio>
              <Radio value="rename">
                <div className="flex items-center gap-1">
                  <Copy className="w-3 h-3" />
                  <span className="text-xs">Rename</span>
                </div>
              </Radio>
            </RadioGroup>

            <p className="text-xs text-content-tertiary">
              {resolutions.get(conflict.id) === 'skip' && 'Keep existing, ignore import'}
              {resolutions.get(conflict.id) === 'overwrite' && 'Replace existing with imported version'}
              {resolutions.get(conflict.id) === 'rename' && 'Import as new with modified name'}
              {!resolutions.get(conflict.id) && 'Keep existing, ignore import'}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
