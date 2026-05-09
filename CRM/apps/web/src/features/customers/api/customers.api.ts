import { useAuthStore } from '@/features/auth/store/auth.store';
import { http } from '@/shared/api/http';
import type { ApiResponse } from '@/shared/api/types';

export interface CustomerOwner {
  id: string;
  name: string;
  role: string;
}

export interface CustomerOpportunitySummary {
  id: string;
  stage: string;
  title: string;
}

export interface Customer {
  id: string;
  name: string;
  shortName: string | null;
  companyName: string | null;
  primaryContactName: string | null;
  primaryPhone: string | null;
  primaryEmail: string | null;
  level: 'A' | 'B' | 'C' | 'D';
  status: 'following' | 'interested' | 'negotiating' | 'won' | 'lost';
  ownerId: string;
  owner: CustomerOwner;
  duplicateStatus: 'none' | 'suspected' | 'confirmed' | 'ignored';
  sourceCategory: string | null;
  sourceDetail: string | null;
  industry: string | null;
  companySize: string | null;
  region: string | null;
  lastFollowUpAt: string | null;
  nextFollowUpAt: string | null;
  archivedAt: string | null;
  archiveReason: string | null;
  opportunities?: CustomerOpportunitySummary[];
  createdAt: string;
  updatedAt: string;
}

export interface CustomerDetail extends Customer {
  contacts: Contact[];
  followUps: FollowUp[];
  opportunities: Opportunity[];
  orders: Order[];
  statusHistories: StatusHistory[];
  sourceLead: SourceLead | null;
  customFields: Record<string, any>;
}

export interface Contact {
  id: string;
  customerId: string;
  name: string;
  phone: string | null;
  email: string | null;
  position: string | null;
  decisionRole: string | null;
  isPrimary: boolean;
  createdAt: string;
}

export interface FollowUp {
  id: string;
  content: string;
  followUpTime: string;
  nextFollowUpTime: string | null;
  owner: { id: string; name: string };
}

export interface Opportunity {
  id: string;
  title: string;
  amount: string;
  stage: string;
  expectedCloseDate: string | null;
  owner: { id: string; name: string };
}

export interface Order {
  id: string;
  orderNo: string;
  amount: string;
  paidAmount: string;
  status: string;
  createdAt: string;
}

export interface StatusHistory {
  id: string;
  fromStatus: string | null;
  toStatus: string;
  triggerType: string;
  reason: string | null;
  createdAt: string;
}

export interface SourceLead {
  id: string;
  name: string | null;
  companyName: string | null;
  phone: string | null;
  createdAt: string;
}

