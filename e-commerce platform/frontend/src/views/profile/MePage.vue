<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import http, { type ApiResponse } from '@/api/http'

const auth = useAuthStore()
const router = useRouter()

interface Device {
  id: number
  name: string
  created_at: string
  last_used_at: string | null
  is_current: boolean
}

const devices = ref<Device[]>([])
const devicesLoading = ref(false)
const devicesActing = ref<number | string | null>(null)

async function loadDevices() {
  devicesLoading.value = true
  try {
    const r = await http.get<ApiResponse<{ devices: Device[] }>, ApiResponse<{ devices: Device[] }>>(
      '/auth/devices',
    )
    devices.value = r.data.devices
  } catch (e) { /* ignore */ } finally {
    devicesLoading.value = false
  }
}

async function revokeDevice(d: Device) {
  if (d.is_current) {
    if (!confirm('这是当前登录设备，撤销将立即退出登录。继续？')) return
  } else {
    if (!confirm(`撤销该设备的登录会话？\n${d.name}`)) return
  }
  devicesActing.value = d.id
  try {
    await http.delete(`/auth/devices/${d.id}`)
    if (d.is_current) {
      await auth.logout().catch(() => {})
      router.push({ name: 'login' })
    } else {
      await loadDevices()
    }
  } finally {
    devicesActing.value = null
  }
}

async function logoutOthers() {
  if (!confirm('登出除当前外的所有其他设备？')) return
  devicesActing.value = 'others'
  try {
    await http.post('/auth/logout-others')
    await loadDevices()
  } finally {
    devicesActing.value = null
  }
}

function formatTime(s: string | null): string {
  return s ? s.slice(0, 16).replace('T', ' ') : '—'
}

onMounted(loadDevices)

const statusBadge = computed(() => {
  const s = auth.user?.company?.status
  if (s === 'approved') return { text: '已认证', color: 'success' }
  if (s === 'pending') return { text: '审核中', color: 'warning' }
  if (s === 'rejected') return { text: '已驳回', color: 'error' }
  return { text: '未认证', color: 'muted' }
})

async function toggleActiveRole() {
  if (!auth.isEnterprise) return
  const next = auth.user?.active_role === 'enterprise' ? 'individual' : 'enterprise'
  await auth.switchRole(next)
}

async function doLogout() {
  await auth.logout()
  router.push({ name: 'home' })
}
</script>

<template>
  <section class="profile">
    <header class="profile-header">
      <div>
        <h1>{{ auth.user?.name || '我的账号' }}</h1>
        <p class="meta">{{ auth.user?.phone || '未绑定手机号' }}</p>
      </div>
      <div class="role-switch">
        <span class="label">当前身份</span>
        <button
          class="role-btn"
          :class="{ 'is-enterprise': auth.user?.active_role === 'enterprise' }"
          :disabled="!auth.isEnterprise"
          @click="toggleActiveRole"
        >
          {{ auth.user?.active_role === 'enterprise' ? '企业' : '个人' }}
          <span v-if="auth.isEnterprise" class="hint">点击切换</span>
        </button>
      </div>
    </header>

    <section class="cards">
      <div class="card">
        <div class="card-head">
          <span class="card-title">企业认证</span>
          <span class="badge" :class="statusBadge.color">{{ statusBadge.text }}</span>
        </div>

        <p v-if="auth.user?.company" class="card-body">
          <strong>{{ auth.user.company.name }}</strong>
          <template v-if="auth.user.company.status === 'pending'">
            <br/>提交已收到，预计 1 个工作日内完成审核
          </template>
          <template v-else-if="auth.user.company.status === 'approved'">
            <br/>已通过认证，可享受对公支付等企业权益
          </template>
          <template v-else-if="auth.user.company.status === 'rejected'">
            <br/>驳回原因：{{ auth.user.company.reject_reason }}
          </template>
        </p>
        <p v-else class="card-body muted">
          完成企业认证后可使用对公转账、专票等企业级功能
        </p>

        <div class="card-actions">
          <RouterLink to="/profile/company-auth" class="link-cta">
            <template v-if="auth.user?.company">查看 / 修改</template>
            <template v-else>立即认证</template>
            →
          </RouterLink>
        </div>
      </div>

      <div class="card" v-if="auth.isAdmin">
        <div class="card-head">
          <span class="card-title">管理员后台</span>
          <span class="badge muted">admin</span>
        </div>
        <p class="card-body">商品 / 订单 / 企业认证 / 库存预警 / AI Bad Case / 死信队列 / 知识库</p>
        <div class="card-actions" style="display:flex;justify-content:flex-end">
          <RouterLink to="/admin" class="link-cta primary">进入后台 →</RouterLink>
        </div>
      </div>

      <!-- iter-23 我的登录设备 -->
      <div class="card devices-card">
        <div class="card-head">
          <span class="card-title">登录设备</span>
          <span class="badge muted">{{ devices.length }} 个</span>
        </div>
        <div v-if="devicesLoading" class="device-state">载入中…</div>
        <div v-else-if="devices.length === 0" class="device-state">无活跃设备</div>
        <ul v-else class="device-list">
          <li
            v-for="d in devices"
            :key="d.id"
            class="device-row"
            :class="{ current: d.is_current }"
          >
            <div class="device-info">
              <div class="device-name">
                {{ d.name }}
                <span v-if="d.is_current" class="current-tag">当前设备</span>
              </div>
              <div class="device-meta">
                登录 {{ formatTime(d.created_at) }}<span v-if="d.last_used_at"> · 最近活动 {{ formatTime(d.last_used_at) }}</span>
              </div>
            </div>
            <button
              class="revoke"
              :disabled="devicesActing === d.id"
              @click="revokeDevice(d)"
            >{{ d.is_current ? '退出' : '撤销' }}</button>
          </li>
        </ul>
        <div v-if="devices.filter((d) => !d.is_current).length > 0" class="card-actions">
          <button class="link-cta danger-link" :disabled="devicesActing === 'others'" @click="logoutOthers">
            登出其他设备 →
          </button>
        </div>
      </div>
    </section>

    <button class="logout" @click="doLogout">退出登录</button>
  </section>
