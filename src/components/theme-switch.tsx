import {FC} from 'react';
import {SwitchProps, useSwitch, VisuallyHidden} from '@nextui-org/react';
import {useTheme} from 'next-themes';
import {useIsSSR} from '@react-aria/ssr';
import {Moon, Sun} from 'lucide-react';
import clsx from 'clsx';

export interface ThemeSwitchProps {
  className?: string;
  classNames?: SwitchProps['classNames'];
}

export const ThemeSwitch: FC<ThemeSwitchProps> = ({className, classNames}) => {
  const {theme, setTheme} = useTheme();
  const onChange = (): void => (theme === 'light' ? setTheme('dark') : setTheme('light'));
  const {Component, slots, isSelected, getBaseProps, getInputProps, getWrapperProps} = useSwitch({
    isSelected: theme === 'light',
    'aria-label': `Switch to ${theme === 'light' ? 'dark' : 'light'} mode`,
    onChange,
  });
  const isSSR = useIsSSR();
  return (
    <Component
      {...getBaseProps({
        className: clsx('px-px transition-opacity hover:opacity-80 cursor-pointer', className, classNames?.base),
      })}
    >
      <VisuallyHidden>
        <input {...getInputProps()} />
      </VisuallyHidden>
      <div
        {...getWrapperProps()}
        className={slots.wrapper({
          class: clsx(
            [
              'w-auto h-auto',
              'bg-transparent',
              'rounded-lg',
              'flex items-center justify-center',
              'group-data-[selected=true]:bg-transparent',
              '!text-default-500',
              'pt-px',
              'px-0',
              'mx-0',
            ],
            classNames?.wrapper,
          ),
        })}
      >
        {!isSelected || isSSR ? <Sun /> : <Moon />}
      </div>
    </Component>
  );
};
