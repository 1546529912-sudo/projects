import http, { type ApiResponse } from './http'

export interface AdminOrder {
  id: number
  order_no: string
  status: string
  user: { id: number; phone: string | null } | null
  total_amount: string
  paid_amount: string
  shipping_address: any
  tracking_company: string | null
  tracking_no: string | null
  first_product_name: string | null
  item_count: number
  pending_voucher: { payment_id: number; voucher_url: string } | null
  created_at: string
}

export function adminListOrders(params: { status?: string; keyword?: string; page?: number; per_page?: number } = {}) {
  return http.get<
    ApiResponse<{ items: AdminOrder[]; total: number; page: number; per_page: number }>,
    ApiResponse<{ items: AdminOrder[]; total: number; page: number; per_page: number }>
  >('/admin/orders', { params })
}

export function adminShipOrder(id: number, tracking_company: string, tracking_no: string) {
  return http.post<ApiResponse<{ order: any }>, ApiResponse<{ order: any }>>(
    `/admin/orders/${id}/ship`,
    { tracking_company, tracking_no },
  )
}

export function adminReviewVoucher(paymentId: number, action: 'approve' | 'reject', rejectReason?: string) {
  return http.post<ApiResponse<{ payment: any; order: any }>, ApiResponse<{ payment: any; order: any }>>(
    `/admin/payments/${paymentId}/review`,
    { action, reject_reason: rejectReason },
  )
}
