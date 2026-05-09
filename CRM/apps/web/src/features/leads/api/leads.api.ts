import { useAuthStore } from '@/features/auth/store/auth.store';
import { http } from '@/shared/api/http';
import type { ApiResponse } from '@/shared/api/types';

export interface Lead {
  id: string;
  name: string | null;
  companyName: string | null;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  sourceCategory: string | null;
  sourceDetail: string | null;
  status: 'new' | 'converted' | 'duplicate_suspected' | 'invalid';
  ownerId: string;
  owner: { id: string; name: string };
  convertedCustomerId: string | null;
  createdAt: string;
}

export interface DuplicateWarning {
  id: string;
  type: 'lead' | 'customer';
  name: string;
  matchType: 'phone' | 'email' | 'company_contact';
  matchValue: string;
  isOwn: boolean;
}

export interface CreateLeadInput {
  name?: string;
  companyName?: string;
  contactName?: string;
  phone?: string;
  email?: string;
  sourceCategory?: string;
  sourceDetail?: string;
}

export interface LeadListResponse {
  items: Lead[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
}

export async function listLeads(params?: { page?: number; pageSize?: number; keyword?: string; status?: string }) {
  const res = await http.get<ApiResponse<LeadListResponse>>('/leads', { params });
  return res.data.data;
}

export async function invalidateLead(id: string) {
  const res = await http.post<ApiResponse<{ lead: Lead }>>(`/leads/${id}/invalidate`);
  return res.data.data;
}

export async function restoreLead(id: string) {
  const res = await http.post<ApiResponse<{ lead: Lead }>>(`/leads/${id}/restore`);
  return res.data.data;
}

export async function createLead(input: CreateLeadInput) {
  const res = await http.post<ApiResponse<{ lead: Lead; duplicateWarnings: DuplicateWarning[] }>>('/leads', input);
  return res.data.data;
}

export async function updateLead(id: string, input: Partial<CreateLeadInput>) {
  const res = await http.post<ApiResponse<{ lead: Lead }>>('/leads/save-edit', { id, ...input });
  return res.data.data;
}

export async function checkLeadDuplicates(params: { phone?: string; email?: string; companyName?: string; contactName?: string }) {
  const res = await http.get<ApiResponse<DuplicateWarning[]>>('/leads/duplicates/check', { params });
  return res.data.data;
}

export async function convertLead(leadId: string, payload: { level?: string; ownerId?: number; createOpportunity?: boolean }) {
  const res = await http.post<ApiResponse<{ customerId: string; contactId: string; opportunityId: string | null }>>(`/leads/${leadId}/convert`, payload);
  return res.data.data;
}

export interface ImportResult {
  total: number;
  imported: number;
  duplicates: number;
  errors: Array<{ row: number; reason: string }>;
}

export async function importLeads(file: File): Promise<ImportResult> {
  const form = new FormData();
  form.append('file', file);
  const res = await http.post<ApiResponse<ImportResult>>('/leads/import', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data.data;
}

export function downloadLeadTemplate() {
  const token = useAuthStore.getState().accessToken;
  if (!token) return;
  const a = document.createElement('a');
  a.href = `/api/v1/leads/import/template`;
  fetch('/api/v1/leads/import/template', { headers: { Authorization: `Bearer ${token}` } })
    .then((r) => r.blob())
    .then((blob) => {
      a.href = URL.createObjectURL(blob);
      a.download = 'leads_import_template.xlsx';
      a.click();
    });
}
