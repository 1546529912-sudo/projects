import http, { type ApiResponse } from './http'

export interface FailedJob {
  id: number
  uuid: string
  connection: string
  queue: string
  job_class: string
  attempts: number | null
  exception_excerpt: string
  failed_at: string
}

export interface FailedJobList {
  items: FailedJob[]
  total: number
  page: number
  per_page: number
  last_page: number
}

export interface FailedJobStats {
  count: number
  oldest_at: string | null
  latest_at: string | null
}

export function adminListFailedJobs(params: { perPage?: number; page?: number; keyword?: string } = {}) {
  return http.get<ApiResponse<FailedJobList>, ApiResponse<FailedJobList>>(
    '/admin/failed-jobs',
    {
      params: {
        per_page: params.perPage ?? 20,
        page: params.page ?? 1,
        keyword: params.keyword || undefined,
      },
    },
  )
}

export function adminFailedJobStats() {
  return http.get<ApiResponse<FailedJobStats>, ApiResponse<FailedJobStats>>('/admin/failed-jobs/stats')
}

export function adminRetryFailedJob(uuid: string) {
  return http.post<ApiResponse<{ retried: string }>, ApiResponse<{ retried: string }>>(
    `/admin/failed-jobs/${uuid}/retry`,
  )
}

export function adminDeleteFailedJob(uuid: string) {
  return http.delete<ApiResponse<{ deleted: string }>, ApiResponse<{ deleted: string }>>(
    `/admin/failed-jobs/${uuid}`,
  )
}

export function adminClearFailedJobs() {
  return http.post<ApiResponse<{ cleared: number }>, ApiResponse<{ cleared: number }>>(
    '/admin/failed-jobs/clear',
  )
}
