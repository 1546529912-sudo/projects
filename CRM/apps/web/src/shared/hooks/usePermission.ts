import { useQuery } from '@tanstack/react-query';
import { getSystemConfig } from '@/features/settings/api/admin.api';
import { useAuthStore } from '@/features/auth/store/auth.store';

type PermissionConfig = Record<string, string[]>;

const FEATURE_DEFAULTS: Record<string, string[]> = {
  'customer.export': ['admin', 'director'],
  'customer.transfer': ['admin', 'director', 'manager'],
  'customer.delete': ['admin'],
  'customer.archive': ['admin', 'director', 'manager'],
  'customer.merge': ['admin'],
  'customer.source_edit': ['admin', 'director', 'manager'],
  'opportunity.close': ['admin', 'director', 'manager', 'sales'],
  'opportunity.reopen': ['admin', 'director', 'manager'],
  'opportunity.export': ['admin', 'director', 'manager'],
  'order.pay': ['admin', 'director', 'manager'],
  'order.refund_request': ['admin', 'director', 'manager'],
  'order.refund_process': ['admin', 'director', 'manager'],
  'settings.access': ['admin'],
  'report.view_all': ['admin', 'director'],
  'report.view_dept': ['admin', 'director', 'manager'],
};

export function usePermission() {
  const { user } = useAuthStore();
  const role = user?.role ?? 'sales';

  const { data: cfg } = useQuery({
    queryKey: ['system-config', 'function_permissions'],
    queryFn: () => getSystemConfig('function_permissions'),
    staleTime: 5 * 60 * 1000,
  });

  const permissions: PermissionConfig = (cfg?.value as PermissionConfig | null) ?? {};

  function can(featureKey: string): boolean {
    if (role === 'admin') return true;
    const allowedRoles = permissions[featureKey] ?? FEATURE_DEFAULTS[featureKey] ?? ['admin'];
    return allowedRoles.includes(role);
  }

  return { can, role };
}
