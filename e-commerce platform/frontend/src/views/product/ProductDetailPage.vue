<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { productDetail, type ProductDetail, type SkuDetail, type PriceTier } from '@/api/product'
import { useAuthStore } from '@/stores/auth'
import { useCartStore } from '@/stores/cart'
import { useAiStore } from '@/stores/ai'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const cart = useCartStore()
const ai = useAiStore()

const product = ref<ProductDetail | null>(null)
const loading = ref(true)
const notFound = ref(false)
const selectedSkuId = ref<number | null>(null)
const qty = ref(1)
const adding = ref(false)
const buying = ref(false)

const selectedSku = computed<SkuDetail | null>(() => {
  if (!product.value || !selectedSkuId.value) return null
  return product.value.skus.find((s) => s.id === selectedSkuId.value) ?? null
})

/** 找命中当前 qty 的阶梯档 */
const currentTier = computed<PriceTier | null>(() => {
  const sku = selectedSku.value
  if (!sku || sku.price_tiers.length === 0) return null
  return sku.price_tiers.find((t) => {
    return qty.value >= t.min_qty && (t.max_qty === null || qty.value <= t.max_qty)
  }) ?? null
})

const unitPrice = computed(() => {
  if (currentTier.value) return Number(currentTier.value.unit_price)
  return Number(selectedSku.value?.base_price ?? 0)
})

const subtotal = computed(() => (unitPrice.value * qty.value).toFixed(2))

const outOfStock = computed(() => {
  const sku = selectedSku.value
  return !sku || sku.stock_status === 'out_of_stock'
})

async function load() {
  const id = Number(route.params.id)
  if (!id) {
    notFound.value = true
    loading.value = false
    return
  }
  loading.value = true
  try {
    const res = await productDetail(id)
    product.value = res.data
    if (product.value.skus.length > 0) {
      selectedSkuId.value = product.value.skus[0].id
    }
  } catch {
    notFound.value = true
  } finally {
    loading.value = false
  }
}

watch(selectedSkuId, () => {
  // 切 SKU 时把数量重置为 1，避免超过新 SKU 库存
  qty.value = 1
})

onMounted(load)

function clampQty() {
  if (qty.value < 1) qty.value = 1
  const max = selectedSku.value?.stock ?? 9999
  if (qty.value > max) qty.value = max
}

async function addToCart() {
  if (!selectedSku.value) return
  if (!auth.isLoggedIn) {
    router.push({ name: 'login', query: { redirect: route.fullPath } })
    return
  }
  adding.value = true
  try {
    await cart.add(selectedSku.value.id, qty.value)
    alert(`已加入购物车（${qty.value} 件 × ¥${unitPrice.value.toFixed(2)}）`)
  } catch (e: any) {
    alert(e?.response?.data?.message || '加入失败')
  } finally {
    adding.value = false
  }
}

async function buyNow() {
  if (!selectedSku.value) return
  if (!auth.isLoggedIn) {
    router.push({ name: 'login', query: { redirect: route.fullPath } })
    return
  }
  buying.value = true
  try {
    await cart.add(selectedSku.value.id, qty.value)
    for (const it of cart.items) {
      const shouldSelect = it.sku_id === selectedSku.value.id
      if (it.selected !== shouldSelect) {
        await cart.toggleSelected(it.id, shouldSelect)
      }
    }
    router.push({ name: 'checkout' })
  } catch (e: any) {
    alert(e?.response?.data?.message || '操作失败')
  } finally {
    buying.value = false
  }
}

async function openAiQuote() {
  if (!auth.isLoggedIn) {
    router.push({ name: 'login', query: { redirect: route.fullPath } })
    return
  }
  if (!product.value) return
  ai.resetSession()
  await ai.ensureConversation('detail_page', product.value.id, selectedSku.value?.id)
  ai.open()
}

