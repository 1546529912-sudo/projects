import { http } from '@/shared/api/http';
import type { ApiResponse } from '@/shared/api/types';

export interface FollowUpAttachment {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
}

export interface FollowUp {
  id: string;
  customerId: string;
  content: string;
  followUpTime: string;
  nextFollowUpTime: string | null;
  owner: { id: string; name: string };
  contact: { id: string; name: string } | null;
  attachments: FollowUpAttachment[];
  createdAt: string;
}

export interface CreateFollowUpInput {
  content: string;
  followUpTime: string;
  nextFollowUpTime?: string;
  contactId?: number;
}

export async function listFollowUps(customerId: string, params?: { page?: number; pageSize?: number }) {
  const res = await http.get<ApiResponse<{ items: FollowUp[]; pagination: any }>>(`/customers/${customerId}/follow-ups`, { params });
  return res.data.data;
}

export async function createFollowUp(customerId: string, input: CreateFollowUpInput) {
  const res = await http.post<ApiResponse<FollowUp>>(`/customers/${customerId}/follow-ups`, input);
  return res.data.data;
}

export async function updateFollowUp(customerId: string, id: string, input: Partial<CreateFollowUpInput>) {
  const res = await http.patch<ApiResponse<FollowUp>>(`/customers/${customerId}/follow-ups/${id}`, input);
  return res.data.data;
}

export async function uploadFollowUpAttachment(customerId: string, followUpId: string, file: File): Promise<FollowUpAttachment> {
  const form = new FormData();
  form.append('file', file);
  const res = await http.post<ApiResponse<FollowUpAttachment>>(
    `/customers/${customerId}/follow-ups/${followUpId}/attachments`,
    form,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );
  return res.data.data;
}

export function getAttachmentDownloadUrl(customerId: string, followUpId: string, attachmentId: string): string {
  return `/api/v1/customers/${customerId}/follow-ups/attachments/${attachmentId}/download`;
}

export async function deleteFollowUpAttachment(customerId: string, followUpId: string, attachmentId: string): Promise<void> {
  await http.delete(`/customers/${customerId}/follow-ups/${followUpId}/attachments/${attachmentId}`);
}

export interface FollowUpEditHistoryItem {
  id: string;
  field: string;
  beforeValue: string | null;
  afterValue: string | null;
  createdAt: string;
  editor: { id: string; name: string };
}

export async function getFollowUpEditHistory(customerId: string, followUpId: string): Promise<FollowUpEditHistoryItem[]> {
  const res = await http.get<ApiResponse<FollowUpEditHistoryItem[]>>(
    `/customers/${customerId}/follow-ups/${followUpId}/history`,
  );
  return res.data.data;
}
