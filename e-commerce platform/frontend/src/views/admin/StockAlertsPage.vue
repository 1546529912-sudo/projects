<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { adminListStockAlerts, adminResolveStockAlert, type StockAlert } from '@/api/admin-stock-alert'

type Status = 'open' | 'resolved' | 'all'
const status = ref<Status>('open')
const items = ref<StockAlert[]>([])
const loading = ref(true)
const resolving = ref<number | null>(null)
const openCount = ref(0)
const error = ref('')

async function load() {
  loading.value = true
  error.value = ''
  try {
    const r = await adminListStockAlerts({ status: status.value, per_page: 50 })
    items.value = r.data.items
    openCount.value = r.data.open_count
  } catch (e: any) {
    error.value = e?.response?.data?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

async function resolve(id: number) {
  resolving.value = id
  try {
    await adminResolveStockAlert(id)
    await load()
  } catch (e: any) {
    error.value = e?.response?.data?.message || '操作失败'
  } finally {
    resolving.value = null
  }
}

function switchTab(s: Status) {
  status.value = s
  load()
}

onMounted(load)
</script>

<template>
  <section class="admin">
    <header class="head">
      <h1>库存预警</h1>
      <span class="open-badge" v-if="openCount > 0">⚠️ {{ openCount }} 个 SKU 待处理</span>
    </header>

    <div class="tabs">
      <button :class="{ active: status === 'open' }" @click="switchTab('open')">未处理</button>
      <button :class="{ active: status === 'resolved' }" @click="switchTab('resolved')">已处理</button>
      <button :class="{ active: status === 'all' }" @click="switchTab('all')">全部</button>
    </div>

    <p v-if="error" class="error">{{ error }}</p>

    <div v-if="loading" class="state loading">载入中…</div>
    <div v-else-if="items.length === 0" class="state empty">无记录</div>
    <table v-else class="table">
      <thead>
        <tr>
          <th>触发时间</th>
          <th>SKU</th>
          <th>商品</th>
          <th>当前库存</th>
          <th>阈值</th>
          <th>状态</th>
          <th>Webhook</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="a in items" :key="a.id">
          <td>{{ a.triggered_at?.slice(0, 16).replace('T', ' ') }}</td>
          <td class="mono">{{ a.sku_code }}</td>
          <td>{{ a.product_name }}</td>
          <td class="num-cell danger-text">{{ a.current_stock }}</td>
          <td>{{ a.threshold }}</td>
          <td>
            <span class="badge" :class="'st-' + a.status">{{ a.status }}</span>
          </td>
          <td>
            <span class="badge" :class="'wh-' + a.webhook_status"
                  :title="(a.webhook_response || '') + (a.webhook_attempts > 0 ? `\n${a.webhook_attempts} 次尝试` : '')">
              {{ a.webhook_status }}<span v-if="a.webhook_attempts > 1" class="attempts">×{{ a.webhook_attempts }}</span>
            </span>
          </td>
          <td>
            <button
              v-if="a.status === 'open'"
              class="resolve"
              :disabled="resolving === a.id"
              @click="resolve(a.id)"
            >标记已处理</button>
            <span v-else class="muted">{{ a.resolved_at?.slice(0, 16).replace('T', ' ') }}</span>
          </td>
        </tr>
      </tbody>
    </table>
  </section>
</template>

<style scoped>
.admin {
  max-width: 1200px;
  margin: 0 auto;
  padding: var(--space-xxl) var(--space-lg);
}
.head {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  margin-bottom: var(--space-lg);
}
h1 { font-size: 22px; font-weight: 500; margin: 0; }
.open-badge {
  background: var(--color-error);
  color: white;
  padding: 4px 12px;
  border-radius: var(--radius-sm);
  font-size: 13px;
}
.tabs {
  display: flex;
  gap: var(--space-xs);
  margin-bottom: var(--space-md);
}
.tabs button {
  background: var(--color-canvas);
  border: 1px solid var(--color-hairline);
  padding: 6px 14px;
  font-size: 13px;
  cursor: pointer;
  border-radius: var(--radius-sm);
}
.tabs button.active {
  background: var(--color-primary);
  color: white;
  border-color: var(--color-primary);
}
.state {
  text-align: center;
  padding: var(--space-xxl);
  color: var(--color-muted);
  background: var(--color-surface-soft);
  border-radius: var(--radius-md);
}
.error { color: var(--color-error); margin-bottom: var(--space-base); }
.table {
  width: 100%;
  border-collapse: collapse;
  background: var(--color-canvas);
  border: 1px solid var(--color-hairline);
  border-radius: var(--radius-md);
  overflow: hidden;
}
.table th, .table td {
  padding: var(--space-md);
  text-align: left;
  border-bottom: 1px solid var(--color-hairline-soft);
  font-size: 14px;
}
.table th { background: var(--color-surface-soft); font-weight: 600; }
.mono { font-family: var(--font-mono); font-size: 13px; }
.num-cell { text-align: right; }
.danger-text { color: var(--color-error); font-weight: 600; }
.muted { color: var(--color-muted); font-size: 13px; }
.badge { padding: 2px 8px; border-radius: var(--radius-sm); font-size: 12px; font-family: var(--font-mono); }
.st-open { background: #fee; color: #933; }
.st-resolved { background: #efe; color: #363; }
.wh-mock_only { background: #eef; color: #336; }
.wh-sent { background: #efe; color: #363; }
.wh-failed { background: #fee; color: #933; }
.wh-pending { background: #ffd; color: #663; }
.attempts { margin-left: 4px; opacity: 0.7; font-weight: 600; }
.resolve {
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: var(--radius-sm);
  padding: 6px 14px;
  font-size: 13px;
  cursor: pointer;
}
.resolve:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