function tierRange(t: PriceTier): string {
  if (t.max_qty === null) return `${t.min_qty} 件以上`
  return `${t.min_qty} - ${t.max_qty} 件`
}

function specsLabel(sku: SkuDetail): string {
  return sku.specs.map((s) => `${s.value}${s.unit ?? ''}`).join(' / ') || sku.sku_code
}
</script>

<template>
  <section v-if="loading" class="state">载入中…</section>
  <section v-else-if="notFound" class="state">
    <p>商品不存在或已下架</p>
    <button @click="router.push('/')">回首页</button>
  </section>
  <section v-else-if="product" class="detail">
    <div class="breadcrumb">
      <RouterLink to="/">首页</RouterLink>
      <span class="sep">›</span>
      <RouterLink v-if="product.category" :to="{ name: 'product-list', query: { category_id: product.category.id } }">
        {{ product.category.name }}
      </RouterLink>
      <span class="sep">›</span>
      <span>{{ product.model }}</span>
    </div>

    <div class="layout">
      <div class="gallery">
        <img v-if="product.main_image_url" :src="product.main_image_url" :alt="product.name" />
        <div v-else class="empty-img">暂无图片</div>
      </div>

      <aside class="purchase">
        <h1>{{ product.name }}</h1>
        <p class="model">型号：<span>{{ product.model }}</span></p>

        <div class="price-row">
          <span class="price">¥{{ unitPrice.toFixed(2) }}</span>
          <span class="unit">/ 件</span>
          <span v-if="currentTier && Number(selectedSku?.base_price) > unitPrice" class="saving">
            阶梯价省 ¥{{ (Number(selectedSku?.base_price) - unitPrice).toFixed(2) }}/件
          </span>
        </div>

        <p v-if="selectedSku" class="stock">
          <template v-if="selectedSku.stock_status === 'in_stock'">
            <span class="dot in"></span>现货 {{ selectedSku.stock }} 件
          </template>
          <template v-else>
            <span class="dot out"></span>暂时缺货
          </template>
        </p>

        <!-- SKU 选择器 -->
        <div v-if="product.skus.length > 1" class="sku-picker">
          <span class="label">规格</span>
          <div class="chips">
            <button
              v-for="sku in product.skus"
              :key="sku.id"
              class="chip"
              :class="{ active: selectedSkuId === sku.id, disabled: sku.stock_status === 'out_of_stock' }"
              @click="selectedSkuId = sku.id"
            >
              {{ specsLabel(sku) }}
              <small v-if="sku.stock_status === 'out_of_stock'">缺货</small>
            </button>
          </div>
        </div>

        <!-- 阶梯价表 -->
        <div v-if="selectedSku && selectedSku.price_tiers.length > 1" class="tier-table">
          <span class="label">阶梯价</span>
          <div class="tier-rows">
            <div
              v-for="t in selectedSku.price_tiers"
              :key="t.min_qty"
              class="tier"
              :class="{ active: currentTier && currentTier.min_qty === t.min_qty }"
            >
              <span>{{ tierRange(t) }}</span>
              <strong>¥{{ Number(t.unit_price).toFixed(2) }}</strong>
            </div>
          </div>
        </div>

        <div class="qty-row">
          <span class="label">购买数量</span>
          <div class="qty">
            <button :disabled="qty <= 1" @click="qty -= 1; clampQty()">−</button>
            <input
              type="number"
              v-model.number="qty"
              :min="1"
              :max="selectedSku?.stock || 9999"
              @change="clampQty"
            />
            <button :disabled="!selectedSku || qty >= selectedSku.stock" @click="qty += 1; clampQty()">+</button>
          </div>
          <span class="subtotal">小计 <strong>¥{{ subtotal }}</strong></span>
        </div>

        <div class="actions">
          <button class="secondary" :disabled="adding || outOfStock" @click="addToCart">
            🛒 {{ adding ? '加入中…' : '加入购物车' }}
          </button>
          <button class="primary" :disabled="buying || outOfStock" @click="buyNow">
            ⚡ {{ buying ? '处理中…' : '立即购买' }}
          </button>
        </div>
        <button class="ai-cta" @click="openAiQuote">
          💬 AI 智能报价（数量大或参数复杂时）
        </button>
      </aside>
    </div>

    <!-- 技术规格表 -->
    <section v-if="selectedSku && selectedSku.specs.length > 0" class="info">
      <h2>技术规格 · {{ selectedSku.sku_code }}</h2>
      <table class="specs">
        <tbody>
          <tr v-for="s in selectedSku.specs" :key="s.key">
            <th>{{ s.key }}</th>
            <td>{{ s.value }} {{ s.unit }}</td>
          </tr>
        </tbody>
      </table>
    </section>

    <section class="info">
      <h2>商品详情</h2>
      <p class="desc">{{ product.description || '暂无详细描述' }}</p>
      <p v-if="product.keywords" class="keywords">
        关键词：
        <span v-for="kw in product.keywords.split(',')" :key="kw" class="tag">{{ kw }}</span>
      </p>
    </section>
  </section>
