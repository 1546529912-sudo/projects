import type { SelectHTMLAttributes } from 'react';
import { cn } from '@/shared/lib/cn';

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        'form-select h-10 w-full rounded-[7px] border-0 bg-[var(--bg-subtle)] px-3 text-sm text-[var(--text-heading)] shadow-none ring-0 outline-none transition focus:border-0 focus:bg-[var(--bg-hover)] focus:shadow-none focus:ring-0 focus:outline-none cursor-pointer',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}
