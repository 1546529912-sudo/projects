import type { QueryClient } from '@tanstack/react-query';
import { DASHBOARD_COUNTS_QUERY_KEY } from '../api/dashboard.api';

/** 跟进 / 商机变更后刷新工作台与顶栏提醒计数 */
export function refreshDashboardQueries(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: DASHBOARD_COUNTS_QUERY_KEY });
  void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
}