</template>

<style scoped>
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

.detail {
  max-width: 1200px;
  margin: 0 auto;
  padding: var(--space-lg);
}

.breadcrumb {
  font-size: 13px;
  color: var(--color-muted);
  margin-bottom: var(--space-base);
}
.breadcrumb a { color: var(--color-muted); }
.breadcrumb a:hover { color: var(--color-primary); }
.sep { margin: 0 var(--space-xs); }

.layout {
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  gap: var(--space-xl);
  margin-bottom: var(--space-section);
}

.gallery {
  aspect-ratio: 1 / 1;
  background: var(--color-surface-soft);
  border-radius: var(--radius-md);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.gallery img { width: 100%; height: 100%; object-fit: cover; }
.empty-img { color: var(--color-muted-soft); font-size: 14px; }

.purchase {
  position: sticky;
  top: var(--space-base);
  align-self: start;
  background: var(--color-canvas);
  border: 1px solid var(--color-hairline);
  border-radius: var(--radius-md);
  padding: var(--space-lg);
}

h1 {
  font-size: 22px;
  font-weight: 500;
  margin: 0 0 var(--space-sm);
  line-height: 1.3;
}

.model {
  color: var(--color-muted);
  font-size: 13px;
  margin: 0 0 var(--space-lg);
}

.model span {
  font-family: var(--font-mono);
  color: var(--color-ink);
}

.price-row {
  display: flex;
  align-items: baseline;
  gap: var(--space-xs);
  flex-wrap: wrap;
}

.price {
  color: var(--color-primary);
  font-size: 28px;
  font-weight: 700;
}

.unit { font-size: 13px; color: var(--color-muted); }

.saving {
  font-size: 11px;
  background: var(--color-primary-tint);
  color: var(--color-primary-active);
  padding: 2px 8px;
  border-radius: var(--radius-full);
  margin-left: var(--space-xs);
}

.stock {
  margin: var(--space-base) 0 var(--space-lg);
  font-size: 13px;
  color: var(--color-body);
}

.dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: var(--radius-full);
  margin-right: var(--space-xs);
}
.dot.in { background: var(--color-success); }
.dot.out { background: var(--color-error); }

.sku-picker, .tier-table, .qty-row {
  margin: var(--space-base) 0;
}

.label {
  display: block;
  font-size: 13px;
  color: var(--color-muted);
  margin-bottom: var(--space-xs);
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-xs);
}

.chip {
  background: var(--color-canvas);
  border: 1px solid var(--color-hairline);
  border-radius: var(--radius-sm);
  padding: 8px 14px;
  font-size: 13px;
  color: var(--color-ink);
  cursor: pointer;
  font-family: inherit;
}

