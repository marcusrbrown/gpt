import mine from '@/assets/mine.json'
import {Card} from '@/components/card'
import {UserGPTCard} from '@/components/user-gpt-card'
import {useStorage} from '@/hooks/use-storage'
import {cn, ds, responsive} from '@/lib/design-system'
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
          <h2 className={responsive.heading.large}>Your GPTs</h2>
          <Button as={Link} to="/gpt/new" color="primary" startContent={<Plus size={16} />}>
            Create New GPT
          </Button>
        </div>

        {userGPTs.length > 0 ? (
          <div className={responsive.cardGrid.threeColumn}>
            {userGPTs.map(gpt => (
              <UserGPTCard key={gpt.id} gpt={gpt} />
            ))}
          </div>
        ) : (
          <div className="bg-surface-secondary rounded-lg p-8 text-center border border-border-default">
            <p className={cn(ds.text.body.large, 'text-content-secondary mb-4')}>You haven't created any GPTs yet.</p>
            <Button as={Link} to="/gpt/new" color="primary" startContent={<Plus size={16} />}>
              Create Your First GPT
            </Button>
          </div>
        )}
      </div>

      {/* Example GPTs section */}
      <div>
        <h2 className={`${responsive.heading.large} mb-4`}>Example GPTs</h2>
        <div className={responsive.cardGrid.threeColumn}>
          {mine.map(card => (
            <Card key={card.name} {...card} />
          ))}
        </div>
      </div>
    </div>
  )
}
