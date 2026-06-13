import http, { type ApiResponse } from './http'

export interface AuthUser {
  id: number
  phone: string | null
  name?: string | null
  role: 'individual' | 'enterprise' | 'admin'
  active_role?: 'individual' | 'enterprise'
  company?: {
    id: number
    name: string
    status: 'pending' | 'approved' | 'rejected'
    reject_reason?: string | null
  } | null
}

export interface LoginPayload {
  phone: string
  password?: string
  code?: string
}

export interface RegisterPayload {
  phone: string
  code: string
  password?: string
}

export interface TokenResponse {
  user: AuthUser
  access_token: string
  expires_in: number
  need_bind_phone?: boolean
}

export function sendSmsCode(phone: string) {
  return http.post<ApiResponse, ApiResponse>('/auth/sms/send', { phone })
}

export function register(payload: RegisterPayload) {
  return http.post<ApiResponse<TokenResponse>, ApiResponse<TokenResponse>>('/auth/register', payload)
}

export function login(payload: LoginPayload) {
  return http.post<ApiResponse<TokenResponse>, ApiResponse<TokenResponse>>('/auth/login', payload)
}

export function wechatCallback(code: string, mockOpenid?: string) {
  return http.post<ApiResponse<TokenResponse>, ApiResponse<TokenResponse>>('/auth/wechat/callback', {
    code,
    mock_openid: mockOpenid,
  })
}

export function logout() {
  return http.post('/auth/logout')
}

export function fetchMe() {
  return http.get<ApiResponse<AuthUser>, ApiResponse<AuthUser>>('/users/me')
}

export function switchRole(role: 'individual' | 'enterprise') {
  return http.post('/users/role/switch', { role })
}
