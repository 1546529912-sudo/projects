<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import {
  adminListProducts,
  adminToggleProduct,
  type AdminProduct,
} from '@/api/product'

const items = ref<AdminProduct[]>([])
const loading = ref(true)
const total = ref(0)
const keyword = ref('')
const error = ref('')

async function load() {
  loading.value = true
  try {
    const res = await adminListProducts({ keyword: keyword.value || undefined })
    items.value = res.data.items
    total.value = res.data.total
  } finally {
    loading.value = false
  }
}

async function toggle(p: AdminProduct) {
  try {
    const res = await adminToggleProduct(p.id)
    p.status = res.data.status as AdminProduct['status']
  } catch (e: any) {
    error.value = e?.response?.data?.message || '切换失败'
  }
}

onMounted(load)
</script>

<template>
  <section class="admin">
    <header class="head">
      <div>
        <h1>商品管理</h1>
        <p class="meta">共 {{ total }} 个商品</p>
      </div>
      <RouterLink :to="{ name: 'admin-product-new' }" class="cta">+ 新建商品</RouterLink>
    </header>

    <div class="toolbar">
      <input
        v-model.trim="keyword"
        placeholder="搜索名称或型号"
        @keyup.enter="load"
      />
      <button @click="load">搜索</button>
    </div>

    <p v-if="error" class="error">{{ error }}</p>

    <div v-if="loading" class="state">载入中…</div>
    <div v-else-if="items.length === 0" class="state">暂无商品，点右上 + 新建商品</div>
    <table v-else class="table">
      <thead>
        <tr>
          <th style="width: 60px">图</th>
          <th>名称 / 型号</th>
          <th>价格</th>
          <th>库存</th>
          <th>浏览</th>
          <th>状态</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="p in items" :key="p.id">
          <td><img v-if="p.main_image_url" :src="p.main_image_url" class="thumb" /></td>
          <td>
            <div class="name">{{ p.name }}</div>
            <div class="model">{{ p.model }}</div>
          </td>
          <td>¥{{ p.base_price }}</td>
          <td>{{ p.stock }}</td>
          <td>{{ p.view_count }}</td>
          <td>
            <span class="badge" :class="p.status">
              {{ p.status === 'active' ? '上架' : (p.status === 'draft' ? '草稿' : '下架') }}
            </span>
          </td>
          <td>
            <RouterLink :to="{ name: 'admin-product-edit', params: { id: p.id } }" class="action edit">编辑</RouterLink>
            <button class="action toggle" @click="toggle(p)">
              {{ p.status === 'active' ? '下架' : '上架' }}
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  </section>
</template>

<style scoped>
.admin {
  max-width: 1200px;
  margin: 0 auto;
  padding: var(--space-xl) var(--space-lg);
}

.head {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: var(--space-lg);
}

h1 {
  font-size: 22px;
  font-weight: 500;
  margin: 0;
}

.meta {
  color: var(--color-muted);
  font-size: 13px;
  margin: var(--space-xs) 0 0;
}

.cta {
  background: var(--color-primary);
  color: white;
  padding: 10px 20px;
  border-radius: var(--radius-sm);
  font-size: 14px;
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
  height: 40px;
  padding: 0 14px;
  border: 1px solid var(--color-hairline);
  border-radius: var(--radius-sm);
  font-size: 14px;
}

.toolbar button {
  height: 40px;
  background: var(--color-ink);
  color: white;
  border: none;
  border-radius: var(--radius-sm);
  padding: 0 20px;
  font-size: 14px;
  cursor: pointer;
}

.error {
  color: var(--color-error);
  margin-bottom: var(--space-base);
  font-size: 13px;
}

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
}

.table th, .table td {
  padding: var(--space-md);
  text-align: left;
  border-bottom: 1px solid var(--color-hairline-soft);
  font-size: 14px;
  vertical-align: middle;
}

.table th {
  background: var(--color-surface-soft);
  font-weight: 600;
}

.thumb {
  width: 48px;
  height: 48px;
  object-fit: cover;
  border-radius: var(--radius-sm);
}

.name {
  font-weight: 500;
  color: var(--color-ink);
}

.model {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--color-muted);
  margin-top: var(--space-xxs);
}

.badge {
  font-size: 11px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: var(--radius-full);
}

.badge.active   { background: #e7f8ee; color: var(--color-success); }
.badge.inactive { background: var(--color-surface-strong); color: var(--color-muted); }
.badge.draft    { background: #fff5e6; color: var(--color-warning); }

.action {
  margin-right: var(--space-xs);
  font-size: 13px;
}

.action.edit {
  color: var(--color-primary);
}

.action.toggle {
  background: transparent;
  border: 1px solid var(--color-hairline);
  border-radius: var(--radius-sm);
  padding: 4px 10px;
  cursor: pointer;
}
</style>
