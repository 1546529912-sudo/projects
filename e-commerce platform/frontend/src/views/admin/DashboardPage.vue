<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { adminListStockAlerts, type StockAlert } from '@/api/admin-stock-alert'
import { adminBadCaseStats } from '@/api/admin-bad-case'
import { adminFailedJobStats } from '@/api/admin-failed-job'

const loading = ref(true)
const openCount = ref(0)
const previewAlerts = ref<StockAlert[]>([])
const unlabeledBad = ref(0)
const totalBad = ref(0)
const trainingReady = ref(0)
const failedJobs = ref(0)

async function load() {
  loading.value = true
  try {
    const [alerts, bc, fj] = await Promise.all([
      adminListStockAlerts({ status: 'open', per_page: 5 }),
      adminBadCaseStats(),
      adminFailedJobStats(),
    ])
    openCount.value = alerts.data.open_count
    previewAlerts.value = alerts.data.items
    unlabeledBad.value = bc.data.unlabeled_bad
    totalBad.value = bc.data.total_bad
    trainingReady.value = bc.data.training_ready
    failedJobs.value = fj.data.count
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <section class="admin">
    <h1>后台总览</h1>

    <div v-if="loading" class="state loading">载入中…</div>

    <div v-else class="grid">
      <RouterLink
        to="/admin/stock-alerts"
        class="card"
        :class="{ danger: openCount > 0 }"
      >
        <div class="num">{{ openCount }}</div>
        <div class="label">未处理库存预警</div>
        <div v-if="openCount > 0" class="hint">⚠️ 点击查看详情</div>
        <div v-else class="hint ok">✓ 一切正常</div>
      </RouterLink>

      <RouterLink
        to="/admin/bad-cases"
        class="card"
        :class="{ warn: unlabeledBad > 0 }"
      >
        <div class="num">{{ unlabeledBad }}</div>
        <div class="label">待标注 AI Bad Case</div>
        <div v-if="totalBad > 0" class="hint">累计差评 {{ totalBad }} · 训练就绪 <strong>{{ trainingReady }}</strong></div>
        <div v-else class="hint ok">✓ 暂无差评</div>
      </RouterLink>

      <RouterLink
        to="/admin/failed-jobs"
        class="card"
        :class="{ danger: failedJobs > 0 }"
      >
        <div class="num">{{ failedJobs }}</div>
        <div class="label">死信队列</div>
        <div v-if="failedJobs > 0" class="hint">⚠️ 需重试或排查</div>
        <div v-else class="hint ok">✓ 队列健康</div>
      </RouterLink>

      <RouterLink to="/admin/orders" class="card">
        <div class="num">→</div>
        <div class="label">订单管理</div>
      </RouterLink>

      <RouterLink to="/admin/products" class="card">
        <div class="num">→</div>
        <div class="label">商品管理</div>
      </RouterLink>

      <RouterLink to="/admin/companies" class="card">
        <div class="num">→</div>
        <div class="label">企业认证</div>
      </RouterLink>
    </div>

    <div v-if="!loading && previewAlerts.length > 0" class="preview">
      <h2>近期库存预警</h2>
      <table class="table">
        <thead>
          <tr>
            <th>SKU</th>
            <th>商品</th>
            <th>当前库存</th>
            <th>阈值</th>
            <th>触发时间</th>
            <th>Webhook</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="a in previewAlerts" :key="a.id">
            <td class="mono">{{ a.sku_code }}</td>
            <td>{{ a.product_name }}</td>
            <td class="num-cell danger-text">{{ a.current_stock }}</td>
            <td>{{ a.threshold }}</td>
            <td>{{ a.triggered_at?.slice(0, 16).replace('T', ' ') }}</td>
            <td>
              <span class="badge" :class="'wh-' + a.webhook_status">{{ a.webhook_status }}</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<style scoped>
.admin {
  max-width: 1200px;
  margin: 0 auto;
  padding: var(--space-xxl) var(--space-lg);
}
h1 {
  font-size: 22px;
  font-weight: 500;
  margin-bottom: var(--space-lg);
}
h2 {
  font-size: 16px;
  font-weight: 500;
  margin: var(--space-xxl) 0 var(--space-md);
}
.state {
  text-align: center;
  padding: var(--space-xxl);
  color: var(--color-muted);
  background: var(--color-surface-soft);
  border-radius: var(--radius-md);
}
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: var(--space-lg);
}
.card {
  background: var(--color-canvas);
  border: 1px solid var(--color-hairline);
  border-radius: var(--radius-md);
  padding: var(--space-xl);
  text-decoration: none;
  color: inherit;
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  transition: transform 0.15s, box-shadow 0.15s;
}
.card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}
.card.danger {
  border-color: var(--color-error);
  background: #fff4f4;
}
.card.warn {
  border-color: #d97706;
  background: #fffbeb;
}
.card.warn .num { color: #d97706; }
.num {
  font-size: 28px;
  font-weight: 600;
  color: var(--color-primary);
}
.card.danger .num {
  color: var(--color-error);
}
.label {
  font-size: 14px;
  color: var(--color-muted);
}
.hint {
  font-size: 12px;
  color: var(--color-muted);
}
.hint.ok {
  color: var(--color-success);
}
.preview .table {
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
.badge { padding: 2px 8px; border-radius: var(--radius-sm); font-size: 12px; font-family: var(--font-mono); }
.wh-mock_only { background: #eef; color: #336; }
.wh-sent { background: #efe; color: #363; }
.wh-failed { background: #fee; color: #933; }
.wh-pending { background: #ffd; color: #663; }
</style>
