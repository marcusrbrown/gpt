import {Button} from '@heroui/react'
import Editor from '@monaco-editor/react'
import {useCallback, useState} from 'react'

interface NotebookCell {
  id: string
  type: 'markdown' | 'code'
  content: string
  output?: string
}

interface InteractiveNotebookProps {
  initialCells?: NotebookCell[]
  onExecute?: (cell: NotebookCell) => Promise<string>
}

export function InteractiveNotebook({initialCells = [], onExecute}: InteractiveNotebookProps) {
  const [cells, setCells] = useState<NotebookCell[]>(initialCells)

  const handleCodeChange = useCallback((value: string | undefined, cellId: string) => {
    setCells(prev => prev.map(cell => (cell.id === cellId ? {...cell, content: value ?? ''} : cell)))
  }, [])

  const handleExecute = useCallback(
    async (cellId: string) => {
      if (!onExecute) return

      const cell = cells.find(c => c.id === cellId)
      if (!cell) return

      try {
        const output = await onExecute(cell)
        setCells(prev => prev.map(c => (c.id === cellId ? {...c, output} : c)))
      } catch (error) {
        setCells(prev => prev.map(c => (c.id === cellId ? {...c, output: String(error)} : c)))
      }
    },
    [cells, onExecute],
  )

  const addCell = useCallback((type: 'markdown' | 'code') => {
    setCells(prev => [
      ...prev,
      {
        id: crypto.randomUUID(),
        type,
        content: '',
      },
    ])
  }, [])

  return (
    <div className="space-y-4">
      {cells.map(cell => (
        <div key={cell.id} className="border rounded-lg p-4 bg-white dark:bg-gray-800">
          <div className="flex justify-between mb-2">
            <span className="text-sm text-gray-500">{cell.type}</span>
            {cell.type === 'code' && (
              <Button onPress={() => handleExecute(cell.id)} color="primary" size="sm">
                Run
              </Button>
            )}
          </div>

          <Editor
            height="200px"
            defaultLanguage={cell.type === 'code' ? 'typescript' : 'markdown'}
            value={cell.content}
            onChange={value => handleCodeChange(value, cell.id)}
            theme="vs-dark"
            options={{
              minimap: {enabled: false},
              lineNumbers: 'on',
              scrollBeyondLastLine: false,
              wordWrap: 'on',
            }}
          />

          {cell.output && (
            <div className="mt-2 p-2 bg-gray-100 dark:bg-gray-700 rounded">
              <pre className="whitespace-pre-wrap">{cell.output}</pre>
            </div>
          )}
        </div>
      ))}

      <div className="flex gap-2">
        <Button onPress={() => addCell('code')} color="success">
          Add Code Cell
        </Button>
        <Button onPress={() => addCell('markdown')} color="secondary">
          Add Markdown Cell
        </Button>
      </div>
    </div>
  )
}