.chip:hover { border-color: var(--color-primary); }
.chip.active {
  background: var(--color-primary-tint);
  border-color: var(--color-primary);
  color: var(--color-primary-active);
  font-weight: 600;
}

.chip.disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: var(--color-surface-soft);
}

.chip small {
  margin-left: 6px;
  font-size: 10px;
  color: var(--color-error);
}

.tier-rows {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
  gap: var(--space-xs);
  border: 1px solid var(--color-hairline-soft);
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.tier {
  background: var(--color-canvas);
  padding: var(--space-sm);
  display: flex;
  flex-direction: column;
  font-size: 12px;
  color: var(--color-muted);
  border-right: 1px solid var(--color-hairline-soft);
  text-align: center;
}

.tier:last-child { border-right: none; }

.tier strong {
  display: block;
  margin-top: 4px;
  color: var(--color-ink);
  font-size: 14px;
}

.tier.active {
  background: var(--color-primary);
  color: white;
}

.tier.active strong { color: white; }

.qty-row {
  display: flex;
  align-items: center;
  gap: var(--space-base);
  flex-wrap: wrap;
}

.qty {
  display: inline-flex;
  border: 1px solid var(--color-hairline);
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.qty button {
  width: 36px;
  height: 36px;
  background: var(--color-canvas);
  border: none;
  cursor: pointer;
  font-size: 16px;
}

.qty button:disabled { color: var(--color-muted-soft); cursor: not-allowed; }

.qty input {
  width: 72px;
  height: 36px;
  text-align: center;
  border: none;
  border-left: 1px solid var(--color-hairline);
  border-right: 1px solid var(--color-hairline);
  font-size: 14px;
  outline: none;
}

.subtotal {
  font-size: 13px;
  color: var(--color-muted);
  margin-left: auto;
}

.subtotal strong {
  color: var(--color-primary);
  font-size: 18px;
  margin-left: 4px;
}

.actions {
  display: flex;
  gap: var(--space-sm);
  margin-bottom: var(--space-base);
}

.primary, .secondary, .ai-cta {
  flex: 1;
  height: 48px;
  border-radius: var(--radius-sm);
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
}

.primary {
  background: var(--color-primary);
  color: white;
  border: none;
}
.primary:hover:not(:disabled) { background: var(--color-primary-active); }
.primary:disabled { background: var(--color-primary-disabled); cursor: not-allowed; }

.secondary {
  background: var(--color-canvas);
  color: var(--color-ink);
  border: 1px solid var(--color-ink);
}
.secondary:disabled { opacity: 0.5; cursor: not-allowed; }

.ai-cta {
  width: 100%;
  background: var(--color-canvas);
  color: var(--color-ink);
  border: 1px dashed var(--color-hairline);
  height: 44px;
  font-size: 14px;
}
.ai-cta:hover { background: var(--color-surface-soft); }

.info {
  background: var(--color-canvas);
  border: 1px solid var(--color-hairline);
  border-radius: var(--radius-md);
  padding: var(--space-lg);
  margin-bottom: var(--space-base);
}

.info h2 {
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 var(--space-base);
}

.specs {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.specs th, .specs td {
  padding: var(--space-sm) var(--space-base);
  text-align: left;
  border-bottom: 1px solid var(--color-hairline-soft);
}

.specs th {
  color: var(--color-muted);
  font-weight: 500;
  width: 30%;
  text-transform: capitalize;
}

.desc {
  color: var(--color-body);
  line-height: 1.6;
  margin: 0 0 var(--space-base);
}

.keywords {
  font-size: 13px;
  color: var(--color-muted);
  margin: 0;
}

.tag {
  display: inline-block;
  margin: var(--space-xs);
  background: var(--color-surface-strong);
  padding: 4px 10px;
  border-radius: var(--radius-full);
  font-size: 12px;
}

@media (max-width: 1024px) {
  .layout { grid-template-columns: 1fr; }
  .purchase { position: static; }
}
</style>
