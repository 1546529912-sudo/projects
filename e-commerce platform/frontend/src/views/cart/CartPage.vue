<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useCartStore } from '@/stores/cart'

const cart = useCartStore()
const router = useRouter()

onMounted(() => cart.refresh())

const allSelected = computed(() => {
  const usable = cart.items.filter((i) => !i.invalid && !i.insufficient)
  return usable.length > 0 && usable.every((i) => i.selected)
})

const hasInvalid = computed(() => cart.items.some((i) => i.invalid))

async function changeQty(id: number, qty: number) {
  if (qty < 1) return
  try {
    await cart.updateQty(id, qty)
  } catch (e: any) {
    alert(e?.response?.data?.message || '修改失败')
  }
}

async function remove(id: number) {
  if (!confirm('确认删除该商品？')) return
  await cart.remove(id)
}

async function goCheckout() {
  if (cart.totals.selected_count === 0) {
    alert('请先勾选要结算的商品')
    return
  }
  router.push({ name: 'checkout' })
}
</script>

<template>
  <section class="cart">
    <header>
      <h1>我的购物车</h1>
      <p class="count">{{ cart.totals.item_count }} 件商品</p>
    </header>

    <div v-if="cart.loading" class="state">载入中…</div>
    <div v-else-if="cart.items.length === 0" class="state empty">
      <p>购物车空空如也</p>
      <button class="ghost" @click="router.push('/')">去逛逛</button>
    </div>

    <template v-else>
      <div class="actions-bar" v-if="hasInvalid">
        <span>购物车含失效商品</span>
        <button class="link" @click="cart.clearInvalid">清空失效</button>
      </div>

      <table class="table">
        <thead>
          <tr>
            <th style="width: 50px">
              <input
                type="checkbox"
                :checked="allSelected"
                @change="cart.selectAll(($event.target as HTMLInputElement).checked)"
              />
            </th>
            <th>商品</th>
            <th style="width: 120px">单价</th>
            <th style="width: 140px">数量</th>
            <th style="width: 120px">小计</th>
            <th style="width: 80px">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="i in cart.items" :key="i.id" :class="{ invalid: i.invalid }">
            <td>
              <input
                type="checkbox"
                :checked="i.selected"
                :disabled="i.invalid || i.insufficient"
                @change="cart.toggleSelected(i.id, ($event.target as HTMLInputElement).checked)"
              />
            </td>
            <td class="product">
              <img v-if="i.main_image_url" :src="i.main_image_url" class="thumb" />
              <div class="meta">
                <div class="name">{{ i.product_name }}</div>
                <div class="model">{{ i.product_model }}</div>
                <div v-if="i.invalid" class="warn">⚠ 已下架</div>
                <div v-else-if="i.insufficient" class="warn">⚠ 库存不足（现 {{ i.stock }}）</div>
              </div>
            </td>
            <td>¥{{ i.unit_price }}</td>
            <td>
              <div class="qty">
                <button :disabled="i.invalid || i.qty <= 1" @click="changeQty(i.id, i.qty - 1)">−</button>
                <input type="number" :value="i.qty" min="1" :max="i.stock ?? 9999"
                  @change="changeQty(i.id, Number(($event.target as HTMLInputElement).value))" />
                <button :disabled="i.invalid || (i.stock !== null && i.qty >= i.stock)"
                  @click="changeQty(i.id, i.qty + 1)">+</button>
              </div>
            </td>
            <td class="subtotal">¥{{ i.subtotal }}</td>
            <td><button class="del" @click="remove(i.id)">删除</button></td>
          </tr>
        </tbody>
      </table>

      <footer class="summary">
        <div class="totals">
          <div>已选 <b>{{ cart.totals.selected_count }}</b> 件 · {{ cart.totals.selected_qty }} 件商品</div>
          <div>商品 ¥{{ cart.totals.product_amount }} + 运费 ¥{{ cart.totals.shipping_fee }}</div>
          <div class="grand">合计：<span>¥{{ cart.totals.total_amount }}</span></div>
        </div>
        <button class="primary" :disabled="cart.totals.selected_count === 0" @click="goCheckout">
          去结算（{{ cart.totals.selected_count }}）
        </button>
      </footer>
    </template>
  </section>
