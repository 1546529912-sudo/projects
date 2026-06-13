import http, { type ApiResponse } from './http'

export interface KnowledgeItem {
  id: number
  title: string
  content: string
  category: string
  keywords: string | null
  source: string | null
  status: 'draft' | 'pending_review' | 'active' | 'disabled'
  created_at: string
  updated_at: string
}

export interface KnowledgePayload {
  title: string
  content: string
  category: string
  keywords?: string
  source?: string
  status?: KnowledgeItem['status']
}

export function listKnowledge(params: { keyword?: string; category?: string; status?: string; page?: number; per_page?: number } = {}) {
  return http.get<ApiResponse<{ items: KnowledgeItem[]; total: number }>, ApiResponse<{ items: KnowledgeItem[]; total: number }>>(
    '/admin/knowledge', { params },
  )
}

export function createKnowledge(payload: KnowledgePayload) {
  return http.post<ApiResponse<{ knowledge: KnowledgeItem }>, ApiResponse<{ knowledge: KnowledgeItem }>>(
    '/admin/knowledge', payload,
  )
}

export function updateKnowledge(id: number, payload: Partial<KnowledgePayload>) {
  return http.put<ApiResponse<{ knowledge: KnowledgeItem }>, ApiResponse<{ knowledge: KnowledgeItem }>>(
    `/admin/knowledge/${id}`, payload,
  )
}

export function deleteKnowledge(id: number) {
  return http.delete<ApiResponse<{ id: number }>, ApiResponse<{ id: number }>>(`/admin/knowledge/${id}`)
}

export function toggleKnowledge(id: number) {
  return http.post<ApiResponse<{ id: number; status: string }>, ApiResponse<{ id: number; status: string }>>(
    `/admin/knowledge/${id}/toggle`,
  )
}
