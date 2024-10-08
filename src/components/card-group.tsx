import {FC} from 'react';
import {Card} from '@/components/card';
import mine from '@/assets/mine.json';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type -- This is a placeholder for the props
export interface CardGroupProps {}

export const CardGroup: FC<CardGroupProps> = () => {
  return (
    <div className='grid grid-cols-1 gap-1 md:grid-cols-2 lg:grid-cols-3'>
      {mine.map((card) => (
        <Card key={card.name} {...card} />
      ))}
    </div>
  );
};