</template>

<style scoped>
.cart {
  max-width: 1100px;
  margin: 0 auto;
  padding: var(--space-xl) var(--space-lg);
}

header {
  display: flex;
  align-items: baseline;
  gap: var(--space-base);
  margin-bottom: var(--space-lg);
}

h1 {
  font-size: 22px;
  font-weight: 500;
  margin: 0;
}

.count {
  color: var(--color-muted);
  font-size: 14px;
  margin: 0;
}

.state {
  text-align: center;
  padding: var(--space-section);
  color: var(--color-muted);
  background: var(--color-surface-soft);
  border-radius: var(--radius-md);
}

.state.empty .ghost {
  margin-top: var(--space-base);
  background: transparent;
  border: 1px solid var(--color-hairline);
  border-radius: var(--radius-sm);
  padding: 10px 24px;
  cursor: pointer;
}

.actions-bar {
  display: flex;
  justify-content: space-between;
  background: #fff5e6;
  color: var(--color-warning);
  padding: var(--space-sm) var(--space-base);
  border-radius: var(--radius-sm);
  margin-bottom: var(--space-base);
  font-size: 13px;
}

.actions-bar .link {
  background: transparent;
  border: none;
  color: var(--color-warning);
  cursor: pointer;
  text-decoration: underline;
}

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
  vertical-align: middle;
  font-size: 14px;
}

.table th {
  background: var(--color-surface-soft);
  font-weight: 600;
  font-size: 13px;
}

tr.invalid {
  opacity: 0.55;
}

.product {
  display: flex;
  gap: var(--space-base);
  align-items: center;
}

.thumb {
  width: 64px;
  height: 64px;
  object-fit: cover;
  border-radius: var(--radius-sm);
}

.meta .name {
  font-weight: 500;
  color: var(--color-ink);
}

.meta .model {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--color-muted);
  margin-top: 2px;
}

.warn {
  color: var(--color-error);
  font-size: 12px;
  margin-top: 2px;
}

.qty {
  display: inline-flex;
  align-items: center;
  border: 1px solid var(--color-hairline);
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.qty button {
  width: 32px;
  height: 32px;
  background: var(--color-canvas);
  border: none;
  cursor: pointer;
}

.qty button:disabled {
  color: var(--color-muted-soft);
  cursor: not-allowed;
}

.qty input {
  width: 48px;
  height: 32px;
  text-align: center;
  border: none;
  border-left: 1px solid var(--color-hairline);
  border-right: 1px solid var(--color-hairline);
  font-size: 14px;
  outline: none;
}

.subtotal {
  color: var(--color-primary);
  font-weight: 600;
}

.del {
  background: transparent;
  border: 1px solid var(--color-hairline);
  border-radius: var(--radius-sm);
  padding: 4px 10px;
  font-size: 13px;
  cursor: pointer;
  color: var(--color-muted);
}

.del:hover { color: var(--color-error); border-color: var(--color-error); }

.summary {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: var(--space-lg);
  padding: var(--space-base);
  background: var(--color-canvas);
  border: 1px solid var(--color-hairline);
  border-radius: var(--radius-md);
  position: sticky;
  bottom: 0;
}

.totals {
  font-size: 13px;
  color: var(--color-body);
  line-height: 1.6;
}

.totals .grand {
  font-size: 16px;
  margin-top: var(--space-xs);
}

.totals .grand span {
  color: var(--color-primary);
  font-weight: 700;
  font-size: 22px;
}

.primary {
  background: var(--color-primary);
  color: white;
  border: none;
  height: 56px;
  padding: 0 32px;
  border-radius: var(--radius-sm);
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
}

.primary:disabled {
  background: var(--color-primary-disabled);
  cursor: not-allowed;
}

.primary:not(:disabled):hover {
  background: var(--color-primary-active);
}
</style>
