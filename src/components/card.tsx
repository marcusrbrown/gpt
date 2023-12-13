import {FC, useRef} from 'react';
import {Avatar, Card as NextUICard, CardBody, CardFooter, CardHeader, Divider, Link} from '@nextui-org/react';

export interface CardProps {
  title: string;
  description: string;
  avatarUrl: string | URL;
  author: string;
  authorUrl: string | URL;
  gptUrl: string | URL;
}

export const Card: FC<CardProps> = ({title, description, avatarUrl, author, authorUrl, gptUrl}) => {
  const ref = useRef<HTMLDivElement | null>(null);

  return (
    <NextUICard ref={ref} as='div' className={`hover:cursor-pointer max-w-[400px]`} isHoverable isPressable>
      <CardHeader className='flex gap-3'>
        <Avatar alt='GPT Logo' isBordered radius='full' size='md' src={avatarUrl.toString()} />
        <div className='flex flex-col'>
          <p className='text-md'>{title}</p>
          <Link className='text-small text-default-500' href={authorUrl.toString()} isExternal>
            {author}
          </Link>
        </div>
      </CardHeader>
      <Divider />
      <CardBody>
        <p>{description}</p>
      </CardBody>
      <Divider />
      <CardFooter>
        <Link href={gptUrl.toString()} isExternal showAnchorIcon>
          Open in ChatGPT
        </Link>
      </CardFooter>
    </NextUICard>
  );
};
