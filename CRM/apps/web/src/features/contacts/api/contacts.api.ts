import { http } from '@/shared/api/http';
import type { ApiResponse } from '@/shared/api/types';
import type { Contact } from '@/features/customers/api/customers.api';

export interface CreateContactInput {
  name: string;
  phone?: string;
  email?: string;
  position?: string;
  decisionRole?: string;
  isPrimary?: boolean;
}

export interface ContactWithCustomer extends Contact {
  customer: { id: string; name: string; ownerId: string } | null;
}

export interface ContactListResponse {
  items: ContactWithCustomer[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
}

export async function listAllContacts(params?: { page?: number; pageSize?: number; keyword?: string }) {
  const res = await http.get<ApiResponse<ContactListResponse>>('/contacts', { params });
  return res.data.data;
}

export async function listContacts(customerId: string) {
  const res = await http.get<ApiResponse<Contact[]>>(`/customers/${customerId}/contacts`);
  return res.data.data;
}

export async function createContact(customerId: string, input: CreateContactInput) {
  const res = await http.post<ApiResponse<Contact>>(`/customers/${customerId}/contacts`, input);
  return res.data.data;
}

export async function updateContact(id: string, input: Partial<CreateContactInput>) {
  const res = await http.patch<ApiResponse<Contact>>(`/contacts/${id}`, input);
  return res.data.data;
}

export async function deleteContact(id: string) {
  const res = await http.delete<ApiResponse<{ success: boolean }>>(`/contacts/${id}`);
  return res.data.data;
}
