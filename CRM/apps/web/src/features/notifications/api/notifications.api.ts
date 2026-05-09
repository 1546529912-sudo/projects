import { http } from '@/shared/api/http';
import type { ApiResponse } from '@/shared/api/types';

export interface NotificationItem {
  id: string;
  type: 'follow_up_today' | 'follow_up_overdue' | string;
  title: string;
  body: string | null;
  isRead: boolean;
  refType: string | null;
  refId: string | null;
  createdAt: string;
  readAt: string | null;
}

export interface NotificationListResponse {
  items: NotificationItem[];
  nextCursor: string | null;
}

export const NOTIFICATIONS_QUERY_KEY = ['notifications'];
export const UNREAD_COUNT_QUERY_KEY = ['notifications', 'unread-count'];

export async function getNotifications(cursor?: string): Promise<NotificationListResponse> {
  const params = cursor ? { cursor } : {};
  const res = await http.get<ApiResponse<NotificationListResponse>>('/notifications', { params });
  return res.data.data;
}

export async function getUnreadCount(): Promise<{ count: number }> {
  const res = await http.get<ApiResponse<{ count: number }>>('/notifications/unread-count');
  return res.data.data;
}

export async function markRead(id: string): Promise<void> {
  await http.patch(`/notifications/${id}/read`);
}

export async function markAllRead(): Promise<void> {
  await http.post('/notifications/read-all');
}
