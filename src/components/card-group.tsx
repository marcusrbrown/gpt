import type {GPTConfiguration} from '@/types/gpt'
import type {FC} from 'react'
import {UserGPTCard} from '@/components/user-gpt-card'
import {useIntersectionObserver} from '@/hooks/use-intersection-observer'
import {useStorage} from '@/hooks/use-storage'
import {cn, ds, responsive} from '@/lib/design-system'
import {Button} from '@heroui/react'
import {Plus} from 'lucide-react'
import {useEffect, useState} from 'react'
import {Link} from 'react-router-dom'

export interface CardGroupProps {}

export const CardGroup: FC<CardGroupProps> = () => {
  const {getAllGPTs} = useStorage()
  const [userGPTs, setUserGPTs] = useState<GPTConfiguration[]>([])
  const [userSectionRef, isUserSectionVisible] = useIntersectionObserver<HTMLDivElement>({triggerOnce: true})

  useEffect(() => {
    getAllGPTs().then(setUserGPTs).catch(console.error)
  }, [getAllGPTs])

  return (
    <div className="space-y-8">
      {/* User's GPTs section - fades in on scroll */}
      <div
        ref={userSectionRef}
        className={cn(ds.animation.transition, 'duration-700', isUserSectionVisible ? 'opacity-100' : 'opacity-0')}
      >
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
          <h2 className={responsive.heading.large}>Your GPTs</h2>
          {userGPTs.length > 0 && (
            <Button
              as={Link}
              to="/gpt/new"
              color="primary"
              variant="solid"
              startContent={<Plus size={16} />}
              className={cn('w-fit', ds.animation.buttonPress)}
              size="md"
            >
              Create New GPT
            </Button>
          )}
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
          <div className="rounded-xl p-12 text-center border border-border-default bg-surface-secondary">
            <p className="text-lg text-content-secondary mb-6">You haven't created any GPTs yet.</p>
            <Button as={Link} to="/gpt/new" color="primary" variant="solid" size="lg" className="font-semibold px-8">
              Create Your First GPT
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
