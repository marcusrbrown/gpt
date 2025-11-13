import type {FC} from 'react'
import mine from '@/assets/mine.json'
import {Card} from '@/components/card'
import {UserGPTCard} from '@/components/user-gpt-card'
import {useIntersectionObserver} from '@/hooks/use-intersection-observer'
import {useStorage} from '@/hooks/use-storage'
import {cn, ds, responsive} from '@/lib/design-system'
import {Button} from '@heroui/react'
import {Plus} from 'lucide-react'
import {Link} from 'react-router-dom'

export interface CardGroupProps {}

export const CardGroup: FC<CardGroupProps> = () => {
  const {getAllGPTs} = useStorage()
  const [userSectionRef, isUserSectionVisible] = useIntersectionObserver<HTMLDivElement>({triggerOnce: true})
  const [exampleSectionRef, isExampleSectionVisible] = useIntersectionObserver<HTMLDivElement>({triggerOnce: true})

  const userGPTs = getAllGPTs()

  return (
    <div className="space-y-8">
      {/* User's GPTs section */}
      <div
        ref={userSectionRef}
        className={cn('transition-opacity duration-700', isUserSectionVisible ? 'opacity-100' : 'opacity-0')}
      >
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
          <h2 className={responsive.heading.large}>Your GPTs</h2>
          <Button
            as={Link}
            to="/gpt/new"
            color="primary"
            variant="solid"
            startContent={<Plus size={16} />}
            className={cn('w-fit flex items-center', ds.animation.buttonPress)}
            size="md"
          >
            Create New GPT
          </Button>
        </div>

        {userGPTs.length > 0 ? (
          <div className={responsive.cardGrid.threeColumn}>
            {userGPTs.map((gpt, index) => (
              <div key={gpt.id} className={ds.animation.fadeIn} style={{animationDelay: `${index * 50}ms`}}>
                <UserGPTCard gpt={gpt} />
              </div>
            ))}
          </div>
        ) : (
          <div
            className={cn(
              'rounded-xl p-12 text-center border-2 shadow-sm',
              'bg-linear-to-br from-primary-50 to-primary-100 dark:from-primary-950 dark:to-primary-900',
              'border-primary-200 dark:border-primary-800',
            )}
          >
            <p className={cn(ds.text.body.large, 'text-content-primary mb-6 font-medium')}>
              You haven't created any GPTs yet.
            </p>
            <Button
              as={Link}
              to="/gpt/new"
              color="primary"
              variant="solid"
              size="lg"
              startContent={<Plus size={20} />}
              className={cn('flex items-center', ds.animation.buttonPress, 'shadow-md')}
            >
              Create Your First GPT
            </Button>
          </div>
        )}
      </div>

      {/* Example GPTs section */}
      <div
        ref={exampleSectionRef}
        className={cn('transition-opacity duration-700', isExampleSectionVisible ? 'opacity-100' : 'opacity-0')}
      >
        <h2 className={cn(responsive.heading.large, 'mb-6')}>Example GPTs</h2>
        <div className={responsive.cardGrid.threeColumn}>
          {mine.map((card, index) => (
            <div key={card.name} className={ds.animation.fadeIn} style={{animationDelay: `${index * 50}ms`}}>
              <Card {...card} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
