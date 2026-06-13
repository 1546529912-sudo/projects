<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { adminListOrders, adminShipOrder, adminReviewVoucher, type AdminOrder } from '@/api/admin-order'

const items = ref<AdminOrder[]>([])
const loading = ref(true)
const total = ref(0)
const status = ref<string>('all')
const keyword = ref('')
const error = ref('')

const tabs = [
  { value: 'all', label: '全部' },
  { value: 'pending_payment', label: '待付款' },
  { value: 'pending_review', label: '待审凭证' },
  { value: 'pending_shipment', label: '待发货' },
  { value: 'shipped', label: '已发货' },
  { value: 'completed', label: '已完成' },
]

const STATUS_LABEL: Record<string, string> = {
  pending_payment: '待付款',
  pending_review: '待审凭证',
  pending_shipment: '待发货',
  shipped: '已发货',
  received: '已收货',
  completed: '已完成',
  cancelled: '已取消',
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const res = await adminListOrders({ status: status.value, keyword: keyword.value || undefined })
    items.value = res.data.items
    total.value = res.data.total
  } catch (e: any) {
    error.value = e?.response?.data?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

async function ship(o: AdminOrder) {
  const company = prompt('请输入物流公司（如：顺丰速运）')
  if (!company) return
  const no = prompt('请输入物流单号')
  if (!no) return
  try {
    await adminShipOrder(o.id, company, no)
    await load()
  } catch (e: any) {
    alert(e?.response?.data?.message || '发货失败')
  }
}

async function approveVoucher(o: AdminOrder) {
  if (!o.pending_voucher) return
  if (!confirm('确认通过该凭证？通过后订单将进入待发货状态')) return
  try {
    await adminReviewVoucher(o.pending_voucher.payment_id, 'approve')
    await load()
  } catch (e: any) {
    alert(e?.response?.data?.message || '操作失败')
  }
}

async function rejectVoucher(o: AdminOrder) {
  if (!o.pending_voucher) return
  const reason = prompt('请输入驳回原因（必填）')
  if (!reason) return
  try {
    await adminReviewVoucher(o.pending_voucher.payment_id, 'reject', reason)
    await load()
  } catch (e: any) {
    alert(e?.response?.data?.message || '操作失败')
  }
}

onMounted(load)
</script>

<template>
  <section class="admin">
    <header>
      <h1>订单管理</h1>
      <p class="meta">共 {{ total }} 个订单</p>
    </header>

    <div class="tabs">
      <button v-for="t in tabs" :key="t.value"
        :class="{ active: status === t.value }"
        @click="status = t.value; load()">{{ t.label }}</button>
    </div>

    <div class="toolbar">
      <input v-model.trim="keyword" placeholder="按订单号或买家手机号搜索" @keyup.enter="load" />
      <button @click="load">搜索</button>
    </div>

    <p v-if="error" class="error">{{ error }}</p>

    <div v-if="loading" class="state">载入中…</div>
    <div v-else-if="items.length === 0" class="state empty">暂无订单</div>
    <table v-else class="table">
      <thead>
        <tr>
          <th>订单号</th>
          <th>买家</th>
          <th>商品</th>
          <th>金额</th>
          <th>状态</th>
          <th>物流</th>
          <th style="min-width: 200px">操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="o in items" :key="o.id">
          <td class="mono small">{{ o.order_no }}</td>
          <td>{{ o.user?.phone || '-' }}</td>
          <td>
            <div class="name">{{ o.first_product_name }}</div>
            <div class="meta-line">共 {{ o.item_count }} 件</div>
          </td>
          <td>¥{{ o.total_amount }}</td>
          <td><span class="badge" :class="o.status">{{ STATUS_LABEL[o.status] || o.status }}</span></td>
          <td>
            <template v-if="o.tracking_no">
              <div class="mono small">{{ o.tracking_company }}</div>
              <div class="mono small">{{ o.tracking_no }}</div>
            </template>
            <template v-else>-</template>
          </td>
          <td>
            <button v-if="o.status === 'pending_shipment'" class="action ship" @click="ship(o)">发货</button>
            <template v-if="o.pending_voucher">
              <a :href="o.pending_voucher.voucher_url" target="_blank" class="action view">查看凭证</a>
              <button class="action approve" @click="approveVoucher(o)">通过</button>
              <button class="action reject" @click="rejectVoucher(o)">驳回</button>
            </template>
          </td>
        </tr>
      </tbody>
    </table>
  </section>
</template>

<style scoped>
.admin {
  max-width: 1280px;
  margin: 0 auto;
  padding: var(--space-xl) var(--space-lg);
}

header {
  margin-bottom: var(--space-lg);
}

h1 { font-size: 22px; font-weight: 500; margin: 0; }
.meta { color: var(--color-muted); font-size: 13px; margin: var(--space-xs) 0 0; }

.tabs {
  display: flex;
  gap: var(--space-xs);
  border-bottom: 1px solid var(--color-hairline-soft);
  margin-bottom: var(--space-base);
}

.tabs button {
  background: transparent;
  border: none;
  padding: var(--space-sm) var(--space-base);
  font-size: 14px;
  color: var(--color-muted);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
}

.tabs button.active {
  color: var(--color-ink);
  border-bottom-color: var(--color-ink);
  font-weight: 500;
}

.toolbar {
  display: flex;
  gap: var(--space-sm);
  margin-bottom: var(--space-base);
}

.toolbar input {
  flex: 1;
  max-width: 320px;
  height: 36px;
  border: 1px solid var(--color-hairline);
  border-radius: var(--radius-sm);
  padding: 0 12px;
  font-size: 14px;
}

.toolbar button {
  background: var(--color-ink);
  color: white;
  border: none;
  border-radius: var(--radius-sm);
  padding: 0 16px;
  cursor: pointer;
}

.error { color: var(--color-error); font-size: 13px; }

.state {
  text-align: center;
  color: var(--color-muted);
  padding: var(--space-xxl);
  background: var(--color-surface-soft);
  border-radius: var(--radius-md);
}

.table {
  width: 100%;
  border-collapse: collapse;
  background: var(--color-canvas);
  border: 1px solid var(--color-hairline);
  border-radius: var(--radius-md);
  overflow: hidden;
  font-size: 13px;
}

.table th, .table td {
  padding: var(--space-sm);
  text-align: left;
  border-bottom: 1px solid var(--color-hairline-soft);
  vertical-align: middle;
}

.table th { background: var(--color-surface-soft); font-weight: 600; }

.mono { font-family: var(--font-mono); }
.small { font-size: 12px; }

.name { font-weight: 500; }
.meta-line { color: var(--color-muted); font-size: 12px; margin-top: 2px; }

.badge {
  font-size: 11px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: var(--radius-full);
  background: var(--color-surface-strong);
  color: var(--color-muted);
}
.badge.pending_payment, .badge.pending_review, .badge.pending_shipment { background: #fff5e6; color: var(--color-warning); }
.badge.shipped { background: #e6f4ff; color: var(--color-info); }
.badge.completed { background: #e7f8ee; color: var(--color-success); }
.badge.cancelled { background: var(--color-surface-strong); color: var(--color-muted); }

.action {
  display: inline-block;
  font-size: 12px;
  padding: 4px 10px;
  margin: 2px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-hairline);
  background: var(--color-canvas);
  color: var(--color-ink);
  cursor: pointer;
  text-decoration: none;
}

.action.ship { background: var(--color-info); color: white; border: none; }
.action.approve { background: var(--color-success); color: white; border: none; }
.action.reject { background: var(--color-canvas); color: var(--color-error); border-color: var(--color-error); }
.action.view { color: var(--color-primary); }
</style>
