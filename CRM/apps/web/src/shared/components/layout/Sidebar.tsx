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
        <div className="grid h-7 w-7 place-items-center rounded-[7px] bg-[var(--action-primary)] text-xs font-bold text-white">C</div>
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
                'mb-0.5 flex h-9 items-center gap-2 rounded-[7px] px-2.5 text-sm text-[var(--side-item-text)] transition hover:bg-[var(--bg-hover)]',
                isActive && 'bg-[var(--side-active-bg)] font-medium text-[var(--side-active-text)]',
                'justify-between',
              )
            }
          >
            <span className="flex items-center gap-2 min-w-0">
              <item.icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{item.label}</span>
            </span>
            {item.to === '/dashboard' &&
              reminders &&
              reminders.attentionTotal > 0 && (
                <span
                  className={cn(
                    'shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none text-white',
                    reminders.urgentFollowUp > 0 ? 'bg-red-500' : 'bg-[var(--action-primary)]',
                  )}
                >
                  {reminders.attentionTotal > 99 ? '99+' : reminders.attentionTotal}
                </span>
              )}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
