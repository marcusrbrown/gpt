import {FC, useRef} from 'react';
import {Avatar, Card as NextUICard, CardBody, CardFooter, CardHeader, Divider, Link} from '@nextui-org/react';

export const Card: FC = () => {
  const ref = useRef<HTMLDivElement | null>(null);

  return (
    <NextUICard ref={ref} as='div' className={`hover:cursor-pointer max-w-[400px]`} isHoverable isPressable>
      <CardHeader className='flex gap-3'>
        <Avatar
          alt='GPT Logo'
          isBordered
          radius='full'
          size='md'
          src='https://files.oaiusercontent.com/file-Oz0yX2PZlcuhJJBeSpJSGkCC?se=2123-10-18T19%3A01%3A39Z&sp=r&sv=2021-08-06&sr=b&rscc=max-age%3D31536000%2C%20immutable&rscd=attachment%3B%20filename%3D5f8aa2f0-2a0a-4dbd-8c54-861e7625b8fe.png&sig=511Iyj7EEljUU8Zbv2dRFKDCyWNXuQJRQ49EBFBv6d0%3D'
        />
        <div className='flex flex-col'>
          <p className='text-md'>🏛️ GPT Architect (Advanced Model)</p>
          <Link className='text-small text-default-500' href='https://gpt.mrbro.dev' isExternal>
            gpt.mrbro.dev
          </Link>
        </div>
      </CardHeader>
      <Divider />
      <CardBody>
        <p>Expertly Crafting Your GPT From Concept to Masterpiece</p>
      </CardBody>
      <Divider />
      <CardFooter>
        <Link href='https://chat.openai.com/g/g-7uYB9WE9l-gpt-architect-advanced-model' isExternal showAnchorIcon>
          Chat
        </Link>
      </CardFooter>
    </NextUICard>
  );
};
