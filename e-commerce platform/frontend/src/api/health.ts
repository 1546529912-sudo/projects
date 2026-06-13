import http, { type ApiResponse } from './http'

export interface HealthCheck {
  ok: boolean
  error?: string
  latency_ms?: number | null
  status?: number
  remote?: string | null
}

export interface HealthData {
  service: string
  version: string
  checks: {
    mysql: HealthCheck
    redis: HealthCheck
    ai_service: HealthCheck
  }
  timestamp: string
}

export function getHealth(): Promise<ApiResponse<HealthData>> {
  return http.get('/health')
}
