import {FC} from 'react';
import {Card} from '@/components/card';

export interface CardGroupProps {}

export const CardGroup: FC<CardGroupProps> = () => {
  return (
    <div className='grid grid-cols-1 gap-1 md:grid-cols-2 lg:grid-cols-3'>
      <Card />
      <Card />
      <Card />
    </div>
  );
};
