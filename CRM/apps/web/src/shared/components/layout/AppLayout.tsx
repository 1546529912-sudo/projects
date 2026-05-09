import { Outlet } from 'react-router-dom';
import { ReminderProvider } from '@/shared/providers/reminder-provider';
import { PageHeaderProvider } from '@/shared/providers/page-header-context';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

export function AppLayout() {
  return (
    <ReminderProvider>
      <PageHeaderProvider>
        <div className="flex h-screen min-h-0 overflow-hidden bg-[var(--bg-app)]">
          <Sidebar />
          <main className="flex min-h-0 min-w-0 flex-1 flex-col">
            <TopBar />
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain p-6">
              <Outlet />
            </div>
          </main>
        </div>
      </PageHeaderProvider>
    </ReminderProvider>
  );
}
