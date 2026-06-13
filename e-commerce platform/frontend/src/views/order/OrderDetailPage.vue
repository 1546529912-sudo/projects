<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getOrder, cancelOrder, confirmReceipt, type OrderDetail } from '@/api/order'

const route = useRoute()
const router = useRouter()

const order = ref<OrderDetail | null>(null)
const loading = ref(true)
const cancelling = ref(false)
const error = ref('')
const now = ref(Date.now())
let tick: ReturnType<typeof setInterval> | null = null

const id = computed(() => Number(route.params.id))

/** 待付款倒计时 = 30 分钟 - 已过秒数 */
const countdown = computed(() => {
  if (!order.value || order.value.status !== 'pending_payment') return null
  const created = new Date(order.value.created_at).getTime()
  const deadline = created + 30 * 60 * 1000
  const remaining = Math.max(0, Math.floor((deadline - now.value) / 1000))
  return {
    expired: remaining === 0,
    mm: String(Math.floor(remaining / 60)).padStart(2, '0'),
    ss: String(remaining % 60).padStart(2, '0'),
  }
})

const NODE_LABEL: Record<string, string> = {
  accepted: '已揽件',
  transit: '运输中',
  dispatching: '派送中',
  delivered: '已签收',
}

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
    const res = await getOrder(id.value)
    order.value = res.data.order
  } catch (e: any) {
    error.value = e?.response?.data?.message || '订单不存在'
  } finally {
    loading.value = false
  }
}

async function doCancel() {
  if (!order.value) return
  const reason = prompt('请输入取消原因（可选）：') ?? ''
  cancelling.value = true
  try {
    const res = await cancelOrder(order.value.id, reason || undefined)
    order.value = res.data.order
  } catch (e: any) {
    alert(e?.response?.data?.message || '取消失败')
  } finally {
    cancelling.value = false
  }
}

const confirming = ref(false)
async function doConfirm() {
  if (!order.value) return
  if (!confirm('确认已收到货？')) return
  confirming.value = true
  try {
    const res = await confirmReceipt(order.value.id)
    order.value = res.data.order
  } catch (e: any) {
    alert(e?.response?.data?.message || '确认失败')
  } finally {
    confirming.value = false
  }
}

function goPay() {
  if (!order.value) return
  router.push({ name: 'payment', params: { orderId: order.value.id } })
}

onMounted(() => {
  load()
  tick = setInterval(() => { now.value = Date.now() }, 1000)
})

onUnmounted(() => {
  if (tick) clearInterval(tick)
})
</script>

