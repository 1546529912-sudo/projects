import { useAuthStore } from '@/features/auth/store/auth.store';

export function useAuth() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  return { accessToken, user, isAuthenticated: Boolean(accessToken && user) };
}
