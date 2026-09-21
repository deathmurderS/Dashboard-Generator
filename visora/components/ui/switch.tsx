'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  id?: string;
  className?: string;
}

const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
  ({ checked, onCheckedChange, disabled, id, className }, ref) => (
    <button
      ref={ref}
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition-colors',
        checked
          ? 'border-primary-container bg-primary-container'
          : 'border-outline/50 bg-surface-high',
        disabled && 'cursor-not-allowed opacity-50',
        className
      )}
    >
      <span
        className={cn(
          'inline-block h-3.5 w-3.5 transform rounded-full transition-transform',
          checked ? 'translate-x-[18px] bg-on-primary' : 'translate-x-[3px] bg-on-surface-variant'
        )}
      />
    </button>
  )
);
Switch.displayName = 'Switch';

export { Switch };