</template>

<style scoped>
.profile {
  max-width: 880px;
  margin: 0 auto;
  padding: var(--space-section) var(--space-lg);
}

.profile-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: var(--space-xxl);
}

h1 {
  font-size: 22px;
  font-weight: 500;
  margin: 0;
}

.meta {
  color: var(--color-muted);
  margin: var(--space-xs) 0 0;
  font-size: 14px;
}

.role-switch {
  text-align: right;
}

.role-switch .label {
  display: block;
  font-size: 13px;
  color: var(--color-muted);
  margin-bottom: var(--space-xs);
}

.role-btn {
  background: var(--color-surface-strong);
  border: 1px solid var(--color-hairline);
  border-radius: var(--radius-full);
  padding: 8px 20px;
  font-size: 14px;
  font-weight: 500;
  color: var(--color-ink);
  cursor: pointer;
}

.role-btn:disabled {
  cursor: not-allowed;
  opacity: 0.7;
}

.role-btn.is-enterprise {
  background: var(--color-ink);
  color: white;
  border-color: var(--color-ink);
}

.role-btn .hint {
  margin-left: var(--space-xs);
  font-size: 12px;
  opacity: 0.7;
  font-weight: 400;
}

.cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  gap: var(--space-base);
  margin-bottom: var(--space-xl);
}

.card {
  background: var(--color-canvas);
  border: 1px solid var(--color-hairline);
  border-radius: var(--radius-md);
  padding: var(--space-lg);
}

.card-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-base);
}

.card-title {
  font-size: 16px;
  font-weight: 600;
}

.badge {
  font-size: 11px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: var(--radius-full);
  background: var(--color-surface-strong);
  color: var(--color-muted);
}

.badge.success { background: #e7f8ee; color: var(--color-success); }
.badge.warning { background: #fff5e6; color: var(--color-warning); }
.badge.error { background: #fdecec; color: var(--color-error); }

.card-body {
  font-size: 14px;
  color: var(--color-body);
  margin: 0 0 var(--space-base);
  line-height: 1.5;
}

.card-body.muted {
  color: var(--color-muted);
}

.card-actions {
  text-align: right;
}

.link-cta {
  color: var(--color-primary);
  font-weight: 500;
  font-size: 14px;
  text-decoration: none;
}
.link-cta.primary {
  background: var(--color-primary);
  color: white;
  padding: 8px 18px;
  border-radius: var(--radius-sm);
}
.link-cta.primary:hover { opacity: 0.92; }

.logout {
  margin-top: var(--space-lg);
  background: transparent;
  color: var(--color-muted);
  border: 1px solid var(--color-hairline);
  border-radius: var(--radius-sm);
  padding: 10px 24px;
  font-size: 14px;
  cursor: pointer;
}

.logout:hover {
  color: var(--color-error);
  border-color: var(--color-error);
}

/* iter-23 登录设备 */
.devices-card .device-state {
  color: var(--color-muted);
  font-size: 13px;
  padding: var(--space-base) 0;
}
.device-list {
  list-style: none;
  padding: 0;
  margin: 0;
}
.device-row {
  display: flex;
  align-items: center;
  gap: var(--space-base);
  padding: 10px 0;
  border-bottom: 1px solid var(--color-hairline-soft);
}
.device-row:last-child { border-bottom: 0; }
.device-row.current { background: rgba(0, 47, 167, 0.03); margin: 0 -8px; padding: 10px 8px; border-radius: var(--radius-sm); }
.device-info { flex: 1; min-width: 0; }
.device-name {
  font-size: 14px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 8px;
}
.current-tag {
  font-size: 11px;
  font-weight: 500;
  color: var(--color-primary);
  background: rgba(0, 47, 167, 0.1);
  padding: 1px 8px;
  border-radius: var(--radius-sm);
}
.device-meta {
  font-size: 12px;
  color: var(--color-muted);
  margin-top: 2px;
}
.revoke {
  background: transparent;
  border: 1px solid var(--color-hairline);
  color: var(--color-muted);
  border-radius: var(--radius-sm);
  padding: 4px 12px;
  font-size: 12px;
  cursor: pointer;
}
.revoke:hover { color: var(--color-error); border-color: var(--color-error); }
.revoke:disabled { opacity: 0.5; cursor: not-allowed; }

.link-cta.danger-link {
  background: transparent;
  border: none;
  color: var(--color-error);
  padding: 0;
  font-size: 14px;
  cursor: pointer;
  font-weight: 500;
}
.link-cta.danger-link:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
