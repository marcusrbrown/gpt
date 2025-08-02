import mine from '@/assets/mine.json'
import {Card} from '@/components/card'
import {UserGPTCard} from '@/components/user-gpt-card'
import {useStorage} from '@/hooks/use-storage'
import {Button} from '@heroui/react'
import {Plus} from 'lucide-react'
import {type FC} from 'react'
import {Link} from 'react-router-dom'

export interface CardGroupProps {}

export const CardGroup: FC<CardGroupProps> = () => {
  const {getAllGPTs} = useStorage()

  const userGPTs = getAllGPTs()

  return (
    <div className="space-y-8">
      {/* User's GPTs section */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold">Your GPTs</h2>
          <Button as={Link} to="/gpt/new" color="primary" startContent={<Plus size={16} />}>
            Create New GPT
          </Button>
        </div>

        {userGPTs.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {userGPTs.map(gpt => (
              <UserGPTCard key={gpt.id} gpt={gpt} />
            ))}
          </div>
        ) : (
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-8 text-center">
            <p className="text-gray-500 mb-4">You haven't created any GPTs yet.</p>
            <Button as={Link} to="/gpt/new" color="primary" startContent={<Plus size={16} />}>
              Create Your First GPT
            </Button>
          </div>
        )}
      </div>

      {/* Example GPTs section */}
      <div>
        <h2 className="text-2xl font-semibold mb-4">Example GPTs</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {mine.map(card => (
            <Card key={card.name} {...card} />
          ))}
        </div>
      </div>
    </div>
  )
}
