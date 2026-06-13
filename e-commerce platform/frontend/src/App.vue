<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { RouterLink, RouterView, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useCartStore } from '@/stores/cart'
import { useAiStore } from '@/stores/ai'
import AiDrawer from '@/components/AiDrawer.vue'

const auth = useAuthStore()
const cart = useCartStore()
const ai = useAiStore()
const router = useRouter()

async function openAi() {
  if (!auth.isLoggedIn) {
    router.push({ name: 'login' })
    return
  }
  await ai.ensureConversation('floating')
  ai.open()
}

onMounted(async () => {
  if (auth.token) {
    await auth.fetchMe()
    if (auth.isLoggedIn) await cart.refresh().catch(() => {})
  }
})

watch(() => auth.isLoggedIn, async (loggedIn) => {
  if (loggedIn) await cart.refresh().catch(() => {})
  else cart.reset()
})

async function doLogout() {
  await auth.logout()
  cart.reset()
  router.push({ name: 'home' })
}
</script>

<template>
  <header class="top-nav">
    <RouterLink to="/" class="logo">中研复材</RouterLink>
    <nav class="nav-links">
      <RouterLink to="/">首页</RouterLink>
      <RouterLink :to="{ name: 'product-list' }">商品</RouterLink>
      <RouterLink to="/health">系统状态</RouterLink>
    </nav>
    <div class="account">
      <template v-if="!auth.isLoggedIn">
        <RouterLink to="/login" class="link-btn">登录</RouterLink>
        <RouterLink to="/register" class="primary-btn">注册</RouterLink>
      </template>
      <template v-else>
        <RouterLink :to="{ name: 'cart' }" class="icon-btn" aria-label="购物车">
          🛒<span v-if="cart.badgeCount > 0" class="badge">{{ cart.badgeCount }}</span>
        </RouterLink>
        <RouterLink :to="{ name: 'order-list' }" class="link-btn">订单</RouterLink>
        <RouterLink to="/profile" class="user-chip">
          {{ auth.user?.name || auth.user?.phone || '我的账号' }}
        </RouterLink>
        <button class="link-btn" @click="doLogout">退出</button>
      </template>
    </div>
  </header>
  <main class="content">
    <RouterView />
  </main>

  <!-- 全局 AI 浮动按钮（仅登录后显示）-->
  <button
    v-if="auth.isLoggedIn && !ai.drawerOpen"
    class="ai-fab"
    @click="openAi"
    aria-label="AI 助手"
  >
    💬<span class="label">AI 助手</span>
  </button>

  <!-- 全局 AI 抽屉 -->
  <AiDrawer />
</template>

<style scoped>
.top-nav {
  height: 80px;
  background: var(--color-canvas);
  border-bottom: 1px solid var(--color-hairline);
  display: flex;
  align-items: center;
  padding: 0 var(--space-xxl);
  gap: var(--space-xl);
}

.logo {
  font-size: 22px;
  font-weight: 700;
  color: var(--color-primary);
}

.nav-links {
  display: flex;
  gap: var(--space-lg);
  flex: 1;
}

.nav-links a {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-muted);
}

.nav-links a.router-link-active {
  color: var(--color-ink);
}

.account {
  display: flex;
  align-items: center;
  gap: var(--space-base);
}

.link-btn {
  background: transparent;
  border: none;
  color: var(--color-ink);
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  padding: 8px 12px;
  font-family: inherit;
}

.primary-btn {
  background: var(--color-primary);
  color: white;
  border-radius: var(--radius-sm);
  padding: 10px 20px;
  font-size: 14px;
  font-weight: 500;
}

.icon-btn {
  position: relative;
  width: 40px;
  height: 40px;
  border-radius: var(--radius-full);
  background: var(--color-surface-strong);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
}

.badge {
  position: absolute;
  top: -4px;
  right: -4px;
  background: var(--color-primary);
  color: white;
  font-size: 11px;
  font-weight: 600;
  min-width: 18px;
  height: 18px;
  border-radius: var(--radius-full);
  padding: 0 5px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.user-chip {
  background: var(--color-surface-strong);
  border-radius: var(--radius-full);
  padding: 8px 16px;
  font-size: 14px;
  color: var(--color-ink);
  font-weight: 500;
}

.content {
  min-height: calc(100vh - 80px);
  background: var(--color-canvas);
}

.ai-fab {
  position: fixed;
  right: var(--space-xl);
  bottom: var(--space-xl);
  height: 56px;
  padding: 0 var(--space-lg);
  border-radius: var(--radius-full);
  background: var(--color-primary);
  color: white;
  border: none;
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  box-shadow: 0 8px 24px rgba(0, 47, 167, 0.35);
  z-index: 80;
  font-family: inherit;
}

.ai-fab:hover { background: var(--color-primary-active); }

.ai-fab .label {
  font-size: 14px;
  font-weight: 500;
}
</style>
