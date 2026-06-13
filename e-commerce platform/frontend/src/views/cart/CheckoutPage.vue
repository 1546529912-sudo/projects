<script setup lang="ts">
import { onMounted, ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useCartStore } from '@/stores/cart'
import { listAddresses, createAddress, type Address, type AddressPayload } from '@/api/address'
import { createOrder } from '@/api/order'

const cart = useCartStore()
const router = useRouter()

const addresses = ref<Address[]>([])
const selectedAddressId = ref<number | null>(null)
const shippingMethod = ref<'standard' | 'express'>('standard')
const remark = ref('')
const submitting = ref(false)
const error = ref('')
const loading = ref(true)

const showAddressForm = ref(false)
const newAddress = reactive<AddressPayload>({
  receiver_name: '',
  receiver_phone: '',
  province: '',
  city: '',
  district: '',
  detail: '',
  is_default: false,
})

async function loadAddresses() {
  const res = await listAddresses()
  addresses.value = res.data.items
  const def = addresses.value.find((a) => a.is_default)
  selectedAddressId.value = def?.id ?? addresses.value[0]?.id ?? null
  if (!selectedAddressId.value) showAddressForm.value = true
}

async function saveNewAddress() {
  if (!newAddress.receiver_name || !newAddress.receiver_phone || !newAddress.province
      || !newAddress.city || !newAddress.district || !newAddress.detail) {
    error.value = '请完整填写地址信息'
    return
  }
  try {
    const res = await createAddress(newAddress)
    addresses.value.unshift(res.data.address)
    selectedAddressId.value = res.data.address.id
    showAddressForm.value = false
    Object.assign(newAddress, {
      receiver_name: '', receiver_phone: '',
      province: '', city: '', district: '', detail: '', is_default: false,
    })
    error.value = ''
  } catch (e: any) {
    error.value = e?.response?.data?.message || '保存地址失败'
  }
}

async function submitOrder() {
  error.value = ''
  if (!selectedAddressId.value) {
    error.value = '请选择收货地址'
    return
  }
  if (cart.totals.selected_count === 0) {
    error.value = '购物车没有勾选商品'
    return
  }
  submitting.value = true
  try {
    const res = await createOrder({
      address_id: selectedAddressId.value,
      shipping_method: shippingMethod.value,
      remark: remark.value || undefined,
    })
    await cart.refresh()
    router.replace({ name: 'order-detail', params: { id: res.data.order.id } })
  } catch (e: any) {
    error.value = e?.response?.data?.message || '提交订单失败'
  } finally {
    submitting.value = false
  }
}

onMounted(async () => {
  try {
    await Promise.all([cart.refresh(), loadAddresses()])
  } finally {
    loading.value = false
  }
})

function selectedItems() {
  return cart.items.filter((i) => i.selected && !i.invalid && !i.insufficient)
}
</script>

