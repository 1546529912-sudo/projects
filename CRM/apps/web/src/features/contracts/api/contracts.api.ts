import { http } from '@/shared/api/http';
import type { ApiResponse } from '@/shared/api/types';

export interface Contract {
  id: string;
  contractNo: string;
  title: string;
  amount: string;
  status: 'draft' | 'active' | 'expired' | 'terminated' | 'voided';
  customerId: string;
  customer: { id: string; name: string } | null;
  opportunityId: string | null;
  opportunity: { id: string; title: string } | null;
  ownerId: string;
  owner: { id: string; name: string };
  signingDate: string | null;
  startDate: string | null;
  endDate: string | null;
  notes: string | null;
  fileUrl: string | null;
  fileName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateContractInput {
  customerId: string;
  opportunityId?: string;
  title: string;
  amount?: number;
  signingDate?: string;
  startDate?: string;
  endDate?: string;
  notes?: string;
}

export interface UpdateContractInput {
  title?: string;
  amount?: number;
  status?: string;
  signingDate?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  notes?: string;
}

export async function listContracts(params?: { customerId?: string; opportunityId?: string }): Promise<Contract[]> {
  const res = await http.get<ApiResponse<Contract[]>>('/contracts', { params });
  return res.data.data;
}

export async function createContract(input: CreateContractInput): Promise<Contract> {
  const res = await http.post<ApiResponse<Contract>>('/contracts', input);
  return res.data.data;
}

export async function updateContract(id: string, input: UpdateContractInput): Promise<Contract> {
  const res = await http.patch<ApiResponse<Contract>>(`/contracts/${id}`, input);
  return res.data.data;
}

export async function deleteContract(id: string): Promise<void> {
  await http.delete(`/contracts/${id}`);
}

export async function uploadContractFile(id: string, file: File): Promise<Contract> {
  const form = new FormData();
  form.append('file', file);
  const token = localStorage.getItem('token');
  const res = await fetch(`/api/v1/contracts/${id}/upload`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message ?? '上传失败');
  }
  const data = await res.json();
  return data.data ?? data;
}

export function getContractDownloadUrl(id: string): string {
  return `/api/v1/contracts/${id}/download`;
}

export const CONTRACT_STATUS_LABELS: Record<string, string> = {
  draft: '草稿',
  active: '生效中',
  expired: '已到期',
  terminated: '已终止',
  voided: '已作废',
};

export const CONTRACT_STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  active: 'bg-emerald-100 text-emerald-700',
  expired: 'bg-amber-100 text-amber-700',
  terminated: 'bg-red-100 text-red-600',
  voided: 'bg-gray-100 text-gray-400',
};