<template>
  <section class="detail">
    <div v-if="loading" class="state">载入中…</div>
    <div v-else-if="!order || error" class="state">
      <p>{{ error || '订单不存在' }}</p>
      <button @click="router.push({ name: 'order-list' })">回订单列表</button>
    </div>
    <template v-else>
      <header>
        <h1>订单详情</h1>
        <span class="badge" :class="order.status">{{ STATUS_LABEL[order.status] || order.status }}</span>
      </header>

      <div class="meta">
        <p><span>订单号</span> <span class="mono">{{ order.order_no }}</span></p>
        <p><span>下单时间</span> {{ order.created_at.slice(0, 19).replace('T', ' ') }}</p>
        <p v-if="order.cancelled_at"><span>取消时间</span> {{ order.cancelled_at.slice(0, 19).replace('T', ' ') }}</p>
        <p v-if="order.cancel_reason"><span>取消原因</span> {{ order.cancel_reason }}</p>
      </div>

      <section class="block">
        <h2>收货地址</h2>
        <p class="addr">
          <strong>{{ order.shipping_address.receiver_name }}</strong>
          <span class="phone">{{ order.shipping_address.receiver_phone }}</span>
        </p>
        <p class="addr-detail">
          {{ order.shipping_address.province }}
          {{ order.shipping_address.city }}
          {{ order.shipping_address.district }}
          {{ order.shipping_address.detail }}
        </p>
      </section>

      <!-- 待付款倒计时 -->
      <section
        v-if="order.status === 'pending_payment' && countdown"
        class="block countdown-bar"
        :class="{ expired: countdown.expired }"
      >
        <span v-if="!countdown.expired">
          ⏰ 请在 <strong>{{ countdown.mm }}:{{ countdown.ss }}</strong> 内完成支付，否则订单自动取消并释放库存
        </span>
        <span v-else>
          ⏰ 已超过 30 分钟未支付，订单将在下次定时任务执行时自动取消
        </span>
      </section>

      <!-- 物流时间线 -->
      <section v-if="order.tracks && order.tracks.length > 0" class="block">
        <h2>物流轨迹 <span class="track-meta">{{ order.tracking_company }} · {{ order.tracking_no }}</span></h2>
        <ol class="timeline">
          <li v-for="(t, idx) in order.tracks" :key="t.id" :class="{ latest: idx === 0, node: true }">
            <div class="dot" :class="t.node"></div>
            <div class="track-content">
              <div class="track-head">
                <span class="node-label">{{ NODE_LABEL[t.node] || t.node }}</span>
                <span class="track-time">{{ t.occurred_at.slice(0, 19).replace('T', ' ') }}</span>
              </div>
              <div class="track-desc">{{ t.description }}</div>
              <div v-if="t.location" class="track-loc">📍 {{ t.location }}</div>
            </div>
          </li>
        </ol>
      </section>

      <section class="block">
        <h2>商品清单</h2>
        <table>
          <thead><tr><th>商品</th><th>单价</th><th>数量</th><th>小计</th></tr></thead>
          <tbody>
            <tr v-for="i in order.items" :key="i.id">
              <td class="prod">
                <img v-if="i.product_image" :src="i.product_image" />
                <div>
                  <div class="name">{{ i.product_name }}</div>
                  <div class="mono small">{{ i.sku_code }}</div>
                </div>
              </td>
              <td>¥{{ i.unit_price }}</td>
              <td>×{{ i.qty }}</td>
              <td class="sub">¥{{ i.total_price }}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section class="block">
        <h2>价格明细</h2>
        <div class="amount-row"><span>商品总价</span><span>¥{{ order.product_amount }}</span></div>
        <div class="amount-row"><span>运费</span><span>¥{{ order.shipping_fee }}</span></div>
        <div class="amount-row grand"><span>{{ order.status === 'pending_payment' ? '应付' : '实付' }}</span><span>¥{{ order.total_amount }}</span></div>
        <p v-if="order.remark" class="remark">备注：{{ order.remark }}</p>
      </section>

      <footer class="actions">
        <button class="ghost" @click="router.push({ name: 'order-list' })">返回列表</button>
        <button
          v-if="order.status === 'pending_payment'"
          class="warn"
          :disabled="cancelling"
          @click="doCancel"
        >{{ cancelling ? '取消中…' : '取消订单' }}</button>
        <button
          v-if="order.status === 'pending_payment'"
          class="primary"
          @click="goPay"
        >去支付</button>
        <button
          v-if="order.status === 'shipped'"
          class="primary"
          :disabled="confirming"
          @click="doConfirm"
        >{{ confirming ? '处理中…' : '确认收货' }}</button>
      </footer>
    </template>
  </section>
</template>

<style scoped>
.detail {
  max-width: 880px;
  margin: 0 auto;
  padding: var(--space-xl) var(--space-lg);
}

.state {
  text-align: center;
  padding: var(--space-section);
  color: var(--color-muted);
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

header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-lg);
}

h1 {
  font-size: 22px;
  font-weight: 500;
  margin: 0;
}

