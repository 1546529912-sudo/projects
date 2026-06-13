<script setup lang="ts">
import { RouterLink } from 'vue-router'
import type { ProductCard } from '@/api/product'

defineProps<{ product: ProductCard }>()
</script>

<template>
  <RouterLink :to="`/products/${product.id}`" class="card" :class="{ 'is-out': product.stock_status === 'out_of_stock' }">
    <div class="thumb">
      <img v-if="product.main_image_url" :src="product.main_image_url" :alt="product.name" />
      <span v-else class="placeholder">暂无图片</span>
      <span v-if="product.stock_status === 'out_of_stock'" class="badge out">缺货</span>
    </div>
    <div class="meta">
      <div class="name">{{ product.name }}</div>
      <div class="model">{{ product.model }}</div>
      <div class="price-row">
        <span class="price">
          <small v-if="product.price_from">起</small>¥{{ product.price }}
        </span>
        <span v-if="product.stock_status === 'in_stock'" class="stock">现货 {{ product.stock }}</span>
      </div>
    </div>
  </RouterLink>
</template>

<style scoped>
.card {
  display: block;
  background: var(--color-canvas);
  border: 1px solid var(--color-hairline);
  border-radius: var(--radius-md);
  overflow: hidden;
  color: inherit;
  transition: box-shadow 150ms ease;
}

.card:hover {
  box-shadow: var(--shadow-hover-float);
}

.card.is-out {
  opacity: 0.55;
}

.thumb {
  position: relative;
  aspect-ratio: 1 / 1;
  background: var(--color-surface-soft);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.placeholder {
  color: var(--color-muted-soft);
  font-size: 13px;
}

.badge {
  position: absolute;
  top: var(--space-sm);
  left: var(--space-sm);
  background: rgba(0, 0, 0, 0.7);
  color: white;
  font-size: 11px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: var(--radius-full);
}

.badge.out {
  background: var(--color-error);
}

.meta {
  padding: var(--space-base);
}

.name {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-ink);
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.model {
  font-size: 12px;
  color: var(--color-muted);
  font-family: var(--font-mono);
  margin-top: var(--space-xs);
}

.price-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-top: var(--space-sm);
}

.price {
  color: var(--color-primary);
  font-size: 18px;
  font-weight: 600;
}

.price small {
  font-size: 11px;
  font-weight: 400;
  margin-right: 2px;
  color: var(--color-muted);
}

.stock {
  color: var(--color-success);
  font-size: 12px;
}
</style>
