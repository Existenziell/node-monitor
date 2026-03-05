import type { SpinnerProps } from '@/types';

const sizeClasses = {
  sm: 'h-4 w-4',
  lg: 'h-8 w-8',
} as const;

export function Spinner({ size = 'sm', className = '', 'aria-hidden': ariaHidden = true }: SpinnerProps) {
  return (
    <span
      className={`animate-spin rounded-full border-2 border-level-3 border-t-accent ${sizeClasses[size]} ${className}`.trim()}
      aria-hidden={ariaHidden}
    />
  );
}
