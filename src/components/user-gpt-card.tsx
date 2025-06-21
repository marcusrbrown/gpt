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
    <Card className="max-w-[400px]" isHoverable>
      <CardHeader className="flex gap-3">
        <div className="flex flex-col">
          <p className="text-md font-semibold">{gpt.name}</p>
          <p className="text-small text-default-500">Updated: {new Date(gpt.updatedAt).toLocaleDateString()}</p>
        </div>
      </CardHeader>
      <Divider />
      <CardBody>
        <p className="line-clamp-3">{gpt.description || 'No description provided.'}</p>
      </CardBody>
      <Divider />
      <CardFooter className="flex justify-between">
        <Button as={Link} to={`/gpt/edit/${gpt.id}`} variant="flat" color="primary" startContent={<Edit size={16} />}>
          Edit
        </Button>
        <Button as={Link} to={`/gpt/test/${gpt.id}`} variant="solid" color="primary" startContent={<Play size={16} />}>
          Test
        </Button>
      </CardFooter>
    </Card>
  )
}
