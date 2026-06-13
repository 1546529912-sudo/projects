import http, { type ApiResponse } from './http'

export type OrderStatus =
  | 'pending_payment' | 'pending_review' | 'pending_shipment'
  | 'shipped' | 'received' | 'completed'
  | 'cancelled' | 'refunding' | 'refunded'

export interface OrderListItem {
  id: number
  order_no: string
  status: OrderStatus
  total_amount: string
  item_count: number
  thumbs: (string | null)[]
  first_product_name: string | null
  created_at: string
}

export interface OrderItemDetail {
  id: number
  sku_id: number
  product_name: string
  sku_code: string
  product_image: string | null
  qty: number
  unit_price: string
  total_price: string
}

export interface LogisticsTrack {
  id: number
  node: 'accepted' | 'transit' | 'dispatching' | 'delivered'
  location: string | null
  description: string
  occurred_at: string
}

export interface OrderDetail {
  id: number
  order_no: string
  status: OrderStatus
  product_amount: string
  shipping_fee: string
  total_amount: string
  paid_amount?: string
  shipping_method: 'standard' | 'express'
  shipping_address: {
    receiver_name: string
    receiver_phone: string
    province: string
    city: string
    district: string
    detail: string
  }
  tracking_company?: string | null
  tracking_no?: string | null
  tracks?: LogisticsTrack[]
  remark: string | null
  cancel_reason: string | null
  created_at: string
  paid_at?: string | null
  shipped_at?: string | null
  received_at?: string | null
  completed_at?: string | null
  cancelled_at: string | null
  items: OrderItemDetail[]
}

export interface CreateOrderPayload {
  address_id: number
  shipping_method?: 'standard' | 'express'
  remark?: string
}

export function listOrders(status?: OrderStatus | 'all', page = 1, perPage = 10) {
  return http.get<
    ApiResponse<{ items: OrderListItem[]; total: number; page: number; per_page: number }>,
    ApiResponse<{ items: OrderListItem[]; total: number; page: number; per_page: number }>
  >('/orders', { params: { status, page, per_page: perPage } })
}

export function createOrder(payload: CreateOrderPayload) {
  return http.post<ApiResponse<{ order: OrderDetail }>, ApiResponse<{ order: OrderDetail }>>('/orders', payload)
}

export function getOrder(id: number) {
  return http.get<ApiResponse<{ order: OrderDetail }>, ApiResponse<{ order: OrderDetail }>>(`/orders/${id}`)
}

export function cancelOrder(id: number, reason?: string) {
  return http.post<ApiResponse<{ order: OrderDetail }>, ApiResponse<{ order: OrderDetail }>>(
    `/orders/${id}/cancel`,
    { reason },
  )
}

export function confirmReceipt(id: number) {
  return http.post<ApiResponse<{ order: OrderDetail }>, ApiResponse<{ order: OrderDetail }>>(
    `/orders/${id}/confirm-receipt`,
  )
}
