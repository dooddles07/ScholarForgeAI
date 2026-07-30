import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

/* Minimum 44x44px on every variant. The most common mobile accessibility failure. */
const button = cva(
  'inline-flex items-center justify-center gap-2 rounded-md font-medium ' +
    'transition-colors duration-[--duration-fast] cursor-pointer select-none ' +
    /* Disabled drops the fill entirely: dimming an accent fill still reads as pressable. */
    'disabled:cursor-not-allowed disabled:border disabled:border-line ' +
    'disabled:bg-surface disabled:text-fg-subtle disabled:hover:bg-surface ' +
    '[&_svg]:size-5 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary: 'bg-accent text-accent-fg hover:bg-accent-hover',
        secondary: 'border border-line bg-transparent text-fg hover:bg-surface',
        ghost: 'bg-transparent text-fg hover:bg-surface',
        destructive: 'bg-incorrect text-white hover:opacity-90',
        mark: 'bg-mark-soft text-mark-text hover:bg-mark/35',
      },
      size: {
        md: 'min-h-11 px-4 py-2.5 text-base',
        lg: 'min-h-14 px-6 py-3 text-lg',
        icon: 'size-11',
        /* Bottom-anchored primary action on a phone. */
        block: 'min-h-14 w-full px-6 py-3 text-lg',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

type ButtonProps = ComponentProps<'button'> &
  VariantProps<typeof button> & {
    asChild?: boolean;
  };

export function Button({ className, variant, size, asChild, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : 'button';
  return <Comp className={cn(button({ variant, size }), className)} {...props} />;
}

/* eslint-disable-next-line react-refresh/only-export-components */
export { button as buttonVariants };
