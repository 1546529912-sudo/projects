import { http } from '@/shared/api/http';
import type { ApiResponse } from '@/shared/api/types';

export interface DashboardCustomer {
  id: string;
  name: string;
  status: string;
  level: string;
  nextFollowUpAt: string | null;
  updatedAt?: string;
  owner: { id: string; name: string };
}

export interface DashboardOpportunity {
  id: string;
  title: string;
  amount: string;
  stage: string;
  expectedCloseDate: string | null;
  updatedAt?: string;
  customer: { id: string; name: string };
  owner: { id: string; name: string };
}

export interface DashboardData {
  stats: {
    totalCustomers: number;
    openOppCount: number;
    openOppAmount: string;
  };
  todayFollowUps: DashboardCustomer[];
  overdueFollowUps: DashboardCustomer[];
  upcomingOpportunities: DashboardOpportunity[];
  staleOpportunities: DashboardOpportunity[];
}

export async function getDashboard(): Promise<DashboardData> {
  const res = await http.get<ApiResponse<DashboardData>>('/dashboard');
  return res.data.data;
}

/** React Query 键：与顶栏 / 侧栏提醒轮询共用 */
export const DASHBOARD_COUNTS_QUERY_KEY = ['dashboard', 'counts'] as const;

export interface DashboardCounts {
  followUpToday: number;
  followUpOverdue: number;
  opportunityUpcoming: number;
  opportunityStale: number;
  attentionTotal: number;
  urgentFollowUp: number;
}

export async function getDashboardCounts(): Promise<DashboardCounts> {
  const res = await http.get<ApiResponse<DashboardCounts>>('/dashboard/counts');
  return res.data.data;
}

export interface SearchResults {
  customers: Array<{ id: string; name: string; companyName: string | null; status: string; level: string; primaryPhone: string | null }>;
  opportunities: Array<{ id: string; title: string; stage: string; amount: string | null; customer: { id: string; name: string } | null }>;
  leads: Array<{ id: string; name: string | null; companyName: string | null; phone: string | null; status: string }>;
}

export async function globalSearch(q: string): Promise<SearchResults> {
  const res = await http.get<ApiResponse<SearchResults>>('/dashboard/search', { params: { q } });
  return res.data.data;
}
