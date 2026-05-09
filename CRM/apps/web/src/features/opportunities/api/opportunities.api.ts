import { http } from '@/shared/api/http';
import type { ApiResponse, PaginatedResponse } from '@/shared/api/types';

export interface Opportunity {
  id: string;
  customerId: string;
  title: string;
  amount: string;
  stage: string;
  closeReason: string | null;
  contractStatus: 'none' | 'uploaded' | 'signed';
  contractUrl: string | null;
  expectedCloseDate: string | null;
  owner: { id: string; name: string };
  customer?: { id: string; name: string };
  createdAt: string;
  updatedAt: string;
}

export interface OpportunityOrder {
  id: string;
  orderNo: string;
  status: string;
  amount: string;
  paidAmount: string;
  createdAt: string;
}

export interface OpportunityDetail extends Opportunity {
  orders: OpportunityOrder[];
  quotations: Array<{ id: string; quoteNo: string; status: string; totalAmount: string; createdAt: string }>;
}

export interface CreateOpportunityInput {
  title: string;
  amount?: number;
  stage?: string;
  expectedCloseDate?: string;
}

export interface UpdateOpportunityInput {
  title?: string;
  amount?: number;
  stage?: string;
  expectedCloseDate?: string;
}

export interface CloseOpportunityInput {
  outcome: 'closed_won' | 'closed_lost';
  reason?: string;
}

export interface QueryOpportunitiesParams {
  page?: number;
  pageSize?: number;
  stage?: string;
  keyword?: string;
  customerId?: string;
}

export async function listOpportunities(customerId: string) {
  const res = await http.get<ApiResponse<Opportunity[]>>(`/customers/${customerId}/opportunities`);
  return res.data.data;
}

export async function getOpportunity(id: string) {
  const res = await http.get<ApiResponse<OpportunityDetail>>(`/opportunities/${id}`);
  return res.data.data;
}

export async function listAllOpportunities(params?: QueryOpportunitiesParams) {
  const res = await http.get<ApiResponse<PaginatedResponse<Opportunity>>>('/opportunities', { params });
  return res.data.data;
}

export async function createOpportunity(customerId: string, input: CreateOpportunityInput) {
  const res = await http.post<ApiResponse<Opportunity>>(`/customers/${customerId}/opportunities`, input);
  return res.data.data;
}

export async function updateOpportunity(id: string, input: UpdateOpportunityInput) {
  const res = await http.patch<ApiResponse<Opportunity>>(`/opportunities/${id}`, input);
  return res.data.data;
}

export async function closeOpportunity(id: string, input: CloseOpportunityInput) {
  const res = await http.post<ApiResponse<Opportunity>>(`/opportunities/${id}/close`, input);
  return res.data.data;
}

export async function reopenOpportunity(id: string) {
  const res = await http.post<ApiResponse<Opportunity>>(`/opportunities/${id}/reopen`, {});
  return res.data.data;
}

export async function uploadContract(id: string, file: File) {
  const form = new FormData();
  form.append('file', file);
  const res = await http.post<ApiResponse<Opportunity>>(`/opportunities/${id}/contract/upload`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data.data;
}

export async function signContract(id: string) {
  const res = await http.post<ApiResponse<Opportunity>>(`/opportunities/${id}/contract/sign`, {});
  return res.data.data;
}

export async function exportOpportunitiesCsv(params?: QueryOpportunitiesParams) {
  const res = await http.get('/opportunities/export', { params, responseType: 'blob' });
  const url = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = `opportunities_${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
