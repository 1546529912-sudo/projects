import { http } from '@/shared/api/http';
import type { ApiResponse } from '@/shared/api/types';

export interface Tag {
  id: string;
  name: string;
  color: string;
  category: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface CustomerTagItem {
  tagId: string;
  customerId: string;
  name: string;
  color: string;
  category: string | null;
  addedAt: string;
}

export async function listTags(): Promise<Tag[]> {
  const res = await http.get<ApiResponse<Tag[]>>('/tags');
  return res.data.data;
}

export async function listTagsAdmin(): Promise<Tag[]> {
  const res = await http.get<ApiResponse<Tag[]>>('/tags/admin');
  return res.data.data;
}

export async function createTag(dto: { name: string; color?: string; category?: string }): Promise<Tag> {
  const res = await http.post<ApiResponse<Tag>>('/tags', dto);
  return res.data.data;
}

export async function updateTag(id: string, dto: { name?: string; color?: string; category?: string; isActive?: boolean }): Promise<Tag> {
  const res = await http.patch<ApiResponse<Tag>>(`/tags/${id}`, dto);
  return res.data.data;
}

export async function getCustomerTags(customerId: string): Promise<CustomerTagItem[]> {
  const res = await http.get<ApiResponse<CustomerTagItem[]>>(`/customers/${customerId}/tags`);
  return res.data.data;
}

export async function addTagToCustomer(customerId: string, tagId: string): Promise<{ ok: boolean }> {
  const res = await http.post<ApiResponse<{ ok: boolean }>>(`/customers/${customerId}/tags`, { tagId });
  return res.data.data;
}

export async function removeTagFromCustomer(customerId: string, tagId: string): Promise<{ ok: boolean }> {
  const res = await http.delete<ApiResponse<{ ok: boolean }>>(`/customers/${customerId}/tags/${tagId}`);
  return res.data.data;
}
