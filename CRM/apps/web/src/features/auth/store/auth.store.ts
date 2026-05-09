import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface AuthUser {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  role: 'sales' | 'manager' | 'director' | 'admin'; // matches UserRole in admin.api.ts
  departmentId: string | null;
}

interface AuthState {
  accessToken: string | null;
  user: AuthUser | null;
  setAuth: (payload: { accessToken: string; user: AuthUser }) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      user: null,
      setAuth: (payload) => set(payload),
      clearAuth: () => set({ accessToken: null, user: null }),
    }),
    { name: 'crm-auth' },
  ),
);
