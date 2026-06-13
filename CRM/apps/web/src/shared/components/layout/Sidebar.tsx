import { BarChart3, Building2, ClipboardList, LayoutDashboard, Settings, Users, ShoppingCart, Contact } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { cn } from '@/shared/lib/cn';
import { useReminderCounts } from '@/shared/providers/reminder-provider';

const navItems = [
  { label: '工作台', to: '/dashboard', icon: LayoutDashboard },
  { label: '客户管理', to: '/customers', icon: Users },
  { label: '线索录入', to: '/leads', icon: ClipboardList },
  { label: '联系人', to: '/contacts', icon: Contact },
  { label: '销售商机', to: '/opportunities', icon: Building2 },
  { label: '订单管理', to: '/orders', icon: ShoppingCart },
  { label: '数据报表', to: '/reports', icon: BarChart3 },
  { label: '系统设置', to: '/settings', icon: Settings },
];

export function Sidebar() {
  const reminders = useReminderCounts();

  return (
    <aside className="flex h-full w-[214px] shrink-0 flex-col overflow-hidden border-r border-[var(--side-border)] bg-[var(--side-bg)]">
      <div className="flex h-[58px] shrink-0 items-center gap-2.5 border-b border-[var(--side-border)] px-4">
        <div className="grid h-7 w-7 place-items-center rounded-[7px] bg-[var(--action-primary)] text-xs font-bold text-white shadow-[0_2px_6px_rgba(15,23,42,0.12),inset_0_1px_0_rgba(255,255,255,0.18)]">C</div>
        <div className="text-sm font-semibold tracking-[-0.02em] text-[var(--text-heading)]">CRM Studio</div>
      </div>
      <nav className="min-h-0 flex-1 overflow-y-auto p-2.5">
        <div className="px-2 pb-2 pt-3 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--side-item-muted)]">Workspace</div>
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'group relative mb-1 flex h-10 items-center justify-between gap-2 rounded-[8px] px-2 text-sm text-[var(--side-item-text)] transition-all duration-150',
                !isActive &&
                  'hover:bg-white hover:text-[var(--text-heading)] hover:shadow-[0_1px_2px_rgba(15,23,42,0.04),0_1px_3px_rgba(15,23,42,0.06)]',
                isActive &&
                  'bg-white font-medium text-[var(--side-active-text)] shadow-[0_1px_2px_rgba(15,23,42,0.04),0_2px_6px_rgba(15,23,42,0.06)] ring-1 ring-[var(--side-border)]',
              )
            }
          >
            {({ isActive }) => (
              <>
                <span className="flex min-w-0 items-center gap-2.5">
                  <span
                    className={cn(
                      'grid h-7 w-7 shrink-0 place-items-center rounded-[6px] transition-all duration-150',
                      isActive
                        ? 'bg-[var(--action-primary)] text-white shadow-[0_1px_2px_rgba(15,23,42,0.18)]'
                        : 'text-[var(--side-item-text)] group-hover:bg-white group-hover:text-[var(--text-heading)] group-hover:shadow-[inset_0_0_0_1px_var(--side-border)]',
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                  </span>
                  <span className="truncate">{item.label}</span>
                </span>
                {item.to === '/dashboard' &&
                  reminders &&
                  reminders.attentionTotal > 0 && (
                    <span
                      className={cn(
                        'inline-flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-full px-1 text-[11px] font-bold leading-none text-white shadow-[0_1px_2px_rgba(15,23,42,0.18)]',
                        reminders.urgentFollowUp > 0 ? 'bg-red-500' : 'bg-[var(--action-primary)]',
                      )}
                    >
                      {reminders.attentionTotal > 99 ? '99+' : reminders.attentionTotal}
                    </span>
                  )}
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
