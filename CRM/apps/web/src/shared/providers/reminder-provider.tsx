import { createContext, useContext, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  DASHBOARD_COUNTS_QUERY_KEY,
  getDashboardCounts,
  type DashboardCounts,
} from '@/features/dashboard/api/dashboard.api';

const ReminderContext = createContext<DashboardCounts | null>(null);

export function ReminderProvider({ children }: { children: ReactNode }) {
  const { data = null } = useQuery({
    queryKey: DASHBOARD_COUNTS_QUERY_KEY,
    queryFn: getDashboardCounts,
    refetchInterval: 60_000,
    staleTime: 15_000,
  });

  return <ReminderContext.Provider value={data}>{children}</ReminderContext.Provider>;
}

/** null：尚未拉取到或仍为 0 条时的结构由调用方判断 */
export function useReminderCounts(): DashboardCounts | null {
  return useContext(ReminderContext);
}
