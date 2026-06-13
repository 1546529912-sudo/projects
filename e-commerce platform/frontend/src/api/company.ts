import http, { type ApiResponse } from './http'

export interface Company {
  id: number
  user_id: number
  name: string
  credit_code: string
  license_url: string
  contact_name: string
  contact_phone: string
  status: 'pending' | 'approved' | 'rejected'
  reject_reason?: string | null
  reviewed_at?: string | null
  created_at: string
  updated_at: string
}

export interface CompanyPayload {
  name: string
  credit_code: string
  license_url: string
  contact_name: string
  contact_phone: string
}

export function submitCompany(payload: CompanyPayload) {
  return http.post<ApiResponse<{ company: Company }>, ApiResponse<{ company: Company }>>(
    '/companies',
    payload,
  )
}

export function fetchMyCompany() {
  return http.get<ApiResponse<{ company: Company | null }>, ApiResponse<{ company: Company | null }>>(
    '/companies/me',
  )
}

export function uploadLicense(file: File) {
  const form = new FormData()
  form.append('file', file)
  return http.post<ApiResponse<{ url: string; path: string }>, ApiResponse<{ url: string; path: string }>>(
    '/upload/license',
    form,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  )
}

export function adminPendingCompanies() {
  return http.get<ApiResponse<{ items: Company[]; total: number }>, ApiResponse<{ items: Company[]; total: number }>>(
    '/admin/companies/pending',
  )
}

export function adminReviewCompany(id: number, action: 'approve' | 'reject', rejectReason?: string) {
  return http.post(`/admin/companies/${id}/review`, {
    action,
    reject_reason: rejectReason,
  })
}
