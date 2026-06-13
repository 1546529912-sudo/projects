<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { recommended, type ProductCard as Card } from '@/api/product'
import { listCategories, type Category } from '@/api/category'
import ProductCard from '@/components/ProductCard.vue'

const router = useRouter()
const categories = ref<Category[]>([])
const products = ref<Card[]>([])
const loading = ref(true)
const keyword = ref('')

onMounted(async () => {
  try {
    const [c, p] = await Promise.all([listCategories(), recommended()])
    categories.value = c.data
    products.value = p.data.items
  } finally {
    loading.value = false
  }
})

function doSearch() {
  if (!keyword.value.trim()) return
  router.push({ name: 'product-list', query: { keyword: keyword.value.trim() } })
}

const ICON_BY_SLUG: Record<string, string> = {
  'carbon-plate': '📐',
  'carbon-tube': '🟫',
  'carbon-cloth': '🟦',
  'glass-fiber': '🔷',
  'aramid': '🟧',
  'prepreg': '🟪',
}
</script>

<template>
  <section class="hero">
    <form class="search-bar" @submit.prevent="doSearch">
      <input
        v-model.trim="keyword"
        placeholder="搜索 型号 / 材料类型 / 规格"
      />
      <button class="search-orb" type="submit" aria-label="搜索">🔍</button>
    </form>
    <h1>发现适合您的复合材料</h1>
  </section>

  <section class="categories">
    <RouterLink
      v-for="cat in categories"
      :key="cat.id"
      :to="{ name: 'product-list', query: { category_id: cat.id } }"
      class="category-card"
    >
      <div class="icon">{{ ICON_BY_SLUG[cat.slug] || '📦' }}</div>
      <div class="name">{{ cat.name }}</div>
    </RouterLink>
  </section>

  <section class="recommended">
    <header class="section-head">
      <h2>热门推荐</h2>
      <RouterLink :to="{ name: 'product-list' }" class="more-link">查看全部 →</RouterLink>
    </header>
    <div v-if="loading" class="state loading">载入中…</div>
    <div v-else-if="products.length === 0" class="state empty">暂无推荐商品</div>
    <div v-else class="grid">
      <ProductCard
        v-for="p in products"
        :key="p.id"
        :product="p"
      />
    </div>
  </section>
</template>

<style scoped>
.hero {
  padding: var(--space-xxl) var(--space-section);
  text-align: center;
}

.search-bar {
  display: inline-flex;
  align-items: center;
  gap: var(--space-base);
  background: var(--color-canvas);
  border: 1px solid var(--color-hairline);
  border-radius: var(--radius-full);
  padding: var(--space-sm) var(--space-base) var(--space-sm) var(--space-lg);
  height: 64px;
  min-width: 600px;
  box-shadow: var(--shadow-hover-float);
}

.search-bar input {
  border: none;
  outline: none;
  font-size: 14px;
  background: transparent;
  flex: 1;
  color: var(--color-ink);
}

.search-orb {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-full);
  background: var(--color-primary);
  color: white;
  border: none;
  cursor: pointer;
  font-size: 18px;
}

.search-orb:hover {
  background: var(--color-primary-active);
}

h1 {
  font-size: 28px;
  font-weight: 700;
  margin-top: var(--space-lg);
  color: var(--color-ink);
}

.categories {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: var(--space-base);
  padding: 0 var(--space-section) var(--space-xxl);
}

.category-card {
  background: var(--color-canvas);
  border: 1px solid var(--color-hairline);
  border-radius: var(--radius-md);
  padding: var(--space-lg);
  text-align: center;
  cursor: pointer;
  transition: box-shadow 150ms ease;
  text-decoration: none;
  color: inherit;
}

.category-card:hover {
  box-shadow: var(--shadow-hover-float);
}

.category-card .icon {
  font-size: 32px;
}

.category-card .name {
  font-size: 16px;
  font-weight: 600;
  margin-top: var(--space-sm);
  color: var(--color-ink);
}

.recommended {
  padding: 0 var(--space-section) var(--space-xxl);
}

.section-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: var(--space-lg);
}

.section-head h2 {
  font-size: 20px;
  font-weight: 600;
  margin: 0;
}

.more-link {
  color: var(--color-muted);
  font-size: 14px;
}

.more-link:hover {
  color: var(--color-primary);
}

.grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-base);
}

.state {
  padding: var(--space-xxl);
  text-align: center;
  color: var(--color-muted);
  background: var(--color-surface-soft);
  border-radius: var(--radius-md);
}

@media (max-width: 1128px) {
  .categories { grid-template-columns: repeat(3, 1fr); padding: 0 var(--space-xl) var(--space-xl); }
  .grid { grid-template-columns: repeat(2, 1fr); }
  .recommended, .hero { padding-left: var(--space-xl); padding-right: var(--space-xl); }
  .search-bar { min-width: 0; width: 100%; }
}
</style>