<template>
  <section class="checkout">
    <h1>确认订单</h1>

    <div v-if="loading" class="state">载入中…</div>

    <template v-else>
      <!-- 地址 -->
      <div class="section">
        <h2>收货地址</h2>
        <div v-if="addresses.length > 0" class="addr-list">
          <label v-for="a in addresses" :key="a.id" class="addr">
            <input type="radio" :value="a.id" v-model="selectedAddressId" />
            <div>
              <div class="addr-line">
                <strong>{{ a.receiver_name }}</strong>
                <span class="phone">{{ a.receiver_phone }}</span>
                <span v-if="a.is_default" class="default">默认</span>
              </div>
              <div class="addr-detail">{{ a.province }} {{ a.city }} {{ a.district }} {{ a.detail }}</div>
            </div>
          </label>
        </div>

        <button v-if="!showAddressForm" class="ghost" @click="showAddressForm = true">+ 新建地址</button>

        <div v-if="showAddressForm" class="addr-form">
          <div class="row">
            <input v-model.trim="newAddress.receiver_name" placeholder="收件人" />
            <input v-model.trim="newAddress.receiver_phone" placeholder="手机号" maxlength="11" />
          </div>
          <div class="row">
            <input v-model.trim="newAddress.province" placeholder="省" />
            <input v-model.trim="newAddress.city" placeholder="市" />
            <input v-model.trim="newAddress.district" placeholder="区/县" />
          </div>
          <input v-model.trim="newAddress.detail" placeholder="详细地址（街道、楼号、门牌号）" />
          <label class="check">
            <input type="checkbox" v-model="newAddress.is_default" />
            <span>设为默认</span>
          </label>
          <div class="row" style="justify-content: flex-end; gap: var(--space-sm)">
            <button class="ghost" @click="showAddressForm = false">取消</button>
            <button class="primary" @click="saveNewAddress">保存地址</button>
          </div>
        </div>
      </div>

      <!-- 商品 -->
      <div class="section">
        <h2>商品清单</h2>
        <table class="items">
          <thead>
            <tr><th>商品</th><th>单价</th><th>数量</th><th>小计</th></tr>
          </thead>
          <tbody>
            <tr v-for="i in selectedItems()" :key="i.id">
              <td class="prod">
                <img v-if="i.main_image_url" :src="i.main_image_url" class="thumb" />
                <div>
                  <div class="name">{{ i.product_name }}</div>
                  <div class="model">{{ i.product_model }}</div>
                </div>
              </td>
              <td>¥{{ i.unit_price }}</td>
              <td>×{{ i.qty }}</td>
              <td class="sub">¥{{ i.subtotal }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 配送方式 -->
      <div class="section">
        <h2>配送方式</h2>
        <label class="option">
          <input type="radio" value="standard" v-model="shippingMethod" />
          <span>标准物流（3-5 天）¥10.00</span>
        </label>
        <label class="option disabled">
          <input type="radio" value="express" disabled />
          <span>加急物流（1-2 天）+¥50.00 — 暂未开放</span>
        </label>
      </div>

      <!-- 备注 -->
      <div class="section">
        <h2>备注（可选）</h2>
        <textarea v-model="remark" rows="3" maxlength="200"
          placeholder="如有特殊配送要求请留言（≤200 字）"></textarea>
      </div>

      <!-- 价格 + 提交 -->
      <footer class="bottom-bar">
        <div class="prices">
          <p>商品 ¥{{ cart.totals.product_amount }}</p>
          <p>运费 ¥{{ cart.totals.shipping_fee }}</p>
          <p class="total">应付：<span>¥{{ cart.totals.total_amount }}</span></p>
        </div>
        <p v-if="error" class="error">{{ error }}</p>
        <button class="primary big" :disabled="submitting" @click="submitOrder">
          {{ submitting ? '提交中…' : '提交订单' }}
        </button>
      </footer>
    </template>
  </section>
</template>

<style scoped>
.checkout {
  max-width: 980px;
  margin: 0 auto;
  padding: var(--space-xl) var(--space-lg) calc(var(--space-section) * 2);
}

h1 {
  font-size: 22px;
  font-weight: 500;
  margin: 0 0 var(--space-lg);
}

.section {
  background: var(--color-canvas);
  border: 1px solid var(--color-hairline);
  border-radius: var(--radius-md);
  padding: var(--space-lg);
  margin-bottom: var(--space-base);
}

.section h2 {
  font-size: 15px;
  font-weight: 600;
  margin: 0 0 var(--space-base);
}

.state {
  text-align: center;
  padding: var(--space-section);
  color: var(--color-muted);
}

/* 地址 */
.addr-list {
  display: grid;
  gap: var(--space-sm);
  margin-bottom: var(--space-base);
}

.addr {
  display: flex;
  gap: var(--space-base);
  align-items: flex-start;
  padding: var(--space-base);
  border: 1px solid var(--color-hairline);
  border-radius: var(--radius-sm);
  cursor: pointer;
}

.addr input[type="radio"]:checked + div {
  color: var(--color-primary);
}

.addr:has(input:checked) {
  border-color: var(--color-primary);
  background: var(--color-primary-tint);
}

.addr-line {
  font-size: 15px;
  display: flex;
  gap: var(--space-sm);
  align-items: center;
}

.phone {
  color: var(--color-body);
  font-family: var(--font-mono);
  font-size: 13px;
}

.default {
  background: var(--color-primary);
  color: white;
  padding: 2px 8px;
  border-radius: var(--radius-full);
  font-size: 10px;
  font-weight: 600;
}

.addr-detail {
  color: var(--color-muted);
  font-size: 13px;
  margin-top: 2px;
}

.addr-form {
  background: var(--color-surface-soft);
  padding: var(--space-base);
  border-radius: var(--radius-sm);
  margin-top: var(--space-sm);
  display: grid;
  gap: var(--space-sm);
}

.addr-form input {
  height: 40px;
  border: 1px solid var(--color-hairline);
  border-radius: var(--radius-sm);
  padding: 0 12px;
  font-size: 14px;
}

.addr-form .row {
  display: flex;
  gap: var(--space-sm);
}

.addr-form .row input { flex: 1; }

.check {
  font-size: 13px;
  color: var(--color-muted);
  display: flex;
  align-items: center;
  gap: var(--space-xs);
}

/* 商品列表 */
.items {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.items th, .items td {
  padding: var(--space-sm);
  text-align: left;
  border-bottom: 1px solid var(--color-hairline-soft);
}

.items th { font-size: 13px; color: var(--color-muted); }

.prod { display: flex; gap: var(--space-sm); align-items: center; }
.thumb { width: 48px; height: 48px; border-radius: var(--radius-sm); object-fit: cover; }
.name { font-weight: 500; }
.model { font-family: var(--font-mono); font-size: 12px; color: var(--color-muted); }
.sub { color: var(--color-primary); font-weight: 600; }

/* 选项 */
.option {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm) 0;
  font-size: 14px;
}

.option.disabled {
  color: var(--color-muted-soft);
}

textarea {
  width: 100%;
  border: 1px solid var(--color-hairline);
  border-radius: var(--radius-sm);
  padding: var(--space-sm);
  font-family: inherit;
  font-size: 14px;
  resize: vertical;
}

/* 底栏 */
.bottom-bar {
  background: var(--color-canvas);
  border: 1px solid var(--color-hairline);
  border-radius: var(--radius-md);
  padding: var(--space-lg);
  display: flex;
  flex-direction: column;
  gap: var(--space-base);
  align-items: flex-end;
  position: sticky;
  bottom: 0;
}

.prices {
  font-size: 14px;
  color: var(--color-body);
  text-align: right;
}

.prices p { margin: var(--space-xxs) 0; }

.total {
  font-size: 16px;
  margin-top: var(--space-xs) !important;
}

.total span {
  color: var(--color-primary);
  font-size: 24px;
  font-weight: 700;
}

.error {
  color: var(--color-error);
  font-size: 13px;
  margin: 0;
}

.ghost {
  background: var(--color-canvas);
  border: 1px solid var(--color-hairline);
  border-radius: var(--radius-sm);
  padding: 10px 20px;
  font-size: 14px;
  cursor: pointer;
}

.primary {
  background: var(--color-primary);
  color: white;
  border: none;
  height: 44px;
  padding: 0 24px;
  border-radius: var(--radius-sm);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}

.primary.big {
  height: 56px;
  padding: 0 48px;
  font-size: 16px;
}

.primary:disabled {
  background: var(--color-primary-disabled);
  cursor: not-allowed;
}

.primary:hover:not(:disabled) {
  background: var(--color-primary-active);
}
</style>