.badge {
  font-size: 13px;
  font-weight: 600;
  padding: 6px 14px;
  border-radius: var(--radius-full);
  background: var(--color-surface-strong);
  color: var(--color-muted);
}
.badge.pending_payment { background: #fff5e6; color: var(--color-warning); }
.badge.pending_shipment { background: #fff5e6; color: var(--color-warning); }
.badge.shipped { background: #e6f4ff; color: var(--color-info); }
.badge.completed { background: #e7f8ee; color: var(--color-success); }
.badge.cancelled { background: var(--color-surface-strong); color: var(--color-muted); }

.meta {
  background: var(--color-surface-soft);
  padding: var(--space-base);
  border-radius: var(--radius-sm);
  font-size: 13px;
  margin-bottom: var(--space-base);
}

.meta p {
  margin: 4px 0;
  color: var(--color-body);
}

.meta p span:first-child {
  display: inline-block;
  width: 80px;
  color: var(--color-muted);
}

.mono { font-family: var(--font-mono); }
.small { font-size: 12px; color: var(--color-muted); margin-top: 2px; }

.block {
  background: var(--color-canvas);
  border: 1px solid var(--color-hairline);
  border-radius: var(--radius-md);
  padding: var(--space-lg);
  margin-bottom: var(--space-base);
}

.block h2 {
  font-size: 15px;
  font-weight: 600;
  margin: 0 0 var(--space-base);
}

.addr {
  font-size: 15px;
  margin: 0;
  display: flex;
  gap: var(--space-sm);
  align-items: center;
}

.phone {
  color: var(--color-body);
  font-family: var(--font-mono);
  font-size: 13px;
}

.addr-detail {
  color: var(--color-muted);
  font-size: 13px;
  margin: var(--space-xs) 0 0;
}

table { width: 100%; border-collapse: collapse; font-size: 14px; }
th, td { padding: var(--space-sm); text-align: left; border-bottom: 1px solid var(--color-hairline-soft); }
th { font-size: 12px; color: var(--color-muted); font-weight: 600; }

.prod { display: flex; gap: var(--space-sm); align-items: center; }
.prod img { width: 48px; height: 48px; border-radius: var(--radius-sm); object-fit: cover; }
.name { font-weight: 500; }
.sub { color: var(--color-primary); font-weight: 600; }

.amount-row {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
  padding: 4px 0;
  color: var(--color-body);
}

.amount-row.grand {
  border-top: 1px solid var(--color-hairline-soft);
  padding-top: var(--space-sm);
  margin-top: var(--space-sm);
  font-size: 16px;
}

.amount-row.grand span:last-child {
  color: var(--color-primary);
  font-weight: 700;
  font-size: 22px;
}

.remark {
  margin: var(--space-base) 0 0;
  padding: var(--space-sm);
  background: var(--color-surface-soft);
  border-radius: var(--radius-sm);
  font-size: 13px;
  color: var(--color-muted);
}

/* 待付款倒计时 banner */
.countdown-bar {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  background: #fff5e6;
  border: 1px solid #ffcc80;
  color: var(--color-warning);
  font-size: 14px;
}

.countdown-bar strong {
  color: var(--color-error);
  font-family: var(--font-mono);
  font-size: 18px;
  font-weight: 700;
  margin: 0 var(--space-xs);
}

.countdown-bar.expired {
  background: #fdecec;
  border-color: var(--color-error);
  color: var(--color-error);
}

/* 物流时间线 */
.track-meta {
  font-size: 12px;
  color: var(--color-muted);
  font-weight: 400;
  margin-left: var(--space-sm);
  font-family: var(--font-mono);
}

.timeline {
  list-style: none;
  padding: var(--space-sm) 0 0;
  margin: 0;
  position: relative;
}

.timeline::before {
  content: '';
  position: absolute;
  left: 11px;
  top: var(--space-sm);
  bottom: var(--space-sm);
  width: 2px;
  background: var(--color-hairline);
}

.timeline .node {
  position: relative;
  padding-left: var(--space-xxl);
  padding-bottom: var(--space-base);
}

.timeline .node:last-child {
  padding-bottom: 0;
}

.timeline .dot {
  position: absolute;
  left: 4px;
  top: 4px;
  width: 16px;
  height: 16px;
  border-radius: var(--radius-full);
  background: var(--color-hairline);
  border: 3px solid var(--color-canvas);
  box-shadow: 0 0 0 2px var(--color-hairline);
}

.timeline .node.latest .dot {
  background: var(--color-primary);
  box-shadow: 0 0 0 2px var(--color-primary);
}

.timeline .dot.delivered {
  background: var(--color-success);
  box-shadow: 0 0 0 2px var(--color-success);
}

.track-content {
  font-size: 13px;
}

.track-head {
  display: flex;
  align-items: baseline;
  gap: var(--space-sm);
  margin-bottom: 2px;
}

.node-label {
  font-weight: 600;
  color: var(--color-ink);
  font-size: 14px;
}

.timeline .node.latest .node-label {
  color: var(--color-primary);
}

.track-time {
  color: var(--color-muted);
  font-size: 12px;
  font-family: var(--font-mono);
}

.track-desc {
  color: var(--color-body);
  line-height: 1.5;
}

.track-loc {
  color: var(--color-muted);
  font-size: 12px;
  margin-top: 2px;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-sm);
  margin-top: var(--space-lg);
}

.ghost {
  background: var(--color-canvas);
  border: 1px solid var(--color-hairline);
  border-radius: var(--radius-sm);
  padding: 10px 20px;
  font-size: 14px;
  cursor: pointer;
}

.warn {
  background: var(--color-canvas);
  border: 1px solid var(--color-error);
  border-radius: var(--radius-sm);
  padding: 10px 20px;
  color: var(--color-error);
  font-size: 14px;
  cursor: pointer;
}

.primary {
  background: var(--color-primary);
  color: white;
  border: none;
  padding: 10px 24px;
  border-radius: var(--radius-sm);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}

.primary:hover { background: var(--color-primary-active); }
</style>
