import http, { type ApiResponse } from './http'

export interface StockAlert {
  id: number
  sku_id: number
  sku_code: string | null
  product_id: number | null
  product_name: string | null
  current_stock: number
  threshold: number
  status: 'open' | 'resolved'
  webhook_status: 'pending' | 'mock_only' | 'sent' | 'failed'
  webhook_response: string | null
  webhook_attempts: number
  triggered_at: string | null
  resolved_at: string | null
}

export interface StockAlertList {
  items: StockAlert[]
  total: number
  page: number
  per_page: number
  open_count: number
}

export function adminListStockAlerts(params: { status?: 'open' | 'resolved' | 'all'; page?: number; per_page?: number } = {}) {
  return http.get<ApiResponse<StockAlertList>, ApiResponse<StockAlertList>>('/admin/stock-alerts', { params })
}

export function adminResolveStockAlert(id: number) {
  return http.post<ApiResponse<{ alert: StockAlert }>, ApiResponse<{ alert: StockAlert }>>(
    `/admin/stock-alerts/${id}/resolve`,
  )
}
