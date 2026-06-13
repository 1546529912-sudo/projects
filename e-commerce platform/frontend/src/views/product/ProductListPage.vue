<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { listProducts, type ProductCard as Card, type ListParams } from '@/api/product'
import { listCategories, type Category } from '@/api/category'
import ProductCard from '@/components/ProductCard.vue'

const route = useRoute()
const router = useRouter()
const products = ref<Card[]>([])
const total = ref(0)
const loading = ref(true)
const categories = ref<Category[]>([])

const filters = ref<ListParams>({
  keyword: (route.query.keyword as string) || undefined,
  category_id: route.query.category_id ? Number(route.query.category_id) : undefined,
  sort: (route.query.sort as ListParams['sort']) || 'latest',
  order: 'desc',
  page: 1,
  per_page: 12,
})

async function load() {
  loading.value = true
  try {
    const res = await listProducts(filters.value)
    products.value = res.data.items
    total.value = res.data.total
  } finally {
    loading.value = false
  }
}

const currentCategory = computed(() =>
  categories.value.find((c) => c.id === filters.value.category_id),
)

function changeCategory(id: number | undefined) {
  filters.value.category_id = id
  filters.value.page = 1
  syncUrl()
  load()
}

function changeSort(sort: ListParams['sort']) {
  filters.value.sort = sort
  filters.value.order = sort === 'price' ? 'asc' : 'desc'
  syncUrl()
  load()
}

function syncUrl() {
  router.replace({
    query: {
      keyword: filters.value.keyword || undefined,
      category_id: filters.value.category_id?.toString() || undefined,
      sort: filters.value.sort || undefined,
    },
  })
}

onMounted(async () => {
  const [c] = await Promise.all([listCategories(), load()])
  categories.value = c.data
})

watch(() => route.query.keyword, (kw) => {
  filters.value.keyword = (kw as string) || undefined
  filters.value.page = 1
  load()
})
</script>

<template>
  <section class="list-page">
    <aside class="filters">
      <h3>分类</h3>
      <ul>
        <li
          :class="{ active: !filters.category_id }"
          @click="changeCategory(undefined)"
        >全部</li>
        <li
          v-for="c in categories"
          :key="c.id"
          :class="{ active: filters.category_id === c.id }"
          @click="changeCategory(c.id)"
        >{{ c.name }}</li>
      </ul>
    </aside>

    <main class="results">
      <header class="results-head">
        <div class="title">
          <h2>{{ currentCategory?.name || (filters.keyword ? `“${filters.keyword}” 的搜索结果` : '全部商品') }}</h2>
          <span class="count">共 {{ total }} 个商品</span>
        </div>
        <div class="sort">
          <button :class="{ active: filters.sort === 'latest' }" @click="changeSort('latest')">最新</button>
          <button :class="{ active: filters.sort === 'price' }" @click="changeSort('price')">价格</button>
          <button :class="{ active: filters.sort === 'sales' }" @click="changeSort('sales')">热度</button>
        </div>
      </header>

      <div v-if="loading" class="state loading">载入中…</div>
      <div v-else-if="products.length === 0" class="state empty">
        未找到匹配商品，建议调整关键词或筛选条件
      </div>
      <div v-else class="grid">
        <ProductCard
          v-for="p in products"
          :key="p.id"
          :product="p"
        />
      </div>
    </main>
  </section>
</template>

<style scoped>
.list-page {
  max-width: 1280px;
  margin: 0 auto;
  padding: var(--space-xl) var(--space-lg);
  display: grid;
  grid-template-columns: 220px 1fr;
  gap: var(--space-xl);
}

.filters {
  padding: var(--space-base);
}

.filters h3 {
  font-size: 14px;
  font-weight: 600;
  margin: 0 0 var(--space-base);
}

.filters ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.filters li {
  padding: var(--space-sm) var(--space-md);
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: 14px;
  color: var(--color-body);
}

.filters li:hover {
  background: var(--color-surface-soft);
}

.filters li.active {
  background: var(--color-ink);
  color: white;
}

.results-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: var(--space-lg);
  flex-wrap: wrap;
  gap: var(--space-base);
}

.title h2 {
  font-size: 22px;
  font-weight: 500;
  margin: 0;
}

.count {
  font-size: 13px;
  color: var(--color-muted);
  margin-left: var(--space-sm);
}

.sort {
  display: flex;
  gap: var(--space-xs);
}

.sort button {
  background: transparent;
  border: 1px solid var(--color-hairline);
  border-radius: var(--radius-full);
  padding: 6px 14px;
  font-size: 13px;
  cursor: pointer;
  color: var(--color-body);
}

.sort button.active {
  background: var(--color-ink);
  color: white;
  border-color: var(--color-ink);
}

.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-base);
}

.state {
  padding: var(--space-xxl);
  text-align: center;
  color: var(--color-muted);
  background: var(--color-surface-soft);
  border-radius: var(--radius-md);
}

@media (max-width: 1024px) {
  .list-page { grid-template-columns: 1fr; }
  .grid { grid-template-columns: repeat(2, 1fr); }
}
</style>
