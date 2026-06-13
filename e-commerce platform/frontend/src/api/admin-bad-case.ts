import http, { type ApiResponse } from './http'

export interface AiFeedback {
  id: number
  message_id: number
  conversation_id: number
  user_id: number | null
  rating: 'good' | 'bad'
  source: 'manual' | 'auto_transfer' | 'auto_lowconf'
  reason: string | null
  correct_answer: string | null
  tags: string[] | null
  labeled: boolean
  labeled_at: string | null
  labeled_by: number | null
  message_content: string | null
  created_at: string
  updated_at: string  // iter-26 乐观锁
}

export interface FeedbackList {
  items: AiFeedback[]
  total: number
  page: number
  per_page: number
  unlabeled_bad_count: number
}

export interface FeedbackStats {
  by_source: Record<string, number>
  by_tag: Record<string, number>
  unlabeled_bad: number
  total_bad: number
  training_ready: number
}

export function adminListBadCases(params: {
  rating?: 'good' | 'bad' | 'all'
  labeled?: '0' | '1' | 'all'
  source?: 'manual' | 'auto_transfer'
  page?: number
  per_page?: number
} = {}) {
  return http.get<ApiResponse<FeedbackList>, ApiResponse<FeedbackList>>(
    '/admin/ai/feedbacks',
    { params },
  )
}

export function adminLabelBadCase(id: number, tags: string[], correctAnswer?: string, ifMatch?: string) {
  return http.post<ApiResponse<{ feedback: AiFeedback }>, ApiResponse<{ feedback: AiFeedback }>>(
    `/admin/ai/feedbacks/${id}/label`,
    { tags, correct_answer: correctAnswer || null, if_match: ifMatch || null },
  )
}

export function adminBadCaseStats() {
  return http.get<ApiResponse<FeedbackStats>, ApiResponse<FeedbackStats>>('/admin/ai/feedbacks/stats')
}

/** iter-14：直接 fetch + blob，再触发浏览器下载（绕过 axios interceptor 的 data 拆包） */
export async function adminExportBadCases(format: 'csv' | 'jsonl', params: {
  rating?: 'good' | 'bad' | 'all'
  labeled?: '0' | '1' | 'all'
} = {}) {
  const token = localStorage.getItem('access_token') || ''
  const qs = new URLSearchParams()
  if (params.rating) qs.set('rating', params.rating)
  if (params.labeled) qs.set('labeled', params.labeled)
  const url = `/api/v1/admin/ai/feedbacks/export.${format}` + (qs.toString() ? `?${qs}` : '')

  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const blob = await res.blob()
  const filename =
    res.headers.get('content-disposition')?.match(/filename="?([^";]+)/)?.[1]
    || `ai-feedbacks.${format}`

  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(a.href)
}
