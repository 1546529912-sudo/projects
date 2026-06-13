<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { listOrders, type OrderListItem, type OrderStatus } from '@/api/order'

const router = useRouter()
const items = ref<OrderListItem[]>([])
const total = ref(0)
const loading = ref(true)
const currentStatus = ref<OrderStatus | 'all'>('all')

const tabs: { value: OrderStatus | 'all'; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'pending_payment', label: '待付款' },
  { value: 'pending_shipment', label: '待发货' },
  { value: 'shipped', label: '已发货' },
  { value: 'completed', label: '已完成' },
  { value: 'cancelled', label: '已取消' },
]

const STATUS_LABEL: Record<string, string> = {
  pending_payment: '待付款',
  pending_review: '待审核',
  pending_shipment: '待发货',
  shipped: '已发货',
  received: '已收货',
  completed: '已完成',
  cancelled: '已取消',
  refunding: '退款中',
  refunded: '已退款',
}

async function load() {
  loading.value = true
  try {
    const res = await listOrders(currentStatus.value, 1, 20)
    items.value = res.data.items
    total.value = res.data.total
  } finally {
    loading.value = false
  }
}

function setTab(s: OrderStatus | 'all') {
  currentStatus.value = s
  load()
}

onMounted(load)
</script>

<template>
  <section class="orders">
    <h1>我的订单</h1>

    <div class="tabs">
      <button
        v-for="t in tabs"
        :key="t.value"
        :class="{ active: currentStatus === t.value }"
        @click="setTab(t.value)"
      >{{ t.label }}</button>
    </div>

    <div v-if="loading" class="state">载入中…</div>
    <div v-else-if="items.length === 0" class="state empty">
      <p>暂无订单</p>
      <button @click="router.push('/')">去逛逛</button>
    </div>

    <div v-else class="list">
      <article
        v-for="o in items"
        :key="o.id"
        class="order-card"
        @click="router.push({ name: 'order-detail', params: { id: o.id } })"
      >
        <header>
          <span class="no">订单号 {{ o.order_no }}</span>
          <span class="time">{{ o.created_at.slice(0, 16).replace('T', ' ') }}</span>
          <span class="badge" :class="o.status">{{ STATUS_LABEL[o.status] || o.status }}</span>
        </header>
        <div class="row">
          <div class="thumbs">
            <img
              v-for="(t, idx) in o.thumbs"
              :key="idx"
              :src="t || ''"
              :alt="o.first_product_name || ''"
            />
          </div>
          <div class="main">
            <p class="name">{{ o.first_product_name }}<span v-if="o.item_count > 1"> 等 {{ o.item_count }} 件</span></p>
          </div>
          <div class="amount">
            <p class="total">¥{{ o.total_amount }}</p>
            <p class="qty">共 {{ o.item_count }} 件</p>
          </div>
        </div>
      </article>
    </div>
  </section>
</template>

<style scoped>
.orders {
  max-width: 1000px;
  margin: 0 auto;
  padding: var(--space-xl) var(--space-lg);
}

h1 {
  font-size: 22px;
  font-weight: 500;
  margin: 0 0 var(--space-lg);
}

.tabs {
  display: flex;
  gap: var(--space-xs);
  border-bottom: 1px solid var(--color-hairline-soft);
  margin-bottom: var(--space-lg);
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

.state {
  text-align: center;
  color: var(--color-muted);
  padding: var(--space-section);
  background: var(--color-surface-soft);
  border-radius: var(--radius-md);
}

.state button {
  margin-top: var(--space-base);
  background: var(--color-primary);
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: var(--radius-sm);
  cursor: pointer;
}

.list {
  display: grid;
  gap: var(--space-base);
}

.order-card {
  background: var(--color-canvas);
  border: 1px solid var(--color-hairline);
  border-radius: var(--radius-md);
  padding: var(--space-base);
  cursor: pointer;
  transition: box-shadow 150ms ease;
}

.order-card:hover {
  box-shadow: var(--shadow-hover-float);
}

.order-card header {
  display: flex;
  align-items: center;
  gap: var(--space-base);
  margin-bottom: var(--space-sm);
  padding-bottom: var(--space-sm);
  border-bottom: 1px solid var(--color-hairline-soft);
}

.no {
  font-family: var(--font-mono);
  font-size: 13px;
}

.time {
  color: var(--color-muted);
  font-size: 12px;
  flex: 1;
}

.badge {
  font-size: 11px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: var(--radius-full);
  background: var(--color-surface-strong);
  color: var(--color-muted);
}

.badge.pending_payment { background: #fff5e6; color: var(--color-warning); }
.badge.pending_shipment, .badge.pending_review { background: #fff5e6; color: var(--color-warning); }
.badge.shipped { background: #e6f4ff; color: var(--color-info); }
.badge.completed { background: #e7f8ee; color: var(--color-success); }
.badge.cancelled { background: var(--color-surface-strong); color: var(--color-muted); }

.row {
  display: flex;
  align-items: center;
  gap: var(--space-base);
}

.thumbs {
  display: flex;
  gap: var(--space-xs);
}

.thumbs img {
  width: 64px;
  height: 64px;
  object-fit: cover;
  border-radius: var(--radius-sm);
}

.main {
  flex: 1;
}

.name {
  margin: 0;
  font-size: 14px;
  color: var(--color-ink);
}

.amount {
  text-align: right;
}

.total {
  color: var(--color-primary);
  font-size: 18px;
  font-weight: 600;
  margin: 0;
}

.qty {
  color: var(--color-muted);
  font-size: 12px;
  margin: 2px 0 0;
}
</style>
