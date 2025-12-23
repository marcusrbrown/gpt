import {useSession} from '@/hooks/use-session'
import {cn} from '@/lib/design-system'
import {Button, Card, CardBody} from '@heroui/react'

export interface SessionWarningProps {
  className?: string
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export function SessionWarning({className}: SessionWarningProps) {
  const {status, remainingSeconds, extendSession} = useSession()

  if (status !== 'timing_out' || remainingSeconds === undefined) {
    return null
  }

  return (
    <div className={cn('fixed bottom-4 right-4 z-50', className)}>
      <Card className="border-warning bg-warning-50 dark:bg-warning-100/10">
        <CardBody className="flex flex-row items-center gap-4 p-4">
          <div className="flex-1">
            <p className="text-small font-medium text-warning-600 dark:text-warning-500">
              Session expires in {formatTime(remainingSeconds)}
            </p>
          </div>
          <Button size="sm" color="warning" variant="flat" onPress={extendSession}>
            Extend Session
          </Button>
        </CardBody>
      </Card>
    </div>
  )
}
