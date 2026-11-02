import {useSession} from '@/hooks/use-session'
import {cn, ds} from '@/lib/design-system'
import '@/styles/heroui-v3.css'
import {Button, Card} from '@heroui-v3/react'

export interface SessionWarningProps {
  className?: string
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

/** Warns before the idle auto-lock and lets the user extend the session. Renders nothing otherwise. */
export function SessionWarning({className}: SessionWarningProps) {
  const {status, remainingSeconds, extendSession} = useSession()

  if (status !== 'timing_out' || remainingSeconds === undefined) {
    return null
  }

  return (
    <div className={cn('fixed bottom-4 left-4 z-50', className)} role="status" data-testid="session-warning">
      <Card className="border border-warning bg-surface-elevated">
        <Card.Content className="flex flex-row items-center gap-4 p-4">
          <p className={cn(ds.text.body.small, 'flex-1 font-medium text-content-primary')}>
            Session locks in {formatTime(remainingSeconds)}
          </p>
          <Button
            size="sm"
            variant="primary"
            className="bg-warning/20 text-warning-600 hover:bg-warning/30"
            onPress={extendSession}
          >
            Extend Session
          </Button>
        </Card.Content>
      </Card>
    </div>
  )
}
