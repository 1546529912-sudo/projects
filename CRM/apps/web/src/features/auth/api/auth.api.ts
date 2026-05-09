import type { LoginInput } from '@crm/shared';
import { http } from '@/shared/api/http';
import type { ApiResponse } from '@/shared/api/types';
import type { AuthUser } from '../store/auth.store';

export interface LoginResponse {
  accessToken: string;
  user: AuthUser;
}

export async function login(input: LoginInput) {
  const response = await http.post<ApiResponse<LoginResponse>>('/auth/login', input);
  return response.data.data;
}

export async function logout() {
  await http.post('/auth/logout');
}

export async function getMe() {
  const response = await http.get<ApiResponse<AuthUser>>('/auth/me');
  return response.data.data;
}

export async function changePassword(currentPassword: string, newPassword: string) {
  const res = await http.patch<ApiResponse<{ ok: boolean }>>('/auth/change-password', { currentPassword, newPassword });
  return res.data.data;
}
