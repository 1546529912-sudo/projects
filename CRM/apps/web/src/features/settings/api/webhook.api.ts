import { http } from '@/shared/api/http';
import type { ApiResponse } from '@/shared/api/types';

export interface WebhookConfig {
  id: string;
  name: string;
  url: string;
  events: string[];
  secret: string | null;
  isActive: boolean;
  lastFiredAt: string | null;
  createdAt: string;
}

export async function listWebhookConfigs(): Promise<WebhookConfig[]> {
  const res = await http.get<ApiResponse<WebhookConfig[]>>('/webhook-configs');
  return res.data.data;
}

export async function createWebhookConfig(input: { name: string; url: string; events: string[]; secret?: string }): Promise<WebhookConfig> {
  const res = await http.post<ApiResponse<WebhookConfig>>('/webhook-configs', input);
  return res.data.data;
}

export async function updateWebhookConfig(id: string, input: { name?: string; url?: string; events?: string[]; secret?: string | null; isActive?: boolean }): Promise<WebhookConfig> {
  const res = await http.patch<ApiResponse<WebhookConfig>>(`/webhook-configs/${id}`, input);
  return res.data.data;
}

export async function deleteWebhookConfig(id: string): Promise<void> {
  await http.delete(`/webhook-configs/${id}`);
}
