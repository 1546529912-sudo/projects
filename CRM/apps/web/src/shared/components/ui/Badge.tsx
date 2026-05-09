import { cn } from '@/shared/lib/cn';

const levelColors: Record<string, string> = {
  A: 'bg-red-50 text-red-700 border-red-100',
  B: 'bg-orange-50 text-orange-700 border-orange-100',
  C: 'bg-blue-50 text-blue-700 border-blue-100',
  D: 'bg-gray-50 text-gray-600 border-gray-100',
};

const statusColors: Record<string, string> = {
  following: 'bg-slate-50 text-slate-600 border-slate-100',
  interested: 'bg-blue-50 text-blue-700 border-blue-100',
  negotiating: 'bg-amber-50 text-amber-700 border-amber-100',
  won: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  lost: 'bg-red-50 text-red-600 border-red-100',
};

const statusLabels: Record<string, string> = {
  following: '跟进中',
  interested: '有意向',
  negotiating: '谈判中',
  won: '已成交',
  lost: '已丢失',
};

const levelLabels: Record<string, string> = { A: 'A 级', B: 'B 级', C: 'C 级', D: 'D 级' };

interface BadgeProps {
  type: 'level' | 'status';
  value: string;
  className?: string;
}

export function Badge({ type, value, className }: BadgeProps) {
  const colors = type === 'level' ? levelColors[value] : statusColors[value];
  const label = type === 'level' ? levelLabels[value] : statusLabels[value];
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-[5px] border px-1.5 py-0.5 text-xs font-medium',
        colors ?? 'bg-gray-50 text-gray-600 border-gray-100',
        className,
      )}
    >
      {label ?? value}
    </span>
  );
}
