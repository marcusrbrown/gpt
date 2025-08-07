import {cn, compose, ds} from '@/lib/design-system'
import {Button, Card, CardBody, CardFooter, CardHeader, Divider} from '@heroui/react'
import {Edit, Play} from 'lucide-react'
import {type FC} from 'react'

import {Link} from 'react-router-dom'
import {type GPTConfiguration} from '../types/gpt'

export interface UserGPTCardProps {
  gpt: GPTConfiguration
}

export const UserGPTCard: FC<UserGPTCardProps> = ({gpt}) => {
  return (
    <Card
      className={cn(
        compose.card('max-w-[400px]'),
        'p-0', // Override compose.card padding since HeroUI Card handles internal spacing
      )}
      isHoverable
      data-testid="user-gpt-card"
    >
      <CardHeader className="flex gap-4">
        <div className="flex flex-col">
          <p className={cn(ds.text.heading.h4)} data-testid="gpt-name">
            {gpt.name}
          </p>
          <p className={cn(ds.text.body.small)}>Updated: {new Date(gpt.updatedAt).toLocaleDateString()}</p>
        </div>
      </CardHeader>
      <Divider />
      <CardBody>
        <p className={cn(ds.text.body.base, 'line-clamp-3')}>{gpt.description || 'No description provided.'}</p>
      </CardBody>
      <Divider />
      <CardFooter className="flex justify-between">
        <Button
          as={Link}
          to={`/gpt/edit/${gpt.id}`}
          variant="flat"
          color="primary"
          startContent={<Edit size={16} />}
          className={cn(ds.animation.transition)}
        >
          Edit
        </Button>
        <Button
          as={Link}
          to={`/gpt/test/${gpt.id}`}
          variant="solid"
          color="primary"
          startContent={<Play size={16} />}
          className={cn(ds.animation.transition)}
        >
          Test
        </Button>
      </CardFooter>
    </Card>
  )
}
