import { http } from '@/shared/api/http';
import type { ApiResponse, PaginatedResponse } from '@/shared/api/types';

export interface Order {
  id: string;
  customerId: string;
  opportunityId: string | null;
  orderNo: string;
  amount: string;
  paidAmount: string;
  status: string;
  customer?: { id: string; name: string };
  opportunity?: { id: string; title: string };
  createdAt: string;
  updatedAt: string;
}

export interface ListOrdersParams {
  page?: number;
  pageSize?: number;
  status?: string;
  keyword?: string;
}

export async function listOrders(params: ListOrdersParams = {}) {
  const res = await http.get<ApiResponse<PaginatedResponse<Order>>>('/orders', { params: { pageSize: 20, ...params } });
  return res.data.data;
}

export async function payOrder(id: string, amount?: number) {
  const res = await http.post<ApiResponse<Order>>(`/orders/${id}/pay`, amount != null ? { amount } : {});
  return res.data.data;
}

export async function requestRefund(id: string, reason?: string) {
  const res = await http.post<ApiResponse<Order>>(`/orders/${id}/refund-request`, { reason });
  return res.data.data;
}

export async function processRefund(id: string) {
  const res = await http.post<ApiResponse<Order>>(`/orders/${id}/refund-process`, {});
  return res.data.data;
}
