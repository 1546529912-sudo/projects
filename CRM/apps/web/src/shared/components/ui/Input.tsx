import type { InputHTMLAttributes } from 'react';
import { cn } from '@/shared/lib/cn';

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'form-input h-10 w-full rounded-[7px] border-0 bg-[var(--bg-subtle)] px-3 text-sm text-[var(--text-heading)] shadow-none ring-0 outline-none transition placeholder:text-[var(--text-muted)] focus:border-0 focus:bg-[var(--bg-hover)] focus:shadow-none focus:ring-0 focus:outline-none',
        className,
      )}
      {...props}
    />
  );
}
