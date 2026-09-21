import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-[4px] border px-2.5 py-0.5 text-[11px] font-medium leading-4',
  {
    variants: {
      variant: {
        default: 'border-primary-container/40 bg-primary-container/10 text-primary',
        secondary: 'border-secondary/40 bg-secondary/10 text-secondary',
        tertiary: 'border-tertiary/40 bg-tertiary/10 text-tertiary',
        outline: 'border-outline-variant/50 text-on-surface-variant',
        muted: 'border-outline-variant/30 bg-surface-high/50 text-text-muted',
        error: 'border-error/40 bg-error-container/10 text-error',
        success: 'border-tertiary/40 bg-tertiary/10 text-tertiary',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };