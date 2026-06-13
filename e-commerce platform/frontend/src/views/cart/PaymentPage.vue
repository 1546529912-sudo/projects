<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getOrder, type OrderDetail } from '@/api/order'
import {
  initiatePayment, mockPaymentSuccess, uploadVoucher,
  type PaymentMethod, type InitiateResponse,
} from '@/api/payment'

const route = useRoute()
const router = useRouter()

const orderId = Number(route.params.orderId)

const order = ref<OrderDetail | null>(null)
const loading = ref(true)
const method = ref<PaymentMethod>('wechat')
const initiated = ref<InitiateResponse | null>(null)
const submitting = ref(false)
const uploading = ref(false)
const message = ref('')
const messageType = ref<'info' | 'error' | 'success'>('info')

async function load() {
  loading.value = true
  try {
    const res = await getOrder(orderId)
    order.value = res.data.order
    if (order.value.status !== 'pending_payment' && order.value.status !== 'pending_review') {
      // 已支付或非待付状态，跳订单详情
      router.replace({ name: 'order-detail', params: { id: orderId } })
    }
  } catch {
    message.value = '订单不存在'
    messageType.value = 'error'
  } finally {
    loading.value = false
  }
}

async function startPay() {
  message.value = ''
  submitting.value = true
  try {
    const res = await initiatePayment({ order_id: orderId, method: method.value })
    initiated.value = res.data
  } catch (e: any) {
    message.value = e?.response?.data?.message || '发起支付失败'
    messageType.value = 'error'
  } finally {
    submitting.value = false
  }
}

async function mockSuccess() {
  if (!initiated.value) return
  submitting.value = true
  try {
    await mockPaymentSuccess(initiated.value.payment.id)
    message.value = '支付成功！正在跳转订单详情...'
    messageType.value = 'success'
    setTimeout(() => router.replace({ name: 'order-detail', params: { id: orderId } }), 1000)
  } catch (e: any) {
    message.value = e?.response?.data?.message || '操作失败'
    messageType.value = 'error'
  } finally {
    submitting.value = false
  }
}

async function onFile(e: Event) {
  if (!initiated.value) return
  const f = (e.target as HTMLInputElement).files?.[0]
  if (!f) return
  if (f.size > 5 * 1024 * 1024) {
    message.value = '文件大小不得超过 5MB'
    messageType.value = 'error'
    return
  }
  uploading.value = true
  message.value = ''
  try {
    await uploadVoucher(initiated.value.payment.id, f)
    message.value = '凭证已上传，等待管理员审核（通常 1 个工作日内）'
    messageType.value = 'success'
    setTimeout(() => router.replace({ name: 'order-detail', params: { id: orderId } }), 1500)
  } catch (e: any) {
    message.value = e?.response?.data?.message || '上传失败'
    messageType.value = 'error'
  } finally {
    uploading.value = false
  }
}

onMounted(load)
</script>

<template>
  <section class="pay">
    <h1>订单支付</h1>

    <div v-if="loading" class="state">载入中…</div>

    <template v-else-if="order">
      <div class="order-meta">
        <p><span>订单号</span> <span class="mono">{{ order.order_no }}</span></p>
        <p><span>应付金额</span> <span class="amount">¥{{ order.total_amount }}</span></p>
      </div>

      <p v-if="message" class="msg" :class="messageType">{{ message }}</p>

      <!-- 第一步：选支付方式 -->
      <section v-if="!initiated" class="step">
        <h2>选择支付方式</h2>
        <div class="methods">
          <label :class="{ active: method === 'wechat' }">
            <input type="radio" value="wechat" v-model="method" />
            <div>
              <strong>💚 微信支付</strong>
              <small>扫码支付（mock 通道）</small>
            </div>
          </label>
          <label :class="{ active: method === 'alipay' }">
            <input type="radio" value="alipay" v-model="method" />
            <div>
              <strong>💙 支付宝</strong>
              <small>扫码支付（mock 通道）</small>
            </div>
          </label>
          <label :class="{ active: method === 'bank_transfer' }">
            <input type="radio" value="bank_transfer" v-model="method" />
            <div>
              <strong>🏦 对公银行转账</strong>
              <small>线下转账后上传凭证</small>
            </div>
          </label>
        </div>
        <button class="primary" :disabled="submitting" @click="startPay">
          {{ submitting ? '提交中…' : '下一步' }}
        </button>
      </section>

      <!-- 第二步：在线支付（mock）-->
      <section v-else-if="initiated.qr_code_text" class="step pay-online">
        <h2>{{ method === 'wechat' ? '微信扫码支付' : '支付宝扫码支付' }}</h2>
        <div class="qr-box">
          <div class="qr-placeholder">
            <div class="qr-pattern">
              <div v-for="i in 64" :key="i" class="qr-cell" :class="{ on: (i * 7) % 3 === 0 }"></div>
            </div>
            <p class="mock-tip">⚠️ 这是 mock 支付二维码<br/>实际接入需配置微信/支付宝商户号</p>
          </div>
          <p class="amount-line">应付 <strong>¥{{ order.total_amount }}</strong></p>
          <button class="success" :disabled="submitting" @click="mockSuccess">
            {{ submitting ? '处理中…' : '✓ 模拟扫码成功' }}
          </button>
        </div>
      </section>

      <!-- 第二步：对公转账 -->
      <section v-else-if="initiated.bank_account" class="step pay-bank">
        <h2>对公银行转账</h2>
        <div class="bank-info">
          <p><span>收款户名</span> <strong>{{ initiated.bank_account.name }}</strong></p>
          <p><span>开户行</span> <strong>{{ initiated.bank_account.bank }}</strong></p>
          <p><span>账号</span> <strong class="mono">{{ initiated.bank_account.account_no }}</strong></p>
          <p><span>金额</span> <strong class="amount">¥{{ order.total_amount }}</strong></p>
          <p class="tip">⚠️ 请使用企业账户转账，并在备注中注明订单号 <span class="mono">{{ order.order_no }}</span></p>
        </div>
        <div class="upload-zone">
          <h3>上传转账凭证</h3>
          <input type="file" accept="image/jpeg,image/png,application/pdf" @change="onFile" :disabled="uploading" />
          <p class="hint">支持 JPG / PNG / PDF，≤ 5MB</p>
        </div>
      </section>
    </template>
  </section>
</template>

<style scoped>
.pay {
  max-width: 720px;
  margin: 0 auto;
  padding: var(--space-xl) var(--space-lg);
}

h1 {
  font-size: 22px;
  font-weight: 500;
  margin: 0 0 var(--space-lg);
}

h2 {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 var(--space-base);
}

.state {
  text-align: center;
  padding: var(--space-section);
  color: var(--color-muted);
}

.order-meta {
  background: var(--color-surface-soft);
  padding: var(--space-base);
  border-radius: var(--radius-sm);
  margin-bottom: var(--space-base);
}

.order-meta p {
  margin: 4px 0;
  display: flex;
  justify-content: space-between;
}

.order-meta span:first-child {
  color: var(--color-muted);
  font-size: 13px;
}

.amount {
  color: var(--color-primary);
  font-weight: 700;
  font-size: 18px;
}

.mono { font-family: var(--font-mono); }

.msg {
  padding: var(--space-sm) var(--space-base);
  border-radius: var(--radius-sm);
  font-size: 13px;
  margin-bottom: var(--space-base);
}

.msg.info { background: var(--color-surface-soft); color: var(--color-body); }
.msg.error { background: #fdecec; color: var(--color-error); }
.msg.success { background: #e7f8ee; color: var(--color-success); }

.step {
  background: var(--color-canvas);
  border: 1px solid var(--color-hairline);
  border-radius: var(--radius-md);
  padding: var(--space-lg);
}

.methods {
  display: grid;
  gap: var(--space-sm);
  margin-bottom: var(--space-lg);
}

.methods label {
  display: flex;
  gap: var(--space-base);
  padding: var(--space-base);
  border: 1px solid var(--color-hairline);
  border-radius: var(--radius-sm);
  cursor: pointer;
  align-items: center;
}

.methods label.active {
  border-color: var(--color-primary);
  background: var(--color-primary-tint);
}

.methods strong { display: block; font-size: 15px; }
.methods small { color: var(--color-muted); font-size: 12px; }

.primary {
  width: 100%;
  height: 48px;
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: var(--radius-sm);
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
}
.primary:disabled { background: var(--color-primary-disabled); cursor: not-allowed; }
.primary:hover:not(:disabled) { background: var(--color-primary-active); }

.success {
  width: 100%;
  height: 48px;
  background: var(--color-success);
  color: white;
  border: none;
  border-radius: var(--radius-sm);
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
}

.qr-box {
  text-align: center;
}

.qr-placeholder {
  display: inline-block;
  padding: var(--space-base);
  border: 1px solid var(--color-hairline);
  border-radius: var(--radius-sm);
  margin-bottom: var(--space-base);
}

.qr-pattern {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 2px;
  width: 200px;
  height: 200px;
  margin: 0 auto;
}

.qr-cell {
  background: var(--color-canvas);
  border: 1px solid var(--color-hairline-soft);
}

.qr-cell.on {
  background: var(--color-ink);
  border-color: var(--color-ink);
}

.mock-tip {
  color: var(--color-warning);
  font-size: 12px;
  margin: var(--space-base) 0 0;
  line-height: 1.4;
}

.amount-line {
  font-size: 14px;
  margin: var(--space-base) 0;
}

.amount-line strong {
  color: var(--color-primary);
  font-size: 20px;
}

/* 对公 */
.bank-info p {
  display: flex;
  justify-content: space-between;
  margin: var(--space-xs) 0;
  font-size: 14px;
}

.bank-info span:first-child {
  color: var(--color-muted);
}

.tip {
  background: #fff5e6;
  color: var(--color-warning);
  padding: var(--space-sm);
  border-radius: var(--radius-sm);
  margin-top: var(--space-base) !important;
  display: block !important;
  font-size: 13px;
  line-height: 1.5;
}

.upload-zone {
  margin-top: var(--space-lg);
  padding: var(--space-lg);
  background: var(--color-surface-soft);
  border-radius: var(--radius-sm);
  border: 1px dashed var(--color-hairline);
}

.upload-zone h3 {
  font-size: 14px;
  font-weight: 600;
  margin: 0 0 var(--space-sm);
}

.upload-zone input {
  display: block;
  font-size: 14px;
}

.hint {
  color: var(--color-muted);
  font-size: 12px;
  margin: var(--space-sm) 0 0;
}
</style>
