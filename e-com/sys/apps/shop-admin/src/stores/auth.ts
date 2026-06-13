import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export type AdminRole = 'super_admin' | 'warehouse' | 'sales_ops' | 'store_owner' | 'store_staff' | 'editor' | '';

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string>(localStorage.getItem('admin_token') || '');
  const username = ref<string>(localStorage.getItem('admin_username') || '');
  const name = ref<string>(localStorage.getItem('admin_name') || '');
  const role = ref<AdminRole>((localStorage.getItem('admin_role') as AdminRole) || '');
  const isLogin = computed(() => !!token.value);

  function login(tk: string, user: { username: string; name?: string; role: AdminRole }) {
    token.value = tk;
    username.value = user.username;
    name.value = user.name || user.username;
    role.value = user.role;
    localStorage.setItem('admin_token', tk);
    localStorage.setItem('admin_username', user.username);
    localStorage.setItem('admin_name', name.value);
    localStorage.setItem('admin_role', user.role);
  }

  function logout() {
    token.value = '';
    username.value = '';
    name.value = '';
    role.value = '';
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_username');
    localStorage.removeItem('admin_name');
    localStorage.removeItem('admin_role');
  }

  // 角色权限
  // iter-36 BIZ-08-2: store_owner/store_staff 也可见 PIM/OMS（看自己店）
  const isStoreRole = computed(() => role.value === 'store_owner' || role.value === 'store_staff');
  const canSeePim = computed(() => ['super_admin', 'sales_ops', 'store_owner', 'store_staff', 'editor'].includes(role.value));
  const canSeeOms = computed(() => ['super_admin', 'sales_ops', 'store_owner', 'store_staff'].includes(role.value));
  const canSeeWms = computed(() => role.value === 'super_admin' || role.value === 'warehouse');
  const canSeeMarketing = computed(() => role.value === 'super_admin' || role.value === 'sales_ops');
  const isSuperAdmin = computed(() => role.value === 'super_admin');
  // 是否能看到/操作"店铺选择"下拉（仅平台员工）
  const canSelectStore = computed(() => ['super_admin', 'sales_ops'].includes(role.value));
  // iter-43 EFF-04 editor 不可上下架
  const canPublishSpu = computed(() => ['super_admin', 'sales_ops', 'store_owner'].includes(role.value));
  // iter-46 BI 数据洞察 — 仅平台运营级
  const canSeeBi = computed(() => ['super_admin', 'sales_ops'].includes(role.value));
  // iter-50 商家提现 — 商家自己 + 平台运营
  const canSeeWithdrawal = computed(() => ['super_admin', 'sales_ops', 'store_owner', 'store_staff'].includes(role.value));
  const canApproveWithdrawal = computed(() => role.value === 'super_admin');
  const canApplyWithdrawal = computed(() => ['store_owner', 'store_staff'].includes(role.value));

  return { token, username, name, role, isLogin, login, logout, isStoreRole, canSeePim, canSeeOms, canSeeWms, canSeeMarketing, isSuperAdmin, canSelectStore, canPublishSpu, canSeeBi, canSeeWithdrawal, canApproveWithdrawal, canApplyWithdrawal };
});
