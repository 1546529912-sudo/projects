import http, { type ApiResponse } from './http'

export interface Address {
  id: number
  user_id: number
  receiver_name: string
  receiver_phone: string
  province: string
  city: string
  district: string
  detail: string
  is_default: boolean
  created_at: string
  updated_at: string
}

export interface AddressPayload {
  receiver_name: string
  receiver_phone: string
  province: string
  city: string
  district: string
  detail: string
  is_default?: boolean
}

export function listAddresses() {
  return http.get<ApiResponse<{ items: Address[] }>, ApiResponse<{ items: Address[] }>>('/addresses')
}

export function createAddress(payload: AddressPayload) {
  return http.post<ApiResponse<{ address: Address }>, ApiResponse<{ address: Address }>>('/addresses', payload)
}

export function updateAddress(id: number, payload: Partial<AddressPayload>) {
  return http.put<ApiResponse<{ address: Address }>, ApiResponse<{ address: Address }>>(`/addresses/${id}`, payload)
}

export function deleteAddress(id: number) {
  return http.delete<ApiResponse<{ id: number }>, ApiResponse<{ id: number }>>(`/addresses/${id}`)
}
