'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, checked, onCheckedChange, ...props }, ref) => (
    <input
      type="checkbox"
      ref={ref}
      checked={checked}
      onChange={(e) => onCheckedChange?.(e.target.checked)}
      className={cn(
        'h-[14px] w-[14px] shrink-0 cursor-pointer appearance-none rounded-[2px] border border-outline/50',
        'bg-canvas-deep align-middle transition-colors',
        'checked:border-primary-container checked:bg-primary-container',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-container/70',
        className
      )}
      {...props}
    />
  )
);
Checkbox.displayName = 'Checkbox';

export { Checkbox };