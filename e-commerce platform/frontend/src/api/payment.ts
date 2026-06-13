import http, { type ApiResponse } from './http'

export type PaymentMethod = 'wechat' | 'alipay' | 'bank_transfer'

export interface Payment {
  id: number
  order_id: number
  payment_no: string
  method: PaymentMethod
  amount: string
  status: 'pending' | 'success' | 'failed' | 'refunded'
  transaction_id: string | null
  voucher_url: string | null
  paid_at: string | null
  reject_reason: string | null
  created_at: string
}

export interface InitiatePayload {
  order_id: number
  method: PaymentMethod
}

export interface InitiateResponse {
  payment: Payment
  order_no: string
  amount: string
  qr_code_text?: string
  mock_endpoint?: string
  bank_account?: {
    name: string
    bank: string
    account_no: string
  }
}

export function initiatePayment(payload: InitiatePayload) {
  return http.post<ApiResponse<InitiateResponse>, ApiResponse<InitiateResponse>>('/payments', payload)
}

export function mockPaymentSuccess(paymentId: number) {
  return http.post<ApiResponse<{ payment: Payment; order: any }>, ApiResponse<{ payment: Payment; order: any }>>(
    `/payments/${paymentId}/mock-success`,
  )
}

export function uploadVoucher(paymentId: number, file: File) {
  const form = new FormData()
  form.append('file', file)
  return http.post<ApiResponse<{ payment: Payment; order: any; url: string }>, ApiResponse<{ payment: Payment; order: any; url: string }>>(
    `/payments/${paymentId}/voucher`,
    form,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  )
}