export interface CustomerListResponse {
  items: Customer[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface QueryCustomersParams {
  page?: number;
  pageSize?: number;
  keyword?: string;
  status?: string;
  level?: string;
  ownerId?: number;
  duplicateStatus?: string;
  archived?: 'only' | 'include' | 'exclude';
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  tagId?: string;
}

export interface CreateCustomerInput {
  name: string;
  shortName?: string;
  companyName?: string;
  primaryContactName?: string;
  primaryPhone?: string;
  primaryEmail?: string;
  level?: 'A' | 'B' | 'C' | 'D';
  sourceCategory?: string;
  sourceDetail?: string;
  industry?: string;
  companySize?: string;
  region?: string;
  customFields?: Record<string, any>;
}

export async function listCustomers(params?: QueryCustomersParams) {
  const res = await http.get<ApiResponse<CustomerListResponse>>('/customers', { params });
  return res.data.data;
}

export async function getCustomer(id: string) {
  const res = await http.get<ApiResponse<CustomerDetail>>(`/customers/${id}`);
  return res.data.data;
}

export async function createCustomer(input: CreateCustomerInput) {
  const res = await http.post<ApiResponse<Customer>>('/customers', input);
  return res.data.data;
}

export async function updateCustomer(id: string, input: Partial<CreateCustomerInput>) {
  const res = await http.patch<ApiResponse<Customer>>(`/customers/${id}`, input);
  return res.data.data;
}

export async function updateInlineFields(id: string, fields: { level?: string; status?: string; ownerId?: number }) {
  const res = await http.patch<ApiResponse<Customer>>(`/customers/${id}/inline-fields`, fields);
  return res.data.data;
}

export async function changeCustomerStatus(id: string, payload: { toStatus: string; triggerType: string; reason?: string }) {
  const res = await http.post<ApiResponse<CustomerDetail | { pendingApproval: true }>>(`/customers/${id}/status`, payload);
  return res.data.data;
}

export async function checkDuplicates(params: { phone?: string; email?: string; companyName?: string; contactName?: string; excludeCustomerId?: string }) {
  const res = await http.get<ApiResponse<Array<{ id: string; name: string; primaryPhone: string | null; isOwn: boolean }>>>('/customers/duplicates/check', { params });
  return res.data.data;
}

export async function exportCustomersCsv(params?: QueryCustomersParams, approvalId?: string) {
  const res = await http.get('/customers/export', {
    params: { ...params, ...(approvalId ? { approvalId } : {}) },
    responseType: 'blob',
  });
  const url = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = `customers_${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function transferCustomer(id: string, newOwnerId: string) {
  const res = await http.post<ApiResponse<Customer>>(`/customers/${id}/transfer`, { newOwnerId });
  return res.data.data;
}

export async function archiveCustomer(id: string, reason: string) {
  const res = await http.post<ApiResponse<Customer>>(`/customers/${id}/archive`, { reason });
  return res.data.data;
}

export async function unarchiveCustomer(id: string) {
  const res = await http.post<ApiResponse<Customer>>(`/customers/${id}/unarchive`, {});
  return res.data.data;
}

export interface BusinessEvent {
  id: string;
  eventType: string;
  title: string;
  detail: Record<string, any>;
  createdBy: { id: string; name: string } | null;
  createdAt: string;
}

export async function listCustomerBusinessEvents(id: string) {
  const res = await http.get<ApiResponse<BusinessEvent[]>>(`/customers/${id}/events`);
  return res.data.data;
}

export async function listSuspectedDuplicates(page = 1) {
  const res = await http.get<ApiResponse<{ total: number; items: Customer[] }>>('/customers/duplicates/suspected', { params: { page } });
  return res.data.data;
}

export async function ignoreDuplicate(id: string) {
  const res = await http.post<ApiResponse<Customer>>(`/customers/${id}/duplicate/ignore`, {});
  return res.data.data;
}

export async function confirmDuplicate(id: string) {
  const res = await http.post<ApiResponse<Customer>>(`/customers/${id}/duplicate/confirm`, {});
  return res.data.data;
}

export async function deleteDuplicate(id: string, transferToId?: string) {
  const res = await http.delete<ApiResponse<{ deleted: boolean; followUpCount: number; transferred: boolean }>>(
    `/customers/${id}/duplicate`,
    { data: transferToId ? { transferToId } : {} },
  );
  return res.data.data;
}

export interface RollbackRequest {
  id: string;
  customerId: string;
  fromStatus: string;
  toStatus: string;
  reason: string | null;
  status: 'pending' | 'approved' | 'rejected';
  requestedBy: string;
  reviewedBy: string | null;
  reviewNote: string | null;
  reviewedAt: string | null;
  createdAt: string;
  customer: { id: string; name: string; status: string } | null;
  requester: { id: string; name: string } | null;
  reviewer: { id: string; name: string } | null;
}

export async function listRollbackRequests(status?: string) {
  const res = await http.get<RollbackRequest[]>('/customers/rollback-requests', { params: status ? { status } : {} });
  return res.data;
}

export async function reviewRollbackRequest(requestId: string, approved: boolean, note?: string) {
  const res = await http.post<{ ok: boolean; approved: boolean }>(
    `/customers/rollback-requests/${requestId}/review`,
    { approved, note },
  );
  return res.data;
}

export async function mergeCustomers(masterId: string, mergeId: string) {
  const res = await http.post<ApiResponse<{ merged: boolean; masterId: string; mergeId: string }>>(
    `/customers/${masterId}/merge`,
    { mergeId },
  );
  return res.data.data;
}

export interface MergeSuggestion {
  suggestion: {
    primaryId: string;
    primaryName: string;
    mergeId: string;
    mergeName: string;
    reason: string;
  } | null;
  candidates: Array<{ id: string; name: string; level: string; status: string; followUpCount: number; score: number }>;
}

export async function getMergeSuggestion(id: string): Promise<MergeSuggestion> {
  const res = await http.get<ApiResponse<MergeSuggestion>>(`/customers/${id}/merge-suggestion`);
  return res.data.data;
}

export interface CustomerImportResult {
  total: number;
  imported: number;
  duplicates: number;
  errors: Array<{ row: number; reason: string }>;
  /** 每行已写入为「线索」，需在线索管理中转化为客户 */
  importedAsLeads?: boolean;
}

export async function importCustomers(file: File): Promise<CustomerImportResult> {
  const form = new FormData();
  form.append('file', file);
  const res = await http.post<ApiResponse<CustomerImportResult>>('/customers/import', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data.data;
}

export interface BantData {
  bantBudget: number | null;
  bantAuthority: number | null;
  bantNeed: number | null;
  bantTimeline: number | null;
  bantNotes: string | null;
  totalScore: number;
  suggestedLevel: 'A' | 'B' | 'C' | 'D';
}

export interface Collaborator {
  id: string;
  userId: string;
  user: { id: string; name: string; role: string };
  createdAt: string;
}

export async function listCollaborators(customerId: string): Promise<Collaborator[]> {
  const res = await http.get<ApiResponse<Collaborator[]>>(`/customers/${customerId}/collaborators`);
  return res.data.data;
}

export async function addCollaborator(customerId: string, userId: string): Promise<Collaborator> {
  const res = await http.post<ApiResponse<Collaborator>>(`/customers/${customerId}/collaborators`, { userId });
  return res.data.data;
}

export async function removeCollaborator(customerId: string, userId: string): Promise<void> {
  await http.delete(`/customers/${customerId}/collaborators/${userId}`);
}

export async function updateCustomerBant(id: string, data: {
  bantBudget?: number;
  bantAuthority?: number;
  bantNeed?: number;
  bantTimeline?: number;
  bantNotes?: string;
}): Promise<BantData> {
  const res = await http.patch<ApiResponse<BantData>>(`/customers/${id}/bant`, data);
  return res.data.data;
}

export interface ScottsmanData {
  scotsmanSituation: number | null;
  scotsmanCompetition: number | null;
  scotsmanOpportunity: number | null;
  scotsmanTimescale: number | null;
  scotsmanSize: number | null;
  scotsmanMotivation: number | null;
  scotsmanAuthority: number | null;
  scotsmanNeed: number | null;
  scotsmanNotes: string | null;
  totalScore: number;
  maxScore: number;
}

export async function updateCustomerScotsman(id: string, data: Partial<Omit<ScottsmanData, 'totalScore' | 'maxScore'>>): Promise<ScottsmanData> {
  const res = await http.patch<ApiResponse<ScottsmanData>>(`/customers/${id}/scotsman`, data);
  return res.data.data;
}

export function downloadCustomerTemplate() {
  const token = useAuthStore.getState().accessToken;
  if (!token) return;
  fetch('/api/v1/customers/import/template', { headers: { Authorization: `Bearer ${token}` } })
    .then((r) => r.blob())
    .then((blob) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'customers_import_template.xlsx';
      a.click();
    });
}
