import { http } from '@/shared/api/http';
import type { ApiResponse } from '@/shared/api/types';

// ── Funnel ─────────────────────────────────────────────────────────────────

export interface FunnelStage {
  stage: string;
  label: string;
  count: number;
  amount: string;
}

export interface ConversionRate {
  from: string;
  to: string;
  rate: number;
}

export interface FunnelData {
  stages: FunnelStage[];
  conversionRates: ConversionRate[];
  overallWinRate: number;
}

export interface FunnelQuery {
  mode?: 'snapshot' | 'flow';
  timeField?: 'created' | 'expected_close';
  startDate?: string;
  endDate?: string;
}

export async function getFunnel(params: FunnelQuery = {}): Promise<FunnelData> {
  const res = await http.get<ApiResponse<FunnelData>>('/reports/funnel', { params });
  return res.data.data;
}

// ── Performance ────────────────────────────────────────────────────────────

export interface BreakdownUser {
  userId: string;
  userName: string;
  role: string;
  actual: string;
  target: string;
  completionRate: number;
}

export interface PerformanceData {
  period: string;
  periodType: string;
  target: string;
  actual: string;
  predicted: string;
  completionRate: number;
  timeProgress: number;
  breakdown: BreakdownUser[];
}

export interface PerformanceQuery {
  periodType?: 'month' | 'quarter' | 'year';
  period?: string;
}

export async function getPerformance(params: PerformanceQuery = {}): Promise<PerformanceData> {
  const res = await http.get<ApiResponse<PerformanceData>>('/reports/performance', { params });
  return res.data.data;
}

// ── Source Analysis ────────────────────────────────────────────────────────

export interface SourceRow {
  source: string;
  leadCount: number;
  convertedCount: number;
  customerCount: number;
  conversionRate: number;
}

export interface SourceQuery {
  startDate?: string;
  endDate?: string;
}

export async function getSource(params: SourceQuery = {}): Promise<SourceRow[]> {
  const res = await http.get<ApiResponse<SourceRow[]>>('/reports/source', { params });
  return res.data.data;
}

export interface SourceFunnelRow extends SourceRow {
  oppCount: number;
  wonCount: number;
  leadToCustomerRate: number | null;
  customerToOppRate: number | null;
  oppToWonRate: number | null;
  leadToWonRate: number | null;
}

export async function getSourceFunnel(params: SourceQuery = {}): Promise<SourceFunnelRow[]> {
  const res = await http.get<ApiResponse<SourceFunnelRow[]>>('/reports/source-funnel', { params });
  return res.data.data;
}

// ── Efficiency ─────────────────────────────────────────────────────────────

export interface EfficiencyRow {
  userId: string;
  userName: string;
  role: string;
  leadCount: number;
  followUpCount: number;
  oppCreated: number;
  wonCount: number;
  lostCount: number;
  winRate: number;
  wonAmount: string;
}

export interface EfficiencyData {
  period: string;
  periodType: string;
  rows: EfficiencyRow[];
}

export async function getEfficiency(params: PerformanceQuery = {}): Promise<EfficiencyData> {
  const res = await http.get<ApiResponse<EfficiencyData>>('/reports/efficiency', { params });
  return res.data.data;
}

// ── Funnel by Product ──────────────────────────────────────────────────────

export interface FunnelProductRow {
  product: string;
  stages: Array<{ stage: string; label: string; count: number; amount: string }>;
}

export async function getFunnelByProduct(): Promise<FunnelProductRow[]> {
  const res = await http.get<ApiResponse<FunnelProductRow[]>>('/reports/funnel-by-product');
  return res.data.data;
}

// ── Source Trend ───────────────────────────────────────────────────────────

export interface SourceTrendData {
  monthKeys: string[];
  series: Array<{ source: string; data: Array<{ month: string; count: number }> }>;
}

export async function getSourceTrend(months = 6): Promise<SourceTrendData> {
  const res = await http.get<ApiResponse<SourceTrendData>>('/reports/source-trend', { params: { months } });
  return res.data.data;
}

// ── Team Activity ──────────────────────────────────────────────────────────

export interface TeamActivityItem {
  id: string;
  content: string;
  followUpTime: string;
  nextFollowUpTime: string | null;
  customer: { id: string; name: string } | null;
  owner: { id: string; name: string } | null;
}

export interface TeamActivityData {
  total: number;
  page: number;
  limit: number;
  items: TeamActivityItem[];
}

export interface TeamMember {
  id: string;
  name: string;
}

export async function getTeamActivity(params: {
  page?: number;
  limit?: number;
  userId?: string;
  dateFrom?: string;
  dateTo?: string;
}): Promise<TeamActivityData> {
  const res = await http.get<ApiResponse<TeamActivityData>>('/reports/team-activity', { params });
  return res.data.data;
}

export async function getTeamMembers(): Promise<TeamMember[]> {
  const res = await http.get<ApiResponse<TeamMember[]>>('/reports/team-members');
  return res.data.data;
}

// ── Target ─────────────────────────────────────────────────────────────────

export async function setTarget(payload: {
  periodType: 'month' | 'quarter' | 'year';
  period: string;
  targetType: 'team' | 'personal';
  userId?: string;
  amount: number;
}): Promise<void> {
  await http.post('/reports/targets', payload);
}

// ── Attribution ────────────────────────────────────────────────────────────

export interface AttributionRow {
  source: string;
  firstTouch: number;
  lastTouch: number;
  linearTouch: number;
}

export async function getAttributionComparison(): Promise<AttributionRow[]> {
  const res = await http.get<ApiResponse<AttributionRow[]>>('/reports/attribution');
  return res.data.data;
}

// ── Custom Reports ─────────────────────────────────────────────────────────

export interface CustomReportMetric { field: string; agg: string; label?: string; }

export interface CustomReport {
  id: string;
  name: string;
  entityType: string;
  dimensions: string[];
  metrics: CustomReportMetric[];
  filters?: any;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
}

export interface CustomReportResult {
  reportId: string;
  name: string;
  dimensions: string[];
  metrics: string[];
  rows: Record<string, any>[];
}

export async function listCustomReports(): Promise<CustomReport[]> {
  const res = await http.get<ApiResponse<CustomReport[]>>('/reports/custom');
  return res.data.data;
}

export async function runCustomReport(id: string): Promise<CustomReportResult> {
  const res = await http.get<ApiResponse<CustomReportResult>>(`/reports/custom/${id}/run`);
  return res.data.data;
}

export async function listAdminCustomReports(): Promise<CustomReport[]> {
  const res = await http.get<ApiResponse<CustomReport[]>>('/admin/custom-reports');
  return res.data.data;
}

export async function createAdminCustomReport(input: Omit<CustomReport, 'id' | 'createdAt' | 'isActive'>): Promise<CustomReport> {
  const res = await http.post<ApiResponse<CustomReport>>('/admin/custom-reports', input);
  return res.data.data;
}

export async function updateAdminCustomReport(id: string, input: Partial<Omit<CustomReport, 'id' | 'createdAt'>>): Promise<CustomReport> {
  const res = await http.patch<ApiResponse<CustomReport>>(`/admin/custom-reports/${id}`, input);
  return res.data.data;
}

export async function deleteAdminCustomReport(id: string): Promise<void> {
  await http.delete(`/admin/custom-reports/${id}`);
}
